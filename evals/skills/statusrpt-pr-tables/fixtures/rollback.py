#!/usr/bin/env python3
"""Roll back a reconciliation run.

Two modes, matching the two safety layers the audit trail provides:

  snapshot  — restore the whole DB file from the pre-run copy recorded in
              reconciliation_runs.snapshot_path. Blunt and foolproof: it undoes
              EVERYTHING the run did (and anything after it), by replacing the
              file. Use when a run went broadly wrong.

  events    — reverse just the row-level changes of one run, using each
              reconciliation_events row's old_value/new_value JSON. Surgical:
              other runs' changes are untouched. INSERT events are undone by
              deleting the inserted row; DELETE events by reinserting old_value;
              UPDATE events by restoring old_value's columns. Applied newest-
              event-first within the run.

Usage:
    python3 rollback.py <db> snapshot --run <run_id>
    python3 rollback.py <db> events   --run <run_id> [--dry-run]
"""
import argparse
import json
import shutil
import sqlite3
import sys
from pathlib import Path

TABLE_FOR = {
    "project": "projects",
    "pull_request": "pull_requests",
    "issue": "issues",
    "narrative": "narratives",
    "infrastructure_item": "infrastructure_items",
}


def rollback_snapshot(db_path: Path, run_id: int):
    conn = sqlite3.connect(db_path)
    row = conn.execute(
        "SELECT snapshot_path FROM reconciliation_runs WHERE id=?", (run_id,)
    ).fetchone()
    conn.close()
    if not row or not row[0]:
        print(f"Run {run_id} has no snapshot_path recorded; cannot snapshot-restore.", file=sys.stderr)
        sys.exit(1)
    snap = Path(row[0])
    if not snap.exists():
        print(f"Snapshot file {snap} does not exist.", file=sys.stderr)
        sys.exit(1)
    shutil.copyfile(snap, db_path)
    print(f"Restored {db_path} from snapshot {snap} (run {run_id}).")


def rollback_events(db_path: Path, run_id: int, dry_run: bool):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    events = conn.execute(
        "SELECT * FROM reconciliation_events WHERE run_id=? ORDER BY id DESC", (run_id,)
    ).fetchall()
    if not events:
        print(f"Run {run_id} has no events to reverse.", file=sys.stderr)
        sys.exit(1)

    reversed_count = 0
    try:
        conn.execute("BEGIN")
        for ev in events:
            old = json.loads(ev["old_value"]) if ev["old_value"] else None
            new = json.loads(ev["new_value"]) if ev["new_value"] else None

            # The project_pull_requests join table has no single id; reverse it by
            # its composite key (project_id, pull_request_id) carried in the JSON.
            if ev["entity_type"] == "project_pull_request":
                if old is None and new is not None:
                    stmt = "DELETE FROM project_pull_requests WHERE project_id=? AND pull_request_id=?"
                    params = (new["project_id"], new["pull_request_id"])
                    desc = f"unlink project {new['project_id']}<->pr {new['pull_request_id']} (undo link insert)"
                elif old is not None and new is None:
                    stmt = "INSERT INTO project_pull_requests (project_id, pull_request_id, role) VALUES (?,?,?)"
                    params = (old["project_id"], old["pull_request_id"], old.get("role"))
                    desc = f"relink project {old['project_id']}<->pr {old['pull_request_id']} (undo unlink)"
                else:
                    # a repoint is modeled as unlink(old) + link(new); if logged as one
                    # update, restore the old pairing in place
                    stmt = ("UPDATE project_pull_requests SET pull_request_id=?, role=? "
                            "WHERE project_id=? AND pull_request_id=?")
                    params = (old["pull_request_id"], old.get("role"), new["project_id"], new["pull_request_id"])
                    desc = f"restore link for project {old['project_id']} (undo repoint)"
                print(("  [dry-run] would " if dry_run else "  ") + desc)
                if not dry_run:
                    conn.execute(stmt, params)
                reversed_count += 1
                continue

            table = TABLE_FOR.get(ev["entity_type"])
            if not table:
                print(f"  skip event {ev['id']}: unknown entity_type {ev['entity_type']}", file=sys.stderr)
                continue

            if old is None and new is not None:
                # was an INSERT -> delete the inserted row
                stmt = f"DELETE FROM {table} WHERE id=?"
                params = (ev["entity_id"],)
                desc = f"delete {table}#{ev['entity_id']} (undo insert)"
            elif old is not None and new is None:
                # was a DELETE -> reinsert the full old row
                cols = ",".join(old.keys())
                placeholders = ",".join("?" for _ in old)
                stmt = f"INSERT INTO {table} ({cols}) VALUES ({placeholders})"
                params = tuple(old.values())
                desc = f"reinsert {table}#{ev['entity_id']} (undo delete)"
            elif old is not None and new is not None:
                # was an UPDATE -> restore old column values
                sets = ",".join(f"{k}=?" for k in old.keys())
                stmt = f"UPDATE {table} SET {sets} WHERE id=?"
                params = tuple(old.values()) + (ev["entity_id"],)
                desc = f"restore {table}#{ev['entity_id']} columns {list(old.keys())} (undo update)"
            else:
                print(f"  skip event {ev['id']}: both old_value and new_value NULL", file=sys.stderr)
                continue

            print(("  [dry-run] would " if dry_run else "  ") + desc)
            if not dry_run:
                conn.execute(stmt, params)
            reversed_count += 1

        if dry_run:
            conn.execute("ROLLBACK")
        else:
            conn.execute("COMMIT")
    except Exception as e:
        conn.execute("ROLLBACK")
        conn.close()
        print(f"Rollback FAILED and was aborted (DB unchanged): {e}", file=sys.stderr)
        sys.exit(1)
    conn.close()
    verb = "would reverse" if dry_run else "reversed"
    print(f"{verb} {reversed_count} event(s) for run {run_id}.")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("db", type=Path)
    p.add_argument("mode", choices=["snapshot", "events"])
    p.add_argument("--run", type=int, required=True)
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()
    if args.mode == "snapshot":
        rollback_snapshot(args.db, args.run)
    else:
        rollback_events(args.db, args.run, args.dry_run)

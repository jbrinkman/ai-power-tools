-- ElastiCache Agentic PR/Project tracking database.
--
-- This is the reconciled source of truth that statusrpt-pr-tables maintains and
-- that downstream renderers (markdown tables, a future Chorus push) read from.
-- Replaces the hand-maintained status-report-pr-tables.md as the mutable store;
-- that file's role becomes a generated VIEW, not a database.
--
-- MODEL: a project is a hub connected to several kinds of artifacts, not just
-- "its PR". A single integration commonly has multiple PRs across repos (docs,
-- a cache-backend implementation, a vector-search implementation), one or more
-- issues from either tracker (GitHub or Taskei), and one or more narrative
-- documents (today in Confluence, moving to Chorus). Each artifact kind gets
-- its own table so a project can have any number of each independently.

PRAGMA foreign_keys = ON;

-- One row per tracked project/integration. The bucket (completed/merged/
-- submitted/dropped) is the project's OVERALL state; individual PRs underneath
-- it can be in different states (e.g. docs PR merged, implementation PR still
-- submitted) -- the project's bucket reflects the furthest-along or the
-- team's chosen aggregate, decided by statusrpt-pr-tables' reconciliation logic.
CREATE TABLE projects (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    bucket          TEXT NOT NULL CHECK (bucket IN ('completed', 'merged', 'submitted', 'dropped')),
    is_new          INTEGER NOT NULL DEFAULT 0 CHECK (is_new IN (0, 1)),   -- changed bucket in the current reconciliation run
    dropped_reason  TEXT,            -- required when bucket = 'dropped'
    -- Completion evidence: "released" is a loose umbrella across this portfolio --
    -- a tagged release with a changelog, a doc/website PR with no changelog, a CD
    -- pipeline run on main with no linkable artifact, an npm publish, or a project
    -- whose releases are permanently beta (beta counts as shipped for it). There is
    -- often no release number to point at, so record WHAT KIND of evidence confirmed
    -- it and WHAT WAS ACTUALLY CHECKED, not just a bare ref/url -- this is judgment
    -- work (an LLM may need to check the live website, a pipeline run, or an npm
    -- registry page), so the evidence trail matters as much as the citation.
    completion_evidence_kind TEXT CHECK (completion_evidence_kind IS NULL OR completion_evidence_kind IN
                      ('release-tag', 'pr-merge', 'website-update', 'cd-pipeline', 'npm-publish', 'beta-release', 'other')),
    completion_evidence TEXT,        -- freeform: what was checked and what it showed, e.g.
                                      -- "valkey.io/clients page lists the entry as of Oct 5" or
                                      -- "CD pipeline run #4821 succeeded on main after merge; no further artifact"
    completed_ref   TEXT,            -- the human-facing citation (tag, PR link text, page name) rendered in the report
    completed_url   TEXT,
    comments        TEXT,            -- freeform notes (e.g. "Merged 2026-09-27")
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Durable per-project conventions that override the default reconciliation
-- judgment -- e.g. "this project's releases are permanently beta; treat a beta
-- tag as shipped, don't flag it as unconfirmed every week." Recorded once,
-- read by every future reconciliation run, same principle as a team's
-- REVIEW-NOTES.md: a known exception should be looked up, not re-derived.
CREATE TABLE project_conventions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    convention      TEXT NOT NULL,   -- e.g. "always-beta", "no-changelog", "release-is-website-update"
    note            TEXT,            -- human-readable explanation
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- One row per DISTINCT PR. A PR is NOT owned by a single project -- the real
-- data has PRs backing multiple project rows (e.g. one PR implementing both
-- FT.ALIASADD and FT.ALIASDEL as separate tracked features) alongside projects
-- that span multiple PRs (docs + implementation + a specific feature). So the
-- project<->PR relationship is many-to-many, via project_pull_requests below.
CREATE TABLE pull_requests (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    owner           TEXT NOT NULL,                -- github owner, e.g. "valkey-io"
    repo            TEXT NOT NULL,                 -- github repo, e.g. "valkey-search"
    number          INTEGER NOT NULL,
    url             TEXT NOT NULL,
    state           TEXT NOT NULL CHECK (state IN ('open', 'closed')),
    merged          INTEGER NOT NULL DEFAULT 0 CHECK (merged IN (0, 1)),
    merged_at       TEXT,
    closed_at       TEXT,
    -- Judgment fields: WHY a closed-not-merged PR ended the way it did, and what
    -- replaces it, if anything. Derived from reading PR comments, not something
    -- gh api returns directly.
    close_reason    TEXT CHECK (close_reason IS NULL OR close_reason IN
                      ('merged-elsewhere', 'superseded', 'rejected', 'ambiguous')),
    close_evidence  TEXT,            -- quoted/summarized comment that supports close_reason
    successor_owner TEXT,
    successor_repo  TEXT,
    successor_number INTEGER,
    -- Release confirmation for a merged PR: the confirmed-including release, found
    -- by matching the PR/issue number or title against a release's own notes --
    -- never just "the latest release after the merge date".
    release_tag     TEXT,
    release_url     TEXT,
    release_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (release_confirmed IN (0, 1)),
    release_evidence TEXT,           -- the matched excerpt from the release body
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE (owner, repo, number)
);

-- Many-to-many join: which project(s) a PR backs, and what role it plays for
-- each one (e.g. "documentation", "vector-search", "cache-backend" -- or NULL
-- when a project has just the one PR and the distinction doesn't matter).
-- A single PR can carry a different role per project it backs (PR #1184 is
-- "FT.ALIASADD" for one project row and "FT.ALIASDEL" for another).
CREATE TABLE project_pull_requests (
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    pull_request_id INTEGER NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    role            TEXT,
    PRIMARY KEY (project_id, pull_request_id)
);

-- One row per issue tied to a project, from either tracker. A project can cite
-- a GitHub issue (the upstream feature request/bug it's addressing) and/or a
-- Taskei story (the team's own internal tracking) -- often both, independently.
CREATE TABLE issues (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tracker         TEXT NOT NULL CHECK (tracker IN ('github', 'taskei')),
    -- GitHub: owner/repo/number identify it (number alone isn't unique cross-repo).
    -- Taskei: external_id holds the short id (e.g. "IMPEA-205"); owner/repo/number NULL.
    owner           TEXT,
    repo            TEXT,
    number          INTEGER,
    external_id     TEXT,            -- Taskei short id, e.g. "IMPEA-205"
    url             TEXT NOT NULL,
    title           TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    CHECK (
        (tracker = 'github' AND owner IS NOT NULL AND repo IS NOT NULL AND number IS NOT NULL)
        OR (tracker = 'taskei' AND external_id IS NOT NULL)
    )
);

-- One row per narrative document tied to a project. `source` is DATA, not
-- schema, specifically so the Confluence -> Chorus migration (already underway
-- per the team) needs no schema change -- a narrative just gets a new `source`
-- and `doc_id`/`url` when it moves, or a project can have one of each during
-- the transition.
CREATE TABLE narratives (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source          TEXT NOT NULL CHECK (source IN ('confluence', 'chorus')),
    doc_id          TEXT,            -- Chorus doc_id, or a Confluence page id
    url             TEXT NOT NULL,
    title           TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Infrastructure (Terraform provider) tracking is a parallel, separate bucket
-- shaped like a single issue+PR pair with a status label (not the four-bucket
-- project model), and rows are REMOVED a week after they resolve rather than
-- archived. Kept as its own table since its lifecycle genuinely differs, but
-- its issue/PR columns deliberately mirror `issues`/`pull_requests` shape.
CREATE TABLE infrastructure_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_number    INTEGER,
    issue_url       TEXT,
    description     TEXT NOT NULL,
    owner           TEXT NOT NULL DEFAULT 'hashicorp',
    repo            TEXT NOT NULL DEFAULT 'terraform-provider-aws',
    pr_number       INTEGER,
    pr_url          TEXT,
    status_label    TEXT NOT NULL,   -- e.g. "Awaiting Merge", "Merged", "Closed", "Investigating ..."
    status_class    TEXT NOT NULL DEFAULT 'green' CHECK (status_class IN
                      ('green', 'red', 'yellow', 'gray', 'orange', 'paused', 'pending')),
    is_new          INTEGER NOT NULL DEFAULT 0 CHECK (is_new IN (0, 1)),
    resolved_at_run TEXT,            -- the reconciliation run (date) at which this resolved; NULL while unresolved
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Audit trail: every reconciliation run and what it changed. Answers "why did
-- this project move buckets" later, and feeds the Stage-4 audit-trail
-- requirement for this unit. `snapshot_path` records the pre-run copy of the
-- whole DB file taken before the run mutates anything -- the blunt, foolproof
-- rollback floor (restore the file). Per-event old_value/new_value add the
-- precision layer: surgically reverse one change without reverting the run.
CREATE TABLE reconciliation_runs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    run_date        TEXT NOT NULL,   -- the report date this run was for, YYYY-MM-DD
    started_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    finished_at     TEXT,
    snapshot_path   TEXT,            -- path to the pre-run DB file copy (rollback floor)
    source_summary  TEXT             -- freeform note on what sources were consulted (gh/confluence)
);

CREATE TABLE reconciliation_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id          INTEGER NOT NULL REFERENCES reconciliation_runs(id) ON DELETE CASCADE,
    entity_type     TEXT NOT NULL CHECK (entity_type IN
                      ('project', 'pull_request', 'issue', 'narrative',
                       'infrastructure_item', 'project_pull_request')),
    -- entity_id is the row's integer id for tables that have one. The
    -- project_pull_requests JOIN table has no single id, so for a
    -- 'project_pull_request' event entity_id is 0 and the link's full identity
    -- (project_id, pull_request_id, role) lives in old_value/new_value instead.
    entity_id       INTEGER NOT NULL,
    action          TEXT NOT NULL,   -- e.g. "moved_to_merged", "added", "relabeled", "removed", "link_updated"
    -- old_value/new_value make an event mechanically reversible: a JSON object of
    -- the changed columns' prior and resulting values. For an INSERT, old_value is
    -- NULL; for a DELETE, new_value is NULL and old_value holds the ENTIRE deleted
    -- row (so a soft-deleted row can be reinserted). For an UPDATE, both carry only
    -- the columns that changed. This is structured data for a rollback to parse,
    -- distinct from `detail`, which is the human-readable why.
    old_value       TEXT,            -- JSON of prior column values (NULL on insert)
    new_value       TEXT,            -- JSON of resulting column values (NULL on delete)
    detail          TEXT,            -- freeform description of what changed and why
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_pull_requests_project ON project_pull_requests(project_id);
CREATE INDEX idx_pull_requests_pr ON project_pull_requests(pull_request_id);
CREATE INDEX idx_issues_project ON issues(project_id);
CREATE INDEX idx_narratives_project ON narratives(project_id);
CREATE INDEX idx_projects_bucket ON projects(bucket);
CREATE INDEX idx_project_conventions ON project_conventions(project_id);
CREATE INDEX idx_infrastructure_pr ON infrastructure_items(pr_number);
CREATE INDEX idx_reconciliation_events_run ON reconciliation_events(run_id);

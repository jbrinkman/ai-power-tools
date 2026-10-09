---
name: verify-ci-checks
description: Before pushing a branch, discover whatever CI build checks the project enforces (for example formatting, linting, type-checking, building, or testing — but the actual set is project-specific and open-ended), run them locally, and block the push until every check passes. Use as a pre-push quality gate from any skill that writes code and then pushes — e.g. pr-comment-resolver. This is a LOCAL gate run before `git push`; it does not poll GitHub's CI status after the push.
---

# Verify CI Checks (pre-push gate)

Reusable pre-push gate for skills that write code. It answers one question:
**"Would the project's CI build checks pass right now?"** — and it answers it
*locally, before* `git push`, so a change that CI would reject never leaves the
machine.

This skill is intended to be invoked by name from a parent skill (for example
`pr-comment-resolver` calls it after committing a fix and before pushing). It
can also be run on its own: "run the CI checks locally."

Scope boundary: this is a **local** gate. It discovers the commands CI *would*
run and runs them on the working tree. It deliberately does **not** poll
`gh pr checks` or GitHub's status API after a push — confirming the remote CI
run is a separate concern and out of scope here.

## Inputs

- The working directory is a clone of the repository, on the branch about to be
  pushed, with the change already committed (the caller handles commit).
- Optionally, a pre-discovered command list (see Step 1 caching) — a caller that
  already knows the project's checks may pass them in and skip discovery.

## Step 1: Discover the project's checks

Identify whatever quality commands the project runs in CI — the set is
project-specific and open-ended, so discover it from the project's own config
rather than assuming a fixed list — then map each to a locally runnable command.
Common categories are formatting, linting/static analysis, type-checking,
building, and testing, but a project may enforce others (security scans,
dependency/license audits, codegen or schema drift checks, doc builds,
coverage thresholds, migration checks, and so on). Treat every quality step CI
runs as a check to reproduce, not just the familiar categories. Prefer the
project's own build-tool wrappers (`task lint`, `make test`, `npm run lint`)
over raw tool invocations, so local results match what CI and the user see.

1. **Read CI config** for the quality steps CI enforces (these are the checks
   that gate a merge, so they are the ones to reproduce):
   - `.github/workflows/*.yml`, `.github/workflows/*.yaml`
   - `.gitlab-ci.yml`
   - `Jenkinsfile`
   - `.circleci/config.yml`
   - Azure Pipelines `azure-pipelines.yml`
2. **Read build-tool config** to find the local wrapper for each CI step:
   - `Taskfile.yml` (task names), `Makefile` (targets)
   - `package.json` (`scripts`), `pnpm`/`yarn` equivalents
   - `pyproject.toml` / `tox.ini` / `noxfile.py`
   - `go.mod` + a `Taskfile`/`Makefile` for Go projects
   - `Cargo.toml`, `build.gradle`, `pom.xml`, etc.
3. **Extract the checks.** Capture *every* quality step CI enforces, not only
   the ones that fall into a familiar bucket. Classify what you find so it can
   run in the cheap-to-expensive order below; typical categories include (but
   are not limited to):
   - formatting (check/verify mode, e.g. `gofmt -l`, `prettier --check`)
   - linting / static analysis / `go vet`
   - type checking
   - build / compile
   - tests (unit first; integration only if CI runs them pre-merge)
   - anything else the project gates on — security/vulnerability scans,
     dependency or license audits, codegen/schema-drift or sync checks,
     coverage thresholds, doc builds, etc.
   If a CI step does not fit a category, keep it anyway and run it; the goal is
   to reproduce what CI enforces, whatever that happens to be.
4. **Caching.** If a parent skill or the project already has a discovery cache
   (Kairon writes one to `.kairon/artifacts/qa-tools.md`), reuse it. Treat a
   cache as stale and re-discover if it is missing, older than 24h, or any CI
   config file changed since it was written. A caller that supplies the command
   list inline lets you skip this step entirely.

If you cannot find any checks (no CI config and no build-tool quality tasks),
say so explicitly and report the gate as **not applicable** rather than silently
passing — the caller decides whether to push without a gate.

## Step 2: Run the checks locally, cheapest first

Run the checks discovered in Step 1 ordered cheapest/fastest first, so a quick
failure surfaces before an expensive one. A reasonable default ordering is
static/near-instant checks (formatting, lint, type-check) → build/compile →
tests → longer-running checks (integration suites, scans, audits), but order by
the actual cost of whatever was discovered rather than forcing the discovered
set into these specific slots. Stop to report (not necessarily to abort — see
below) on the first failure.

Run every command from the repository root (or the path CI uses). Capture each
command's exit status and a bounded tail of its output. Honor any
project-specific caveats the caller passes through — for example, Kairon's eval
suite is run **without** `-race` locally because of a known workspace-builder
`maintenance.lock` data race; respect such a documented exception rather than
"fixing" it here.

By default run **all** checks even after one fails, so the report lists every
failing check in one pass rather than making the caller re-run the gate once per
failure. (A caller may request fail-fast if a later check cannot run until an
earlier one passes — e.g. tests need a successful build.)

## Step 3: Report and gate

Produce a compact per-check result and a single overall verdict. One row per
check *actually discovered and run* — the rows below are an illustrative Go
project, not a required set:

```
CI checks (local): FAIL
  ✓ format   gofmt -l .                 (0.3s)
  ✓ vet      go vet ./...               (2.1s)
  ✗ lint     task lint                  (exit 1)
      <bounded tail of the failing output>
  ✓ build    go build ./...             (4.8s)
  ✗ test     go test ./...              (exit 1)
      <bounded tail>
```

The gate contract:

- **All checks pass → gate PASS.** The caller may `git push`.
- **Any check fails → gate FAIL.** The caller MUST NOT push. The failing
  check(s) and their output are the actionable result; fixing them is the
  caller's job (this skill reports, it does not fix).
- **No checks discovered → NOT APPLICABLE.** Report it; the caller decides.

Return the verdict (PASS / FAIL / NOT APPLICABLE) and the per-check table so the
calling skill can branch on it.

## Step 4: On FAIL — fix, re-commit, re-gate (caller's loop)

When invoked from a code-writing skill, a FAIL means the just-made change is not
push-ready. The caller should:

1. Fix the failing check(s).
2. Amend or add to the relevant commit (per the caller's commit conventions).
3. Re-run this gate.
4. Repeat until the gate is PASS — only then push.

Keep this loop bounded: if the same check keeps failing after a few focused
attempts, stop and surface the failure to the user rather than thrashing.

## Exit criteria

- The project's CI checks were discovered (or a reason given that none exist).
- Each discovered check was run locally and its pass/fail recorded.
- A single overall verdict (PASS / FAIL / NOT APPLICABLE) was returned with the
  per-check breakdown.
- On PASS the caller is cleared to push; on FAIL the push is blocked and the
  failing checks are reported.

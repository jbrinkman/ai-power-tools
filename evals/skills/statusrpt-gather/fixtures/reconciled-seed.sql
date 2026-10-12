-- SAMPLE / SYNTHETIC reconciled DB state for statusrpt-gather evals.
-- This represents the DB AFTER statusrpt-pr-tables has already run (gather
-- reads an already-reconciled DB; it does not drive reconciliation itself).
-- Deliberately small and already-settled -- no "merged, needs confirmation"
-- ambiguity here, because that judgment belongs to pr-tables, not gather.

-- Completed this run (carries forward as source material for continuity, not
-- for "this week's progress" -- gather must not treat old completions as new).
INSERT INTO projects (id, name, bucket, completion_evidence_kind, completed_ref, completed_url)
  VALUES (1, 'Sample Vector Adapter', 'completed', 'release-tag', 'v1.0.0', 'https://github.com/sample-org/sample-adapter/releases/tag/v1.0.0');

-- Completed THIS run (is_new) -- this is the kind of row that belongs in
-- "changes this week".
INSERT INTO projects (id, name, bucket, is_new, completion_evidence_kind, completed_ref, completed_url)
  VALUES (2, 'Sample Framework Adapter', 'completed', 1, 'release-tag', 'v2.1.0', 'https://github.com/sample-org/sample-framework/releases/tag/v2.1.0');
INSERT INTO pull_requests (id, owner, repo, number, url, state, merged, merged_at, release_tag, release_confirmed)
  VALUES (1, 'sample-org', 'sample-framework', 30, 'https://github.com/sample-org/sample-framework/pull/30', 'closed', 1, '2099-01-08T10:00:00Z', 'v2.1.0', 1);
INSERT INTO project_pull_requests (project_id, pull_request_id) VALUES (2, 1);

-- Still submitted, unchanged this run.
INSERT INTO projects (id, name, bucket) VALUES (3, 'Sample Multi-Part Feature', 'submitted');
INSERT INTO pull_requests (id, owner, repo, number, url, state, merged)
  VALUES (2, 'sample-org', 'multi-part', 10, 'https://github.com/sample-org/multi-part/pull/10', 'open', 0);
INSERT INTO project_pull_requests (project_id, pull_request_id) VALUES (3, 2);

-- Dropped THIS run.
INSERT INTO projects (id, name, bucket, is_new, dropped_reason)
  VALUES (4, 'Sample Session Store', 'dropped', 1, 'Maintainers closed it as not aligned with project direction.');

-- Infrastructure: one newly-merged (is_new, part of this week's changes), one unchanged.
INSERT INTO infrastructure_items (id, issue_number, description, pr_number, pr_url, status_label, status_class, is_new)
  VALUES (1, 120, 'sample_user dual-password support', 121, 'https://github.com/sample-org/tf-provider/pull/121', 'Merged', 'green', 1);
INSERT INTO infrastructure_items (id, issue_number, description, pr_number, pr_url, status_label, status_class)
  VALUES (2, 100, 'sample_cache_param_group name_prefix', 101, 'https://github.com/sample-org/tf-provider/pull/101', 'Awaiting Merge', 'green');

-- The reconciliation run + events this week's changes are drawn from.
INSERT INTO reconciliation_runs (id, run_date, started_at, finished_at, source_summary)
  VALUES (1, '2099-01-12', '2099-01-12T08:00:00Z', '2099-01-12T08:05:00Z', 'gh api + confluence tracker');
INSERT INTO reconciliation_events (run_id, entity_type, entity_id, action, detail)
  VALUES (1, 'project', 2, 'moved_to_completed', 'Sample Framework Adapter merged and released in v2.1.0.');
INSERT INTO reconciliation_events (run_id, entity_type, entity_id, action, detail)
  VALUES (1, 'project', 4, 'moved_to_dropped', 'Sample Session Store rejected by maintainers.');
INSERT INTO reconciliation_events (run_id, entity_type, entity_id, action, detail)
  VALUES (1, 'infrastructure_item', 1, 'relabeled', 'tf-provider PR 121 merged; relabeled Merged.');

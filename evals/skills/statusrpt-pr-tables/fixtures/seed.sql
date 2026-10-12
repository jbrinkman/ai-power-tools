-- SAMPLE / SYNTHETIC seed state for statusrpt-pr-tables evals.
-- Loaded on top of schema.sql into a fresh DB before each eval run. All data is
-- fabricated. Each project/PR is positioned so the reconciliation (against the
-- mocked gh/confluence fixtures) must take a specific, assertable action.
--
-- Starting buckets reflect LAST week's reconciled state; the mocks describe what
-- changed since, and the skill must move rows + write audit events accordingly.

-- P1: submitted PR that merged + has a confirming release -> expect move to 'completed'.
INSERT INTO projects (id, name, bucket) VALUES (1, 'Sample Framework Adapter', 'submitted');
INSERT INTO pull_requests (id, owner, repo, number, url, state, merged)
  VALUES (1, 'sample-org', 'sample-framework', 30, 'https://github.com/sample-org/sample-framework/pull/30', 'open', 0);
INSERT INTO project_pull_requests (project_id, pull_request_id) VALUES (1, 1);

-- P2: submitted PR closed & superseded by an open successor -> stay 'submitted', repoint link to #41.
INSERT INTO projects (id, name, bucket) VALUES (2, 'Demo CLI', 'submitted');
INSERT INTO pull_requests (id, owner, repo, number, url, state, merged)
  VALUES (2, 'sample-org', 'demo-cli', 40, 'https://github.com/sample-org/demo-cli/pull/40', 'open', 0);
INSERT INTO project_pull_requests (project_id, pull_request_id) VALUES (2, 2);

-- P3: submitted PR closed & maintainer-rejected -> move to 'dropped' with a reason.
INSERT INTO projects (id, name, bucket) VALUES (3, 'Sample Session Store', 'submitted');
INSERT INTO pull_requests (id, owner, repo, number, url, state, merged)
  VALUES (3, 'sample-org', 'sample-session', 50, 'https://github.com/sample-org/sample-session/pull/50', 'open', 0);
INSERT INTO project_pull_requests (project_id, pull_request_id) VALUES (3, 3);

-- P4: merged PR, release exists but does NOT name the PR -> stay 'merged', NOT promoted.
INSERT INTO projects (id, name, bucket) VALUES (4, 'Sample Aggregate Func', 'merged');
INSERT INTO pull_requests (id, owner, repo, number, url, state, merged, merged_at)
  VALUES (4, 'sample-org', 'sample-search', 20, 'https://github.com/sample-org/sample-search/pull/20', 'closed', 1, '2098-12-20T00:00:00Z');
INSERT INTO project_pull_requests (project_id, pull_request_id) VALUES (4, 4);

-- P5: merged PR, NO release (website-update project). The mock says the website now
--     shows the content -> move to 'completed' with completion_evidence_kind='website-update'.
INSERT INTO projects (id, name, bucket) VALUES (5, 'Sample Website Page', 'merged');
INSERT INTO pull_requests (id, owner, repo, number, url, state, merged, merged_at)
  VALUES (5, 'sample-org', 'sample-site', 60, 'https://github.com/sample-org/sample-site/pull/60', 'closed', 1, '2099-01-03T00:00:00Z');
INSERT INTO project_pull_requests (project_id, pull_request_id) VALUES (5, 5);

-- P6: project with the always-beta convention. Only a beta release exists. The
--     convention says a beta tag counts as shipped -> move to 'completed'
--     (beta-release), NOT flagged as unconfirmed.
INSERT INTO projects (id, name, bucket) VALUES (6, 'Sample Beta Project', 'merged');
INSERT INTO pull_requests (id, owner, repo, number, url, state, merged, merged_at)
  VALUES (6, 'sample-org', 'sample-beta', 70, 'https://github.com/sample-org/sample-beta/pull/70', 'closed', 1, '2099-01-04T00:00:00Z');
INSERT INTO project_pull_requests (project_id, pull_request_id) VALUES (6, 6);
INSERT INTO project_conventions (project_id, convention, note)
  VALUES (6, 'always-beta', 'This project only ever ships beta releases; a beta tag counts as shipped.');

-- Infra I1: still open -> unchanged.
INSERT INTO infrastructure_items (id, issue_number, description, pr_number, pr_url, status_label, status_class)
  VALUES (1, 100, 'sample_cache_param_group name_prefix', 101, 'https://github.com/sample-org/tf-provider/pull/101', 'Awaiting Merge', 'green');

-- Infra I2: already Merged in a PRIOR week (plain green, no is_new) -> remove this week.
INSERT INTO infrastructure_items (id, issue_number, description, pr_number, pr_url, status_label, status_class, is_new)
  VALUES (2, 110, 'sample_replication_group tagging race', 111, 'https://github.com/sample-org/tf-provider/pull/111', 'Merged', 'green', 0);

-- Infra I3: open now, mock says it merged this week -> relabel Merged, set is_new, KEEP.
INSERT INTO infrastructure_items (id, issue_number, description, pr_number, pr_url, status_label, status_class)
  VALUES (3, 120, 'sample_user dual-password support', 121, 'https://github.com/sample-org/tf-provider/pull/121', 'Awaiting Merge', 'green');

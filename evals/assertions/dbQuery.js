// Custom promptfoo assertion: run a SQL query against the reconciled SQLite DB
// that statusrpt-pr-tables produced, and compare the result to an expected value.
//
// The output of this skill is DATABASE STATE, not text, so text-matching asserts
// cannot judge it. Each test points at the per-run DB (config.db, defaulting to
// the path the test harness seeds) and supplies a `query` plus an `expected`
// scalar (first column of the first row, stringified). Use it to assert a row
// moved buckets, an audit event was written, a link was repointed, etc.
//
// config:
//   db:       path to the DB file (relative to evals/), default from PRTABLES_DB env
//   query:    a single SQL query returning one scalar in its first column
//   expected: the expected value (string/number compared stringwise)
//   label:    optional human label for the reason line

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = (output, context) => {
  const cfg = (context && context.config) || {};
  const query = cfg.query;
  const expected = cfg.expected;
  const label = cfg.label || query;
  const dbPath = cfg.db || process.env.PRTABLES_DB || 'skills/statusrpt-pr-tables/fixtures/run.db';

  if (!query || expected === undefined) {
    return { pass: false, score: 0, reason: 'dbQuery assertion requires config.query and config.expected' };
  }
  const abs = path.resolve(dbPath);
  if (!fs.existsSync(abs)) {
    return { pass: false, score: 0, reason: `dbQuery: no DB at ${abs} (did the skill write it?)` };
  }

  let actual;
  try {
    actual = execFileSync('sqlite3', [abs, query], { encoding: 'utf8' }).trim();
  } catch (e) {
    return { pass: false, score: 0, reason: `dbQuery: SQL error running [${query}]: ${(e.stderr || e.message || '').toString().slice(0, 300)}` };
  }

  const pass = actual === String(expected);
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass
      ? `dbQuery OK — ${label} => ${actual}`
      : `dbQuery FAIL — ${label}: expected "${expected}", got "${actual}"`,
  };
};

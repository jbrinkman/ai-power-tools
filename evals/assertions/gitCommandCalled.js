const fs = require('fs');
const path = require('path');

const DEFAULT_LOG_FILE =
  process.env.GH_MOCK_LOG_FILE ||
  path.resolve(__dirname, '../tmp/promptfoo-gh-mock.log');

// Assert that the mock git log contains an expected command, or that a list of
// expected commands appeared IN ORDER (not necessarily contiguous).
//
// config:
//   expectedCommand: "checkout -b"            -> single substring match
//   expectedSequence: ["checkout main",       -> each must appear, in this
//                      "checkout -b",            relative order, among the
//                      "add", "commit", "push"]  logged `git-args:` lines
//   mustNotContain: "push --force"            -> fail if this appears
module.exports = (output, context) => {
  const cfg = context?.config || {};
  const { expectedCommand, expectedSequence, mustNotContain } = cfg;

  // Per-test isolated log file (set via the test's `logFile` var) takes
  // priority over the shared default — concurrent test cases must not read
  // or write each other's command history. A relative logFile resolves
  // against this assertions dir's parent (evals/), the same anchor the mock
  // scripts use, not process.cwd().
  const rawLogFile = context?.vars?.logFile;
  const LOG_FILE = rawLogFile
    ? path.isAbsolute(rawLogFile)
      ? rawLogFile
      : path.resolve(__dirname, '..', rawLogFile)
    : DEFAULT_LOG_FILE;

  if (!expectedCommand && !expectedSequence && !mustNotContain) {
    return {
      pass: false,
      score: 0,
      reason:
        'gitCommandCalled: configure expectedCommand, expectedSequence, or mustNotContain',
    };
  }

  let log = '';
  let attempts = 0;
  while (attempts < 3) {
    try {
      log = fs.readFileSync(LOG_FILE, 'utf8');
      break;
    } catch (e) {
      attempts++;
      if (attempts < 3) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
      }
    }
  }

  if (log === '') {
    return { pass: false, score: 0, reason: `Could not read mock git log at ${LOG_FILE}` };
  }

  // Only the git mock's lines, so a `gh` arg can't satisfy a git check.
  const gitLines = log
    .split('\n')
    .filter((l) => l.startsWith('git-args:'))
    .map((l) => l.slice('git-args:'.length).trim());

  if (mustNotContain) {
    const hit = gitLines.find((l) => l.includes(mustNotContain));
    if (hit) {
      return { pass: false, score: 0, reason: `Forbidden git command appeared: "${mustNotContain}" in "${hit}"` };
    }
  }

  if (expectedCommand) {
    const found = gitLines.some((l) => l.includes(expectedCommand));
    return {
      pass: found,
      score: found ? 1 : 0,
      reason: found
        ? `git log contains: ${expectedCommand}`
        : `git log missing: ${expectedCommand}. Saw: ${gitLines.join(' | ') || '(none)'}`,
    };
  }

  if (expectedSequence) {
    let idx = 0;
    for (const line of gitLines) {
      if (idx < expectedSequence.length && line.includes(expectedSequence[idx])) {
        idx++;
      }
    }
    const ok = idx === expectedSequence.length;
    return {
      pass: ok,
      score: ok ? 1 : 0,
      reason: ok
        ? `git commands appeared in order: ${expectedSequence.join(' -> ')}`
        : `git sequence broke at "${expectedSequence[idx]}" (matched ${idx}/${expectedSequence.length}). Saw: ${gitLines.join(' | ') || '(none)'}`,
    };
  }

  // Only mustNotContain was configured and it passed.
  return { pass: true, score: 1, reason: `No forbidden git command "${mustNotContain}" found` };
};

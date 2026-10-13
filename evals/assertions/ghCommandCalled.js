const fs = require('fs');
const path = require('path');

const DEFAULT_LOG_FILE = process.env.GH_MOCK_LOG_FILE || path.resolve(__dirname, '../tmp/promptfoo-gh-mock.log');

module.exports = (output, context) => {
  const cfg = context?.config || {};
  const expectedCommand = cfg.expectedCommand || context?.vars?.expectedCommand;
  const mustNotContain = cfg.mustNotContain;

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

  if (!expectedCommand && !mustNotContain) {
    return {
      pass: false,
      score: 0,
      reason: 'ghCommandCalled: configure expectedCommand or mustNotContain',
    };
  }

  let log = '';
  let attempts = 0;
  while (attempts < 3) {
    try {
      log = fs.readFileSync(LOG_FILE, 'utf8');
      if (expectedCommand && log.includes(expectedCommand)) {
        break;
      }
      if (!expectedCommand) {
        break;
      }
    } catch (e) {
      // Log may not exist yet; retry.
    }
    attempts++;
    if (attempts < 3) {
      // Wait briefly for concurrent writes to complete.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }

  if (log === '') {
    return {
      pass: false,
      score: 0,
      reason: `Could not read mock gh log at ${LOG_FILE}`,
    };
  }

  if (mustNotContain) {
    const hit = log.includes(mustNotContain);
    if (hit) {
      return {
        pass: false,
        score: 0,
        reason: `Forbidden gh command appeared: "${mustNotContain}"`,
      };
    }
    if (!expectedCommand) {
      return {
        pass: true,
        score: 1,
        reason: `No forbidden gh command "${mustNotContain}" found`,
      };
    }
  }

  const found = log.includes(expectedCommand);
  return {
    pass: found,
    score: found ? 1 : 0,
    reason: found
      ? `Mock gh log contains expected command: ${expectedCommand}`
      : `Mock gh log does not contain expected command: ${expectedCommand}`,
  };
};

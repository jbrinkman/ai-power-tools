const fs = require('fs');
const path = require('path');

const LOG_FILE = process.env.GH_MOCK_LOG_FILE || path.resolve(__dirname, '../tmp/promptfoo-gh-mock.log');

module.exports = (output, context) => {
  const expectedCommand = context?.config?.expectedCommand || context?.vars?.expectedCommand;
  if (!expectedCommand) {
    return {
      pass: false,
      score: 0,
      reason: 'expectedCommand is not configured for this assertion',
    };
  }

  let log = '';
  let attempts = 0;
  while (attempts < 3) {
    try {
      log = fs.readFileSync(LOG_FILE, 'utf8');
      if (log.includes(expectedCommand)) {
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

  const found = log.includes(expectedCommand);
  return {
    pass: found,
    score: found ? 1 : 0,
    reason: found
      ? `Mock gh log contains expected command: ${expectedCommand}`
      : `Mock gh log does not contain expected command: ${expectedCommand}`,
  };
};

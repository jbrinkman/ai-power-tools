const { extractMockLog } = require('../lib/mockLog');

module.exports = (output, context) => {
  const expectedCommand = context?.config?.expectedCommand || context?.vars?.expectedCommand;
  if (!expectedCommand) {
    return {
      pass: false,
      score: 0,
      reason: 'expectedCommand is not configured for this assertion',
    };
  }

  const log = extractMockLog(output);
  if (!log) {
    return {
      pass: false,
      score: 0,
      reason: 'No gh mock log found embedded in provider output (the mock gh was never invoked, or the provider failed before it could embed the log)',
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

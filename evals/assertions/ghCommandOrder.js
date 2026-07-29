const { extractMockLog } = require('../lib/mockLog');

// Verify that a sequence of gh commands were invoked in a specific relative
// order (each one must appear at or after the position where the previous
// one ended). This checks *ordering*, not adjacency — other commands may be
// interleaved between the ones listed.
module.exports = (output, context) => {
  const expectedOrder = context?.config?.expectedOrder;
  if (!Array.isArray(expectedOrder) || expectedOrder.length < 2) {
    return {
      pass: false,
      score: 0,
      reason: 'expectedOrder must be configured as an array of at least two command substrings to check ordering',
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

  let cursor = 0;
  for (const command of expectedOrder) {
    const idx = log.indexOf(command, cursor);
    if (idx === -1) {
      return {
        pass: false,
        score: 0,
        reason: `Expected order ${expectedOrder.join(' -> ')} not satisfied: "${command}" was not found at or after the previous command in the mock gh log`,
      };
    }
    cursor = idx + command.length;
  }

  return {
    pass: true,
    score: 1,
    reason: `Mock gh log contains commands in expected order: ${expectedOrder.join(' -> ')}`,
  };
};

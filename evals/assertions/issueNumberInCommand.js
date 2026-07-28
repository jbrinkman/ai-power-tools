const { extractMockLog } = require('../lib/mockLog');

module.exports = (output, context) => {
  const expectedIssue = context?.vars?.expectedIssue;
  if (!expectedIssue) {
    return {
      pass: false,
      score: 0,
      reason: 'expectedIssue is not set in test vars',
    };
  }

  const log = extractMockLog(output);

  // Match `issue edit <number>` invocations recorded by the gh mock.
  const matches = log.match(/^args:\s*issue edit\s+(\d+)/m);
  if (!matches) {
    return {
      pass: false,
      score: 0,
      reason: 'No gh issue edit <number> command found in the mock gh log',
    };
  }

  const actualIssue = matches[1];
  const pass = actualIssue === String(expectedIssue);
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass
      ? `gh issue edit references expected issue: ${actualIssue}`
      : `gh issue edit references issue ${actualIssue}, expected ${expectedIssue}`,
  };
};

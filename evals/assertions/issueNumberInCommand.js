module.exports = (output, context) => {
  const expectedIssue = context?.vars?.expectedIssue;
  if (!expectedIssue) {
    return {
      pass: false,
      score: 0,
      reason: 'expectedIssue is not set in test vars',
    };
  }

  // Match gh issue edit <number>.
  const matches = output.match(/gh issue edit\s+(\d+)/);
  if (!matches) {
    return {
      pass: false,
      score: 0,
      reason: 'No gh issue edit <number> command found in the output',
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

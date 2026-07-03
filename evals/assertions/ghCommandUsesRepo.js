module.exports = (output, context) => {
  const expectedRepo = context?.vars?.expectedRepo;
  if (!expectedRepo) {
    return {
      pass: false,
      score: 0,
      reason: 'expectedRepo is not set in test vars',
    };
  }

  // Match gh issue create or gh issue edit commands with --repo flag.
  const matches = output.match(/gh issue (?:create|edit)(?:\s+\d+)?[\s\S]*?--repo\s+["']?([^"'\s]+)["']?/);
  if (!matches) {
    return {
      pass: false,
      score: 0,
      reason: 'No well-formed gh issue create/edit command with --repo found in the output',
    };
  }

  const actualRepo = matches[1];
  const pass = actualRepo === expectedRepo;
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass
      ? `gh command uses expected repo: ${actualRepo}`
      : `gh command uses repo ${actualRepo}, expected ${expectedRepo}`,
  };
};

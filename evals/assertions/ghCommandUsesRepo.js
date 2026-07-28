const { extractMockLog } = require('../lib/mockLog');

module.exports = (output, context) => {
  const expectedRepo = context?.vars?.expectedRepo;
  if (!expectedRepo) {
    return {
      pass: false,
      score: 0,
      reason: 'expectedRepo is not set in test vars',
    };
  }

  const log = extractMockLog(output);

  // Match `issue create`/`issue edit` invocations recorded by the gh mock
  // (logged as `args: issue create --repo ...`) with a --repo flag.
  const matches = log.match(/^args:\s*issue (?:create|edit)(?:\s+\d+)?[\s\S]*?--repo\s+["']?([^"'\s]+)["']?/m);
  if (!matches) {
    return {
      pass: false,
      score: 0,
      reason: 'No gh issue create/edit command with --repo found in the mock gh log',
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

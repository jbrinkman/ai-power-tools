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

  // Configurable command pattern via config.command. Supports:
  //   - "issue view" → matches `issue view <number> --repo ...`
  //   - "issue create" → matches `issue create --repo ...`
  //   - "issue edit" → matches `issue edit <number> --repo ...`
  //   - undefined (default) → matches `issue create` or `issue edit` (backward compat)
  const command = context?.config?.command;
  let pattern;
  let label;
  if (command) {
    // Escape the command for use in a regex, allow optional number after it.
    const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    pattern = new RegExp(`^args:\\s*${escaped}(?:\\s+\\d+)?[\\s\\S]*?--repo\\s+["']?([^"'\\s]+)["']?`, 'm');
    label = command;
  } else {
    // Default: match issue create or issue edit (backward compatible).
    pattern = /^args:\s*issue (?:create|edit)(?:\s+\d+)?[\s\S]*?--repo\s+["']?([^"'\s]+)["']?/m;
    label = 'issue create/edit';
  }

  const matches = log.match(pattern);
  if (!matches) {
    return {
      pass: false,
      score: 0,
      reason: `No gh ${label} command with --repo found in the mock gh log`,
    };
  }

  const actualRepo = matches[1];
  const pass = actualRepo === expectedRepo;
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass
      ? `gh ${label} command uses expected repo: ${actualRepo}`
      : `gh ${label} command uses repo ${actualRepo}, expected ${expectedRepo}`,
  };
};

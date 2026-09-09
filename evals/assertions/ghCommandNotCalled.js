const { extractMockLog } = require('../lib/mockLog');

module.exports = (output, context) => {
  const configured = context?.config?.forbiddenCommand ?? context?.vars?.forbiddenCommand;
  if (!configured) {
    return {
      pass: false,
      score: 0,
      reason: 'forbiddenCommand is not configured for this assertion',
    };
  }

  // Accept either a single command string or an array of command strings, so
  // tests that need to forbid several commands don't have to repeat this
  // assertion once per command.
  const forbiddenCommands = Array.isArray(configured) ? configured : [configured];

  const log = extractMockLog(output);
  if (!log) {
    return {
      pass: true,
      score: 1,
      reason: 'No gh mock log found embedded in provider output, so none of the forbidden commands were invoked',
    };
  }

  const foundCommands = forbiddenCommands.filter((command) => log.includes(command));
  const pass = foundCommands.length === 0;
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass
      ? `Mock gh log does not contain any forbidden command: ${forbiddenCommands.join(', ')}`
      : `Mock gh log contains forbidden command(s): ${foundCommands.join(', ')}`,
  };
};

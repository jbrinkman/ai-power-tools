/**
 * Prompt processor for the github-issue-creator skill.
 *
 * Replaces 'gh ' commands with the mock path so the model calls the mock
 * instead of the real gh CLI. Targets command positions (start of line,
 * after newline, in backticks) to avoid replacing prose like "the gh CLI".
 */

module.exports = function processPrompt(prompt, env) {
  const mockGh = env.GH_CMD;
  if (!mockGh) {
    return prompt;
  }

  return prompt
    .replace(/^gh /gm, `${mockGh} `)
    .replace(/\ngh /g, `\n${mockGh} `)
    .replace(/`gh /g, `\`${mockGh} `);
};

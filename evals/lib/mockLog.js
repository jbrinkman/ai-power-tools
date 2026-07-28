// Shared helpers for the gh mock's embedded trace log.
//
// `providers/devin.js` captures the mock gh script's private log file for
// each test invocation and embeds its contents directly in the provider
// output, wrapped in the delimiters below. Assertions extract it back out
// with `extractMockLog` instead of re-locating a shared file on disk, so
// there is no external state that can go stale or collide between tests.
const LOG_START = '<!-- GH_MOCK_LOG_START -->';
const LOG_END = '<!-- GH_MOCK_LOG_END -->';

function wrapMockLog(logContents) {
  return `\n${LOG_START}\n${logContents}\n${LOG_END}\n`;
}

function extractMockLog(output) {
  if (typeof output !== 'string') {
    return '';
  }
  const start = output.indexOf(LOG_START);
  const end = output.indexOf(LOG_END);
  if (start === -1 || end === -1 || end < start) {
    return '';
  }
  return output.slice(start + LOG_START.length, end).trim();
}

module.exports = { LOG_START, LOG_END, wrapMockLog, extractMockLog };

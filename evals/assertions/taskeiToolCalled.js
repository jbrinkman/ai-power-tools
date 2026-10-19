const fs = require('fs');
const path = require('path');

// Assertion for MCP-backed skills: verifies which Taskei tools the skill
// called (and, optionally, that a given argument substring did / did not
// appear) by reading the mock builder-mcp server's command log. The MCP
// analogue of ghCommandCalled.js.
//
// Each log entry the mock writes looks like:
//   ---
//   2026-10-19T16:40:04.869Z
//   tool: TaskeiCreateTask
//   args: {"name":"...","roomId":"...","type":"STORY"}
//   scenario: default
//
// Config options (any combination):
//   expectedTool:    a tool name that MUST appear (e.g. "TaskeiCreateTask").
//   mustNotCallTool: a tool name that must NOT appear (e.g. "TaskeiUpdateTask"
//                    in a pure-create test).
//   argContains:     substring that must appear in SOME logged `args:` line
//                    (optionally scoped to expectedTool's entries).
//   argMustNotContain: substring that must NOT appear in any `args:` line.

const DEFAULT_LOG_FILE =
  process.env.TASKEI_MOCK_LOG_FILE ||
  path.resolve(__dirname, '../tmp/promptfoo-taskei-mock.log');

function resolveLogFile(context) {
  const raw = context?.vars?.logFile;
  if (!raw) return DEFAULT_LOG_FILE;
  return path.isAbsolute(raw) ? raw : path.resolve(__dirname, '..', raw);
}

// Parse the log into [{ tool, args }] entries.
function parseEntries(log) {
  const entries = [];
  let cur = null;
  for (const line of log.split('\n')) {
    if (line === '---') {
      if (cur) entries.push(cur);
      cur = { tool: '', args: '' };
    } else if (cur && line.startsWith('tool: ')) {
      cur.tool = line.slice('tool: '.length).trim();
    } else if (cur && line.startsWith('args: ')) {
      cur.args = line.slice('args: '.length);
    }
  }
  if (cur) entries.push(cur);
  return entries;
}

module.exports = (output, context) => {
  const cfg = context?.config || {};
  const {
    expectedTool,
    mustNotCallTool,
    argContains,
    argMustNotContain,
  } = cfg;

  if (!expectedTool && !mustNotCallTool && !argContains && !argMustNotContain) {
    return {
      pass: false,
      score: 0,
      reason:
        'taskeiToolCalled: configure expectedTool, mustNotCallTool, argContains, or argMustNotContain',
    };
  }

  const LOG_FILE = resolveLogFile(context);

  let log = '';
  let attempts = 0;
  while (attempts < 3) {
    try {
      log = fs.readFileSync(LOG_FILE, 'utf8');
      if (log) break;
    } catch (e) {
      // Log may not exist yet; retry briefly for concurrent writes.
    }
    attempts++;
    if (attempts < 3) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }

  if (log === '') {
    return {
      pass: false,
      score: 0,
      reason: `Could not read mock Taskei log at ${LOG_FILE}`,
    };
  }

  const entries = parseEntries(log);
  const reasons = [];

  if (expectedTool) {
    const hit = entries.some((e) => e.tool === expectedTool);
    if (!hit) {
      return {
        pass: false,
        score: 0,
        reason: `Mock Taskei log does not contain a call to ${expectedTool} (saw: ${
          entries.map((e) => e.tool).join(', ') || 'none'
        })`,
      };
    }
    reasons.push(`called ${expectedTool}`);
  }

  if (mustNotCallTool) {
    const hit = entries.some((e) => e.tool === mustNotCallTool);
    if (hit) {
      return {
        pass: false,
        score: 0,
        reason: `Forbidden Taskei tool was called: ${mustNotCallTool}`,
      };
    }
    reasons.push(`did not call ${mustNotCallTool}`);
  }

  if (argContains) {
    // Scope to expectedTool's entries when both are given, else any entry.
    const scope = expectedTool
      ? entries.filter((e) => e.tool === expectedTool)
      : entries;
    const hit = scope.some((e) => e.args.includes(argContains));
    if (!hit) {
      return {
        pass: false,
        score: 0,
        reason: `No ${
          expectedTool || 'Taskei'
        } call had args containing "${argContains}"`,
      };
    }
    reasons.push(`args contain "${argContains}"`);
  }

  if (argMustNotContain) {
    const hit = entries.some((e) => e.args.includes(argMustNotContain));
    if (hit) {
      return {
        pass: false,
        score: 0,
        reason: `A Taskei call had forbidden args substring "${argMustNotContain}"`,
      };
    }
    reasons.push(`args never contain "${argMustNotContain}"`);
  }

  return { pass: true, score: 1, reason: reasons.join('; ') };
};

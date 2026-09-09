#!/usr/bin/env node
// Devin CLI provider and grader for promptfoo
//
// Auto-detects mode based on prompt format:
// - Grader mode: Prompt is JSON array [{role, content}, ...]
// - Provider mode: Prompt is plain text
//
// Provider mode invokes the skill under test via Devin CLI's real skill
// discovery (see evals/setup-skills-symlink.sh and evals/README.md) rather
// than splicing SKILL.md text into the prompt ourselves -- the prompt is
// just "@skills:<name> <request>", and Devin reads the skill file from disk
// itself, exactly as it would in a real session. This means the skill's
// literal `gh ...` commands run for real (as far as Devin is concerned), so
// the script prepends the mock gh directory to PATH and -- critically --
// verifies gh actually resolves to the mock, in the exact env about to be
// handed to Devin, before ever invoking the skill. See verifyMockGhOnPath().
// A silent PATH-shadowing failure here would mean a test could hit the real
// GitHub API (e.g. actually calling `gh issue create`), so this check aborts
// loudly rather than proceeding on a hope.

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { wrapMockLog } = require('../lib/mockLog');

// Repo root (two levels up from evals/providers/), used as the working
// directory for the spawned `devin` process so its real skill discovery
// (which scans .agents/skills/<name>/SKILL.md relative to cwd) finds the
// .agents/skills symlink created by evals/setup-skills-symlink.sh.
const repoRoot = path.resolve(__dirname, '..', '..');

const prompt = process.argv[2];
const options = process.argv[3];
const context = process.argv[4];

// Opt-in diagnostic logging for troubleshooting hangs in the real
// promptfoo -> node -> devin pipeline (as opposed to invoking devin
// directly, which bypasses this script entirely). Set
// DEVIN_EVAL_DEBUG_LOG=/path/to/file and tail it while a hung eval is
// running to see exactly which step it is stuck on. No effect if unset.
const DEBUG_LOG = process.env.DEVIN_EVAL_DEBUG_LOG;
function debugLog(msg) {
  if (!DEBUG_LOG) {
    return;
  }
  try {
    fs.appendFileSync(DEBUG_LOG, `[${new Date().toISOString()}] [pid ${process.pid}] ${msg}\n`);
  } catch (e) {
    // Never let debug logging itself break the run.
  }
}
debugLog(`start: promptLength=${prompt ? prompt.length : 0} options=${options}`);

// Resolve the mock gh directory relative to this script.
const mockGhDir = path.resolve(__dirname, '../mocks');

// Parse OPTIONS to get model from config.
let model = 'swe-1.6';
if (options && options !== '{}') {
  try {
    const optionsObj = JSON.parse(options);
    if (optionsObj.config && optionsObj.config.model) {
      model = optionsObj.config.model;
    }
  } catch (e) {
    // If JSON parsing fails, use default.
  }
}

// Parse CONTEXT to expose test vars to the mock gh script.
let testVars = {};
if (context && context !== '{}') {
  try {
    const contextObj = JSON.parse(context);
    testVars = contextObj.vars || {};
  } catch (e) {
    // If JSON parsing fails, ignore.
  }
}

// Maximum time to let a single `devin` invocation run before we kill it and
// fail loudly, instead of letting a hang (e.g. the child waiting on stdin
// that will never arrive) block the whole eval run indefinitely.
const DEVIN_TIMEOUT_MS = Number(process.env.DEVIN_EVAL_TIMEOUT_MS) || 10 * 60 * 1000;

// Run the devin CLI. stdin is ignored (not piped) so a `devin` invocation
// that ever tries to read from stdin gets immediate EOF instead of hanging
// forever on a pipe nothing will ever write to or close — see
// https://github.com/promptfoo/promptfoo's own ScriptCompletionProvider,
// which closes stdin for exactly this reason ("tools like opencode block
// forever waiting for input"). The timeout is a second line of defense so
// any other kind of hang fails loudly instead of stalling the whole eval run.
function runDevin(args, env) {
  debugLog(`spawning devin with args: ${JSON.stringify(args)}`);
  const result = spawnSync('devin', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: DEVIN_TIMEOUT_MS,
    cwd: repoRoot,
    env,
  });
  debugLog(`devin returned: status=${result.status} signal=${result.signal} error=${result.error && result.error.message} stdoutLength=${result.stdout ? result.stdout.length : 0} stderrLength=${result.stderr ? result.stderr.length : 0}`);

  if (result.error) {
    if (result.error.code === 'ETIMEDOUT') {
      console.error(`devin timed out after ${DEVIN_TIMEOUT_MS}ms (set DEVIN_EVAL_TIMEOUT_MS to change this)`);
    } else {
      console.error(result.error.message);
    }
    process.exit(1);
  }

  if (result.signal) {
    console.error(`devin was killed by signal ${result.signal} (timeout: ${DEVIN_TIMEOUT_MS}ms, set DEVIN_EVAL_TIMEOUT_MS to change this)`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(result.stdout || result.stderr);
    process.exit(result.status || 1);
  }

  return result;
}

// Verify, in the EXACT env about to be handed to `devin`, that `gh` actually
// resolves to our mock binary via normal PATH lookup -- not the real GitHub
// CLI. This is a hard safety gate, not a best-effort check: since the skill
// under test now runs via Devin's real skill loading (see header comment),
// its literal `gh issue create`/`gh issue edit` commands would hit the real
// GitHub API for real if PATH-shadowing ever silently failed (e.g. Devin's
// exec tool sanitizing env, or resolving gh some other way). Aborts loudly
// rather than proceeding on a hope.
function verifyMockGhOnPath(env) {
  const expected = path.join(mockGhDir, 'gh');
  const result = spawnSync('bash', ['-lc', 'command -v gh'], {
    encoding: 'utf8',
    cwd: repoRoot,
    env,
  });
  const resolved = (result.stdout || '').trim();
  if (result.status !== 0 || !resolved) {
    console.error(`Safety check failed: could not resolve \`gh\` at all in the env about to be passed to devin (stderr: ${(result.stderr || '').trim()}). Refusing to run the skill -- it would have no gh to call, or worse, an unexpected one.`);
    process.exit(1);
  }
  if (path.resolve(resolved) !== path.resolve(expected)) {
    console.error(`Safety check failed: \`gh\` resolves to '${resolved}', not the mock at '${expected}'. Refusing to run the skill -- this would call the real GitHub CLI instead of the mock.`);
    process.exit(1);
  }
  debugLog(`safety check passed: gh resolves to mock at ${resolved}`);
}

// Detect mode: if prompt looks like a JSON array, use grader mode.
let isGraderMode = false;
try {
  const parsed = JSON.parse(prompt);
  if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].role) {
    isGraderMode = true;
  }
} catch (e) {
  // Not JSON, so provider mode.
}

// Build environment. In provider mode, prepend the mock gh directory to PATH
// and give the mock a private log file for this invocation only, so its
// recorded commands can never collide with another test's log.
//
// Two independent safety layers, because PATH-prepending alone was observed
// to be insufficient: Devin's exec tool appears to run commands through a
// shell that re-sources the user's real shell rc files (e.g. ~/.zshrc), and
// a line like `export PATH="/opt/homebrew/bin:$PATH"` silently re-prepends
// the real `gh`'s directory ahead of our injected mock directory *after* we
// set PATH here.
//   1. ZDOTDIR points zsh at an empty scratch directory instead of $HOME, so
//      it finds none of the user's real .zshenv/.zprofile/.zshrc/.zlogin and
//      therefore can't reorder PATH out from under us. (This does not cover
//      every possible shell Devin might invoke internally -- see layer 2.)
//   2. Even if some other shell/mechanism still reaches the real `gh`
//      binary, it has no valid credentials to do anything destructive with:
//      GH_CONFIG_DIR points at an empty scratch directory (so gh finds no
//      stored auth), and GH_TOKEN/GITHUB_TOKEN are stripped from the child
//      env entirely. A real `gh` invocation under this env can only fail
//      with an auth error, not actually create/edit/read a real repo.
const env = { ...process.env };
let mockLogDir = null;
let mockLogFile = null;
let scratchDir = null;
if (!isGraderMode) {
  env.PATH = `${mockGhDir}:${env.PATH}`;
  // Explicitly point the skill at the mock gh binary so we are not relying on
  // PATH precedence inside the Devin CLI subprocess (which reorders PATH and
  // can place system directories ahead of our injected mock directory).
  env.GH_CMD = path.join(mockGhDir, 'gh');
  mockLogDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-mock-'));
  mockLogFile = path.join(mockLogDir, 'gh-mock.log');
  env.GH_MOCK_LOG_FILE = mockLogFile;

  scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devin-eval-scratch-'));
  env.ZDOTDIR = scratchDir; // empty: zsh finds no real rc files to source
  env.GH_CONFIG_DIR = path.join(scratchDir, 'gh-config'); // empty: no real gh auth
  delete env.GH_TOKEN;
  delete env.GITHUB_TOKEN;

  // Forward test vars to the mock gh script as env vars with a prefix.
  Object.entries(testVars).forEach(([key, value]) => {
    env[`PROMPTFOO_VAR_${key}`] = String(value);
  });
}
debugLog(`mode=${isGraderMode ? 'grader' : 'provider'} model=${model} mockLogFile=${mockLogFile}`);

if (isGraderMode) {
  // ===== GRADER MODE =====
  // Parse the JSON chat message array that promptfoo sends to graders.
  let systemMsg, userMsg;
  try {
    const messages = JSON.parse(prompt);
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessage = messages.find(m => m.role === 'user');

    if (systemMessage && userMessage) {
      systemMsg = systemMessage.content;
      userMsg = userMessage.content;
    } else {
      throw new Error('Missing system or user message');
    }
  } catch (e) {
    // Fallback: treat the whole thing as a user message.
    systemMsg = 'You are an evaluator. Respond with only valid JSON: {"pass": bool, "score": 0.0-1.0, "reason": "string"}';
    userMsg = prompt;
  }

  // Combine system and user into one prompt (Devin has no --system-prompt).
  const fullPrompt = `${systemMsg}\n\n${userMsg}`;

  const result = runDevin(['-p', '--model', model, '--', fullPrompt], env);
  console.log(result.stdout);
} else {
  // ===== PROVIDER MODE =====
  // Call devin cli with single-turn mode and specified model.
  // Use dangerous permission mode so the skill can execute shell commands.
  //
  // `prompt` is used as-is here -- promptfooconfig.yaml builds it as
  // "@skills:<name> <request>" so Devin loads the real skill file from disk
  // itself (see .agents/skills symlink, evals/setup-skills-symlink.sh).
  // There is no SKILL.md text embedded in the prompt to rewrite anymore, so
  // the old per-skill prompt processor (regex-rewriting literal `gh `
  // commands to the mock's path) is retired -- PATH-shadowing plus the
  // safety gate below is the sole mocking mechanism now.
  verifyMockGhOnPath(env);

  const result = runDevin(['-p', '--permission-mode', 'dangerous', '--model', model, '--', prompt], env);

  // Fold the mock's recorded gh invocations into the output so assertions
  // can read them directly instead of re-locating a shared log file on disk.
  let mockLog = '';
  try {
    mockLog = fs.readFileSync(mockLogFile, 'utf8');
  } catch (e) {
    // The mock was never invoked; leave the embedded log block empty.
  } finally {
    fs.rmSync(mockLogDir, { recursive: true, force: true });
    fs.rmSync(scratchDir, { recursive: true, force: true });
  }

  debugLog(`done, mockLogLength=${mockLog.length}`);
  console.log(result.stdout + wrapMockLog(mockLog));
}

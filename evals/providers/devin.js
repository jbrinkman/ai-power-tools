#!/usr/bin/env node
// Devin CLI provider and grader for promptfoo
//
// Auto-detects mode based on prompt format:
// - Grader mode: Prompt is JSON array [{role, content}, ...]
// - Provider mode: Prompt is plain text
//
// In provider mode, the script prepends the mock gh directory to PATH so the
// skill under test does not touch the real GitHub CLI.

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { wrapMockLog } = require('../lib/mockLog');

const prompt = process.argv[2];
const options = process.argv[3];
const context = process.argv[4];

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
const env = { ...process.env };
let mockLogDir = null;
let mockLogFile = null;
if (!isGraderMode) {
  env.PATH = `${mockGhDir}:${env.PATH}`;
  mockLogDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-mock-'));
  mockLogFile = path.join(mockLogDir, 'gh-mock.log');
  env.GH_MOCK_LOG_FILE = mockLogFile;
  // Forward test vars to the mock gh script as env vars with a prefix.
  Object.entries(testVars).forEach(([key, value]) => {
    env[`PROMPTFOO_VAR_${key}`] = String(value);
  });
}

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

  const result = spawnSync('devin', ['-p', '--model', model, '--', fullPrompt], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    env,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(result.stdout || result.stderr);
    process.exit(result.status || 1);
  }

  console.log(result.stdout);
} else {
  // ===== PROVIDER MODE =====
  // Call devin cli with single-turn mode and specified model.
  // Use dangerous permission mode so the skill can execute shell commands
  // (the mock gh script in PATH prevents touching the real GitHub CLI).
  const result = spawnSync('devin', ['-p', '--permission-mode', 'dangerous', '--model', model, '--', prompt], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    env,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(result.stdout || result.stderr);
    process.exit(result.status || 1);
  }

  // Fold the mock's recorded gh invocations into the output so assertions
  // can read them directly instead of re-locating a shared log file on disk.
  let mockLog = '';
  try {
    mockLog = fs.readFileSync(mockLogFile, 'utf8');
  } catch (e) {
    // The mock was never invoked; leave the embedded log block empty.
  } finally {
    fs.rmSync(mockLogDir, { recursive: true, force: true });
  }

  console.log(result.stdout + wrapMockLog(mockLog));
}

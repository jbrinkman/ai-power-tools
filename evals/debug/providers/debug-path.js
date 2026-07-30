#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const prompt = process.argv[2];

const mockDir = path.resolve(__dirname, '../mocks');
const mockGh = path.join(mockDir, 'gh');
const env = { ...process.env };
env.PATH = `${mockDir}:${env.PATH}`;
env.GH_CMD = mockGh;

const logLines = [];
logLines.push(`mockDir=${mockDir}`);
logLines.push(`mockGh=${mockGh}`);
logLines.push(`env.PATH=${env.PATH}`);
logLines.push(`env.GH_CMD=${env.GH_CMD}`);

const result = spawnSync('devin', ['-p', '--permission-mode', 'dangerous', '--model', 'claude-sonnet-4.6', '--', prompt], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  env,
});

logLines.push(`devin status=${result.status}`);
logLines.push(`devin stderr=${result.stderr}`);
logLines.push(`devin stdout=${result.stdout}`);

fs.writeFileSync('/tmp/debug-path.log', logLines.join('\n'), 'utf8');

console.log(result.stdout);

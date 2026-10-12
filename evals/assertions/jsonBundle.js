// Custom promptfoo assertion: parse the skill's JSON output (the bundle) and
// check a value at a dotted path, or a containment/count fact about an array.
//
// config:
//   path:      dotted path into the parsed JSON, e.g. "projects.completed" or
//              "sprint.tasks" (array indices not supported; use arrayContains)
//   mode:      "equals" (default) | "arrayLength" | "arrayContains" | "exists"
//   expected:  for equals/arrayLength: the expected value (stringwise compare)
//   match:     for arrayContains: a {key: value} object every element must be
//              checked against; passes if ANY element matches all key/values
//   label:     optional human label

const path = require('path');

function extractJson(output) {
  // The provider's stdout may have prose around a fenced ```json block, or be
  // bare JSON. Try bare parse first, then look for a fenced block.
  try {
    return JSON.parse(output);
  } catch (e) {
    const m = output.match(/```json\s*([\s\S]*?)\s*```/);
    if (m) {
      return JSON.parse(m[1]);
    }
    // last resort: find the first '{' and last '}' and try that span
    const start = output.indexOf('{');
    const end = output.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(output.slice(start, end + 1));
    }
    throw e;
  }
}

function getPath(obj, dotted) {
  return dotted.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

module.exports = (output, context) => {
  const cfg = (context && context.config) || {};
  const { path: dotted, expected, match } = cfg;
  const mode = cfg.mode || 'equals';
  const label = cfg.label || `${mode} @ ${dotted}`;

  let parsed;
  try {
    parsed = extractJson(output);
  } catch (e) {
    return { pass: false, score: 0, reason: `jsonBundle: could not parse JSON output (${e.message})` };
  }

  const value = dotted ? getPath(parsed, dotted) : parsed;

  if (mode === 'exists') {
    const pass = value !== undefined && value !== null;
    return { pass, score: pass ? 1 : 0, reason: pass ? `jsonBundle OK — ${label} exists` : `jsonBundle FAIL — ${label} is missing` };
  }

  if (mode === 'equals') {
    const pass = String(value) === String(expected);
    return {
      pass, score: pass ? 1 : 0,
      reason: pass ? `jsonBundle OK — ${label} => ${value}` : `jsonBundle FAIL — ${label}: expected "${expected}", got "${JSON.stringify(value)}"`,
    };
  }

  if (mode === 'arrayLength') {
    const arr = Array.isArray(value) ? value : [];
    const pass = String(arr.length) === String(expected);
    return {
      pass, score: pass ? 1 : 0,
      reason: pass ? `jsonBundle OK — ${label} length ${arr.length}` : `jsonBundle FAIL — ${label}: expected length ${expected}, got ${arr.length}`,
    };
  }

  if (mode === 'arrayContains') {
    const arr = Array.isArray(value) ? value : [];
    const keys = Object.keys(match || {});
    const found = arr.some((el) => keys.every((k) => String(el && el[k]) === String(match[k])));
    return {
      pass: found, score: found ? 1 : 0,
      reason: found
        ? `jsonBundle OK — ${label} contains a match for ${JSON.stringify(match)}`
        : `jsonBundle FAIL — ${label}: no element matches ${JSON.stringify(match)}; array had ${arr.length} item(s)`,
    };
  }

  return { pass: false, score: 0, reason: `jsonBundle: unknown mode "${mode}"` };
};

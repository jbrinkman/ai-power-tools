'use strict';

/**
 * statusrpt-sentinel — deterministic structural gate for the weekly status
 * report workflow.
 *
 * This is plain code, not an agent skill: no LLM call, no prompt, no model
 * involved. It runs between statusrpt-compile (writes the report) and the
 * human/adversarial-review punch-out, and again before statusrpt-publish,
 * to catch mechanically-decidable defects cheaply and deterministically —
 * the same class of checks statusrpt-compile's own eval suite was reworked
 * to use (see evals/skills/statusrpt-compile/tests.yaml and its
 * ITERATIONS.md Iteration 3) rather than spending a model call to answer a
 * yes/no structural question.
 *
 * Each check function takes the full report text and returns an array of
 * findings: { rule, severity: 'error'|'warning', message, line? }. An empty
 * array means that check passed clean. `runAll` aggregates every check.
 */

// The two CLOSED badge vocabularies house style defines. A status badge and
// a risk-severity badge are DIFFERENT vocabularies that happen to share two
// class names (red, yellow) — a word is valid if it matches EITHER table
// under its own class.
const STATUS_WORDS = {
  green: ['Done', 'On Track', 'In Progress'],
  gray: ['Not Started'],
  red: ['Blocked', 'Off Track'],
  yellow: ['At Risk'],
  paused: ['Paused'],
  pending: ['Pending Updates'],
};

const RISK_SEVERITY_WORDS = {
  red: ['High'],
  orange: ['Medium'],
  yellow: ['Low'],
};

const REQUIRED_SECTIONS_IN_ORDER = [
  '## Summary',
  "## Last Week's Progress",
  "## This Week's Focus",
  '## Risks',
  '## Goals',
  '## Status Details',
  '## Staffing',
];

const PLACEHOLDER_PATTERNS = [
  { pattern: /\bTBD\b/, label: 'TBD' },
  { pattern: /Lorem ipsum/i, label: 'Lorem ipsum' },
  { pattern: /<INSERT/i, label: '<INSERT ...> template token' },
  { pattern: /\{\{.*?\}\}/, label: 'unresolved mustache-style template token' },
];

const META_COMMENTARY_PATTERNS = [
  /\bI('ll| will)\b/i,
  /\brelative to\b/i,
  /\bthe request\b/i,
  /\bI('m| am) going to\b/i,
];

function lineOf(text, index) {
  if (index < 0) return undefined;
  return text.slice(0, index).split('\n').length;
}

/** Required sections exist and appear in house-style order. */
function checkSectionOrder(text) {
  const positions = REQUIRED_SECTIONS_IN_ORDER.map((h) => text.indexOf(h));
  const missing = REQUIRED_SECTIONS_IN_ORDER.filter((_, i) => positions[i] === -1);
  if (missing.length > 0) {
    return missing.map((h) => ({
      rule: 'section-order',
      severity: 'error',
      message: `Missing required section heading: "${h}"`,
    }));
  }
  const outOfOrder = positions.some((p, i) => i > 0 && p <= positions[i - 1]);
  if (outOfOrder) {
    return [{
      rule: 'section-order',
      severity: 'error',
      message: `Required sections present but not in house-style order: ${REQUIRED_SECTIONS_IN_ORDER.join(' -> ')}`,
    }];
  }
  return [];
}

/** Infrastructure must be a ### subsection inside Status Details, never a top-level ## section. */
function checkInfrastructureHeadingLevel(text) {
  const findings = [];
  const topLevelMatch = /^##\s+Infrastructure\s*$/m.exec(text);
  if (topLevelMatch) {
    findings.push({
      rule: 'infrastructure-heading-level',
      severity: 'error',
      message: 'Infrastructure rendered as a top-level ## section instead of a ### subsection',
      line: lineOf(text, topLevelMatch.index),
    });
  }
  if (!/^###\s+Infrastructure\s*$/m.test(text)) {
    findings.push({
      rule: 'infrastructure-heading-level',
      severity: 'error',
      message: 'No ### Infrastructure subsection found',
    });
  }
  return findings;
}

/** Infrastructure subsection must be a bullet list, never a markdown table. */
function checkInfrastructureNotTable(text) {
  const parts = text.split(/^###\s+Infrastructure\s*$/m);
  if (parts.length < 2) return []; // checkInfrastructureHeadingLevel already flags this
  const section = parts[1].split(/\n##?\s/)[0];
  if (/^\s*\|.*\|.*\|/m.test(section)) {
    return [{
      rule: 'infrastructure-not-table',
      severity: 'error',
      message: 'Infrastructure section contains a markdown table (pipe-delimited row) instead of a bullet list',
    }];
  }
  return [];
}

/** Every <span class="..."> badge must use one of the two closed vocabularies, matching class. */
function checkBadgeVocabulary(text) {
  const findings = [];
  const spanRe = /<span class="(\w+)">([^<]*)<\/span>/g;
  let m;
  while ((m = spanRe.exec(text)) !== null) {
    const [, cls, wordRaw] = m;
    const word = wordRaw.trim();
    const okStatus = STATUS_WORDS[cls] && STATUS_WORDS[cls].includes(word);
    const okRisk = RISK_SEVERITY_WORDS[cls] && RISK_SEVERITY_WORDS[cls].includes(word);
    if (!okStatus && !okRisk) {
      findings.push({
        rule: 'badge-vocabulary',
        severity: 'error',
        message: `Invalid badge: class="${cls}">${word}</span> is not in the approved status or risk-severity vocabulary`,
        line: lineOf(text, m.index),
      });
    }
  }
  return findings;
}

/** No plain-text status words standing in for a badge span. */
function checkNoPlainTextStatus(text) {
  const banned = ['>Completed<', '>In Review<', '>Pending<', '>TODO<'];
  const findings = [];
  for (const b of banned) {
    const idx = text.indexOf(b);
    if (idx !== -1) {
      findings.push({
        rule: 'no-plain-text-status',
        severity: 'error',
        message: `Found plain-text status standing in for a badge: ${b}`,
        line: lineOf(text, idx),
      });
    }
  }
  return findings;
}

/** No leftover placeholder/template tokens. */
function checkNoPlaceholders(text) {
  const findings = [];
  for (const { pattern, label } of PLACEHOLDER_PATTERNS) {
    const m = pattern.exec(text);
    if (m) {
      findings.push({
        rule: 'no-placeholders',
        severity: 'error',
        message: `Found unresolved placeholder: ${label}`,
        line: lineOf(text, m.index),
      });
    }
  }
  return findings;
}

/** Output must not open with meta-commentary about the compilation task itself. */
function checkNoMetaCommentary(text) {
  const firstLine = text.trim().split('\n')[0] || '';
  const isMeta = META_COMMENTARY_PATTERNS.some((p) => p.test(firstLine));
  if (isMeta) {
    return [{
      rule: 'no-meta-commentary',
      severity: 'error',
      message: `Output opens with meta-commentary instead of report content: "${firstLine}"`,
    }];
  }
  return [];
}

/**
 * No unresolved strikethrough date-correction artifacts left mid-edit.
 * House style USES strikethrough deliberately for date corrections, e.g.
 * "~~Sep 30~~ Oct 13" — that is valid and must not be flagged. What's a
 * defect is a strikethrough span with nothing readable after it (the author
 * started a correction and never finished it), or badly unbalanced `~~`
 * markers (odd count) that will render broken.
 */
function checkStrikethroughResolved(text) {
  const findings = [];
  const tildeCount = (text.match(/~~/g) || []).length;
  if (tildeCount % 2 !== 0) {
    findings.push({
      rule: 'strikethrough-resolved',
      severity: 'error',
      message: `Unbalanced strikethrough markers (${tildeCount} occurrences of "~~") will render broken`,
    });
  }
  const danglingRe = /~~[^~\n]+~~\s*(?:[.\n]|$)/g;
  let m;
  while ((m = danglingRe.exec(text)) !== null) {
    findings.push({
      rule: 'strikethrough-resolved',
      severity: 'warning',
      message: `Strikethrough correction has no replacement text after it: "${m[0].trim()}"`,
      line: lineOf(text, m.index),
    });
  }
  return findings;
}

/** Staffing section must report counts, never a person's name. */
function checkStaffingNoNames(text, { knownNames = [] } = {}) {
  const section = text.split('## Staffing')[1];
  if (section === undefined) return []; // checkSectionOrder already flags a missing section
  const findings = [];
  for (const name of knownNames) {
    if (section.includes(name)) {
      findings.push({
        rule: 'staffing-no-names',
        severity: 'error',
        message: `Staffing section names an individual: "${name}"`,
      });
    }
  }
  return findings;
}

/**
 * Run every structural check against one compiled report.
 * @param {string} text - the full compiled report markdown.
 * @param {object} [opts]
 * @param {string[]} [opts.knownNames] - individual names to flag if found in Staffing.
 * @returns {{ ok: boolean, findings: Array }}
 */
function runAll(text, opts = {}) {
  const findings = [
    ...checkSectionOrder(text),
    ...checkInfrastructureHeadingLevel(text),
    ...checkInfrastructureNotTable(text),
    ...checkBadgeVocabulary(text),
    ...checkNoPlainTextStatus(text),
    ...checkNoPlaceholders(text),
    ...checkNoMetaCommentary(text),
    ...checkStrikethroughResolved(text),
    ...checkStaffingNoNames(text, opts),
  ];
  const ok = !findings.some((f) => f.severity === 'error');
  return { ok, findings };
}

module.exports = {
  runAll,
  checkSectionOrder,
  checkInfrastructureHeadingLevel,
  checkInfrastructureNotTable,
  checkBadgeVocabulary,
  checkNoPlainTextStatus,
  checkNoPlaceholders,
  checkNoMetaCommentary,
  checkStrikethroughResolved,
  checkStaffingNoNames,
  STATUS_WORDS,
  RISK_SEVERITY_WORDS,
  REQUIRED_SECTIONS_IN_ORDER,
};

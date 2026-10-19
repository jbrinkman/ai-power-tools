'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sentinel = require('./sentinel.js');

const FIXTURES = path.join(__dirname, 'fixtures');
const read = (name) => fs.readFileSync(path.join(FIXTURES, name), 'utf8');

describe('runAll — clean report', () => {
  test('a well-formed report passes with zero findings', () => {
    const text = read('report-clean.md');
    const { ok, findings } = sentinel.runAll(text, { knownNames: ['Dana Smith', 'Riley Chen'] });
    assert.equal(ok, true, `expected clean, got: ${JSON.stringify(findings, null, 2)}`);
    assert.deepEqual(findings, []);
  });

  test('a report using the real strikethrough date-correction idiom is NOT flagged', () => {
    // "~~Sep 30~~ Oct 13" is a VALID, deliberate house-style idiom (seen in real reports) —
    // the clean fixture includes one; this test exists specifically to prove the
    // strikethrough check does not false-positive on legitimate corrections.
    const text = read('report-clean.md');
    assert.match(text, /~~[^~]+~~\s+\S/, 'fixture should actually contain a resolved strikethrough correction');
    const findings = sentinel.checkStrikethroughResolved(text);
    assert.deepEqual(findings, []);
  });
});

describe('checkSectionOrder', () => {
  test('flags a missing ## Summary heading (the real defect caught during statusrpt-compile EDD)', () => {
    const text = read('report-defect-missing-summary.md');
    const findings = sentinel.checkSectionOrder(text);
    assert.ok(findings.some((f) => f.rule === 'section-order' && /## Summary/.test(f.message)));
  });

  test('flags sections present but out of order', () => {
    const text = read('report-defect-out-of-order.md');
    const findings = sentinel.checkSectionOrder(text);
    assert.ok(findings.some((f) => f.rule === 'section-order' && /not in house-style order/.test(f.message)));
  });
});

describe('checkInfrastructureHeadingLevel / checkInfrastructureNotTable', () => {
  test('flags Infrastructure rendered as a top-level ## section', () => {
    const text = read('report-defect-infra-top-level.md');
    const findings = sentinel.checkInfrastructureHeadingLevel(text);
    assert.ok(findings.some((f) => /top-level/.test(f.message)));
  });

  test('flags Infrastructure rendered as a markdown table', () => {
    const text = read('report-defect-infra-table.md');
    const findings = sentinel.checkInfrastructureNotTable(text);
    assert.ok(findings.some((f) => f.rule === 'infrastructure-not-table'));
  });

  test('does not flag a correctly-formatted ### Infrastructure bullet list', () => {
    const text = read('report-clean.md');
    assert.deepEqual(sentinel.checkInfrastructureHeadingLevel(text), []);
    assert.deepEqual(sentinel.checkInfrastructureNotTable(text), []);
  });
});

describe('checkBadgeVocabulary', () => {
  test('flags a plain-text status word rendered as if it were a badge class', () => {
    const text = read('report-defect-bad-badge.md');
    const findings = sentinel.checkBadgeVocabulary(text);
    assert.ok(findings.some((f) => f.rule === 'badge-vocabulary'));
  });

  test('accepts the risk-severity vocabulary (yellow=Low) as distinct from the status vocabulary', () => {
    // This is the exact case that was a false positive during statusrpt-compile's own
    // EDD (Iteration 3) until the sentinel/eval learned there are TWO vocabularies.
    const text = '<span class="yellow">Low</span> some risk bullet';
    assert.deepEqual(sentinel.checkBadgeVocabulary(text), []);
  });

  test('accepts every word in the status vocabulary with its matching class', () => {
    for (const [cls, words] of Object.entries(sentinel.STATUS_WORDS)) {
      for (const word of words) {
        const text = `<span class="${cls}">${word}</span>`;
        assert.deepEqual(sentinel.checkBadgeVocabulary(text), [], `${cls}/${word} should be valid`);
      }
    }
  });

  test('rejects a status word under the wrong class', () => {
    const text = '<span class="red">On Track</span>'; // On Track is green, not red
    const findings = sentinel.checkBadgeVocabulary(text);
    assert.ok(findings.length === 1);
  });
});

describe('checkNoPlainTextStatus', () => {
  test('flags ">Completed<" standing in for a badge', () => {
    const findings = sentinel.checkNoPlainTextStatus('Status: >Completed< this week');
    assert.ok(findings.some((f) => f.rule === 'no-plain-text-status'));
  });

  test('does not flag ordinary prose containing the word "completed"', () => {
    const findings = sentinel.checkNoPlainTextStatus('The migration was completed on time.');
    assert.deepEqual(findings, []);
  });
});

describe('checkNoPlaceholders', () => {
  test('flags TBD', () => {
    assert.ok(sentinel.checkNoPlaceholders('Target date: TBD').length > 0);
  });
  test('flags an unresolved mustache-style token', () => {
    assert.ok(sentinel.checkNoPlaceholders('Report date: {{report_date}}').length > 0);
  });
  test('flags <INSERT ...>', () => {
    assert.ok(sentinel.checkNoPlaceholders('<INSERT SUMMARY HERE>').length > 0);
  });
  test('does not flag clean prose', () => {
    assert.deepEqual(sentinel.checkNoPlaceholders('Everything shipped on schedule.'), []);
  });
});

describe('checkNoMetaCommentary', () => {
  test('flags an opening line narrating the task itself', () => {
    const text = 'The path in the request is relative to the evals directory, so I will look there.\n\n# Report';
    assert.ok(sentinel.checkNoMetaCommentary(text).length > 0);
  });
  test('does not flag a normal report opening', () => {
    const text = 'Hello everyone,\n\n# Acme Widgets Status Update 2099-01-12';
    assert.deepEqual(sentinel.checkNoMetaCommentary(text), []);
  });
});

describe('checkStrikethroughResolved', () => {
  test('flags unbalanced strikethrough markers', () => {
    const findings = sentinel.checkStrikethroughResolved('Final review ~~Sep 30 Oct 13');
    assert.ok(findings.some((f) => /Unbalanced/.test(f.message)));
  });

  test('flags a strikethrough correction left with nothing after it', () => {
    const findings = sentinel.checkStrikethroughResolved('Final review ~~Sep 30~~.');
    assert.ok(findings.some((f) => f.severity === 'warning' && /no replacement text/.test(f.message)));
  });

  test('does not flag a properly resolved correction', () => {
    const findings = sentinel.checkStrikethroughResolved('Final review ~~Sep 30~~ Oct 13');
    assert.deepEqual(findings, []);
  });
});

describe('checkStaffingNoNames', () => {
  test('flags a known individual name inside the Staffing section', () => {
    const text = '## Staffing\n\n- Dana Smith is leading the team\n- 5 of 6 developers';
    const findings = sentinel.checkStaffingNoNames(text, { knownNames: ['Dana Smith'] });
    assert.ok(findings.some((f) => f.rule === 'staffing-no-names'));
  });

  test('does not flag a name that only appears OUTSIDE the Staffing section', () => {
    const text = '## Last Week\'s Progress\n\nDana Smith shipped PR #1.\n\n## Staffing\n\n5 of 6 developers';
    const findings = sentinel.checkStaffingNoNames(text, { knownNames: ['Dana Smith'] });
    assert.deepEqual(findings, []);
  });

  test('passes clean when no known names are supplied', () => {
    const text = '## Staffing\n\n5 of 6 developers';
    assert.deepEqual(sentinel.checkStaffingNoNames(text, {}), []);
  });
});

describe('runAll — aggregation', () => {
  test('ok is false whenever any check returns an error-severity finding', () => {
    const text = read('report-defect-missing-summary.md');
    const { ok, findings } = sentinel.runAll(text);
    assert.equal(ok, false);
    assert.ok(findings.length > 0);
  });

  test('a warning-only finding (dangling strikethrough) does not flip ok to false', () => {
    const text = read('report-clean.md') + '\n\nUnrelated note ~~draft~~.';
    const { ok, findings } = sentinel.runAll(text);
    const warnings = findings.filter((f) => f.severity === 'warning');
    assert.ok(warnings.length > 0, 'expected the dangling strikethrough to be flagged as a warning');
    assert.equal(ok, true, 'a warning-only finding must not fail the gate');
  });
});

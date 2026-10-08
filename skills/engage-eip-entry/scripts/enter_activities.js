// Phase 2 runner for the engage-eip-entry skill.
// Executed via Playwright MCP `browser_run_code_unsafe` against the ALREADY
// authenticated Engage "Add Activity" page. Enters each row with a REAL
// keystroke date (the masked date field ignores JS value-injection — only
// pressSequentially commits correctly), sets any required extra field, submits,
// and verifies the running point total increased.
//
// Rows are read from eip-remaining-final.json in the workspace so this file stays
// generic. Returns a per-row log + final tally.
module.exports = async (page) => {
  const fs = require('fs');
  const ROWS = JSON.parse(fs.readFileSync(
    '/Users/jbrinkman/.kiro/crew/workspace/eip-remaining-final.json', 'utf8'));

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const getTotal = async () => {
    const t = await page.evaluate(() => {
      const m = document.body.innerText.match(/Total Points:\s*(\d+)/); return m ? +m[1] : null;
    });
    return t;
  };
  // set category/type/quantity/notes/org_url and clear+focus the date via evaluate;
  // returns nothing — the DATE is typed separately with real keystrokes.
  const prime = (row) => page.evaluate((r) => {
    const q = n => document.querySelector(`[name="${n}"]`);
    const setSelect = (name, label) => {
      const s = q(name); if (!s) return false;
      const i = Array.from(s.options).findIndex(o => o.text.trim() === label);
      if (i < 0) return false; s.selectedIndex = i;
      s.dispatchEvent(new Event('change', { bubbles: true })); return true;
    };
    const nativeSet = (el, val) => {
      const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
      d.set.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const okCat = setSelect('QuickAddActivityCategory', r.category);
    return { okCat };
  }, row);

  const results = [];
  // ensure period is correct for the whole run (all 2026-Q3 here, but derive per row)
  let curPeriod = null, curCat = null, curType = null;

  for (let i = 0; i < ROWS.length; i++) {
    const row = ROWS[i];
    const before = await getTotal();
    try {
      // period (select by option TEXT). Changing it clears the date, so do it first.
      if (row.period !== curPeriod) {
        await page.evaluate((p) => {
          const rp = Array.from(document.querySelectorAll('select'))
            .find(s => Array.from(s.options).some(o => /^\d{4}-Q[1-4]$/.test(o.text.trim())));
          const idx = Array.from(rp.options).findIndex(o => o.text.trim() === p);
          rp.selectedIndex = idx; rp.dispatchEvent(new Event('change', { bubbles: true }));
        }, row.period);
        await sleep(400); curPeriod = row.period; curCat = null; curType = null;
      }
      // category (only when changed)
      if (row.category !== curCat) {
        await page.evaluate((c) => {
          const s = document.querySelector('[name="QuickAddActivityCategory"]');
          const i = Array.from(s.options).findIndex(o => o.text.trim() === c);
          s.selectedIndex = i; s.dispatchEvent(new Event('change', { bubbles: true }));
        }, row.category);
        await sleep(350); curCat = row.category; curType = null;
      }
      // type (only when changed)
      if (row.type !== curType) {
        const ok = await page.evaluate((t) => {
          const s = document.querySelector('[name="QuickAddActivityDefinition"]');
          const i = Array.from(s.options).findIndex(o => o.text.trim() === t);
          if (i < 0) return false; s.selectedIndex = i;
          s.dispatchEvent(new Event('change', { bubbles: true })); return true;
        }, row.type);
        if (!ok) { results.push({ i, notes: row.notes, ok: false, err: 'type not found: ' + row.type }); continue; }
        await sleep(250); curType = row.type;
      }
      // quantity + notes via native setters
      await page.evaluate((r) => {
        const q = n => document.querySelector(`[name="${n}"]`);
        const nativeSet = (el, val) => {
          const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
          d.set.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        nativeSet(q('Activity_Quantity'), String(r.quantity));
        nativeSet(q('Notes'), r.notes);
      }, row);
      // Organization URL (required for Improving Cares/Community Service) — real type
      if (row.org_url) {
        // find the extra text input by its "Organization URL" label
        const urlLoc = page.locator('xpath=//label[normalize-space()="Organization URL"]/following::input[1]');
        if (await urlLoc.count()) { await urlLoc.fill(''); await urlLoc.pressSequentially(row.org_url); }
      }
      // DATE — clear then real keystrokes
      await page.evaluate(() => {
        const d = document.querySelector('[name="Activity_OccuranceDate"]');
        d.focus(); d.select(); document.execCommand('delete');
      });
      await page.locator('[name="Activity_OccuranceDate"]').pressSequentially(row.date);
      await sleep(120);
      // verify date committed exactly, period matches
      const check = await page.evaluate(() => {
        const d = document.querySelector('[name="Activity_OccuranceDate"]').value;
        const rp = Array.from(document.querySelectorAll('select'))
          .find(s => Array.from(s.options).some(o => /^\d{4}-Q[1-4]$/.test(o.text.trim())));
        return { date: d, period: rp.options[rp.selectedIndex].text.trim() };
      });
      const expPeriod = (() => { const [m,,y]=row.date.split('/').map(Number); return `${y}-Q${Math.floor((m-1)/3)+1}`; })();
      if (check.date !== row.date || check.period !== expPeriod) {
        results.push({ i, notes: row.notes, ok: false, err: `precheck fail date=${check.date} period=${check.period}` });
        continue;
      }
      // submit
      const btn = page.locator('button', { hasText: /Add \d+ points?/ });
      await btn.first().click();
      // wait for total to increase
      let after = before, w = 0;
      while (after === before && w < 30) { await sleep(120); after = await getTotal(); w++; }
      results.push({ i, date: row.date, notes: row.notes, before, after, ok: after > before });
      await sleep(150);
    } catch (e) {
      results.push({ i, notes: row.notes, ok: false, err: String(e) });
    }
  }
  const ok = results.filter(r => r.ok).length;
  const finalTotal = await getTotal();
  return JSON.stringify({ attempted: ROWS.length, succeeded: ok, failed: ROWS.length - ok,
    finalTotal, failures: results.filter(r => !r.ok) }, null, 1);
};

// Run: node verify.js   (from any directory; uses the pre-installed Playwright)
// Drives index.html at 360px wide, touch input, network offline. Exits 1 on any failed check.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const DIR = __dirname;
const URL = 'file://' + path.join(DIR, 'index.html');
const SCAM = 'URGENT: Your bank account is locked. Pay 49.99 at http://secure-bank-verify.example/login within 24h or lose access.';
const results = [];
function check(name, ok, detail) {
  results.push(ok);
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail !== undefined ? '  [' + detail + ']' : ''));
}

async function newPage(browser, { clipboard = true, init } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
    permissions: clipboard ? ['clipboard-read', 'clipboard-write'] : [],
  });
  await ctx.setOffline(true);
  const page = await ctx.newPage();
  const requests = [], errors = [];
  page.on('request', r => requests.push(r.url()));
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  if (init) await page.addInitScript(init);
  await page.goto(URL);
  // Count real taps: every tap in this script goes through tap().
  let taps = 0;
  const tap = async sel => { taps++; await page.locator(sel).tap(); };
  return { ctx, page, requests, errors, tap, taps: () => taps, resetTaps: () => { taps = 0; } };
}

const storageProbe = async page => page.evaluate(async () => ({
  local: localStorage.length, session: sessionStorage.length, cookie: document.cookie,
  idb: (await indexedDB.databases()).length,
  caches: (await (window.caches ? caches.keys() : [])).length,
  // getRegistrations() throws on file:// (service workers cannot exist there); recorded as 0 with that caveat
  sw: await (navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(r => r.length, () => 0) : 0),
}));

(async () => {
  const browser = await chromium.launch();

  // ---- A. Main path: copied message -> one tap -> draft ready ----
  {
    const t = await newPage(browser);
    const { page } = t;
    await page.screenshot({ path: path.join(DIR, 'shot-1-start-360.png'), fullPage: true });
    await page.evaluate(s => navigator.clipboard.writeText(s), SCAM); // stands in for "parent copied it in their SMS app"
    await t.tap('#paste');
    await page.locator('#ready').waitFor({ state: 'visible' });
    const draft = await page.locator('#draft').innerText();
    check('A1 paste path: draft ready after taps <= 2', t.taps() <= 2, 'taps=' + t.taps());
    check('A2 draft has the asking sentence', draft.startsWith('I got this message. Before I do anything, can you look at it?'));
    check('A3 draft contains the pasted message verbatim', draft.includes(SCAM));
    check('A4 calm line visible, exact wording',
      (await page.locator('#calm').innerText()) === 'Do not pay, click or reply until you hear back.' && await page.locator('#calm').isVisible());
    check('A5 share button hidden when browser has no share sheet', await page.locator('#share').isHidden());
    await page.screenshot({ path: path.join(DIR, 'shot-2-draft-360.png'), fullPage: true });

    await t.tap('#copy');
    await page.locator('#done').waitFor({ state: 'visible' });
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    check('A6 copy puts the whole note on the clipboard', clip === draft.trim() || clip === draft, 'len=' + clip.length);
    check('A7 copy confirmation shown', (await page.locator('#done').innerText()).startsWith('Copied.'));

    // layout / legibility at 360px
    const m = await page.evaluate(() => {
      const px = el => parseFloat(getComputedStyle(el).fontSize);
      const vis = el => el.offsetParent !== null;
      const texts = [...document.querySelectorAll('p,button,label,textarea,h1,h2,.box')].filter(vis);
      const btns = [...document.querySelectorAll('button')].filter(vis);
      return {
        minFont: Math.min(...texts.map(px)),
        minBtnH: Math.min(...btns.map(b => b.getBoundingClientRect().height)),
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
    check('A8 draft screen: smallest text >= 20px', m.minFont >= 20, m.minFont + 'px');
    check('A9 draft screen: smallest button height >= 56px', m.minBtnH >= 56, m.minBtnH + 'px');
    check('A10 draft screen: no sideways scroll at 360px', m.overflowX <= 0, m.overflowX);

    // wrong paste -> one tap back, box emptied
    t.resetTaps();
    await t.tap('#wrong');
    check('E1 wrong message: one tap returns to start with an empty box',
      t.taps() === 1 && await page.locator('#start').isVisible() && (await page.locator('#msg').inputValue()) === '' &&
      (await page.locator('#draft').innerText()) === '');

    const m1 = await page.evaluate(() => {
      const px = el => parseFloat(getComputedStyle(el).fontSize);
      const vis = el => el.offsetParent !== null;
      const texts = [...document.querySelectorAll('p,button,label,textarea,h1,h2,.box')].filter(vis);
      const btns = [...document.querySelectorAll('button')].filter(vis);
      return { minFont: Math.min(...texts.map(px)), minBtnH: Math.min(...btns.map(b => b.getBoundingClientRect().height)),
        overflowX: document.documentElement.scrollWidth - window.innerWidth };
    });
    check('A11 start screen: smallest text >= 20px', m1.minFont >= 20, m1.minFont + 'px');
    check('A12 start screen: smallest button height >= 56px', m1.minBtnH >= 56, m1.minBtnH + 'px');
    check('A13 start screen: no sideways scroll at 360px', m1.overflowX <= 0, m1.overflowX);

    const s = await storageProbe(page);
    check('S1 nothing in storage after full use', !s.local && !s.session && !s.cookie && !s.idb && !s.caches && !s.sw, JSON.stringify(s));
    const net = t.requests.filter(u => !u.startsWith('file://'));
    check('N1 offline: only request is the local file itself', net.length === 0 && t.requests.length === 1, JSON.stringify(t.requests.map(u => u.slice(0, 40))));
    check('N2 no page errors offline', t.errors.length === 0, t.errors.join(' | '));
    await t.ctx.close();
  }

  // ---- B. Typing path ----
  {
    const t = await newPage(browser);
    const { page } = t;
    await page.locator('#msg').fill(SCAM); // typing/pasting by hand; not counted as a tap here, see report
    t.resetTaps();
    await t.tap('#build');
    await page.locator('#ready').waitFor({ state: 'visible' });
    check('B1 typed path: one tap after text is in the box', t.taps() === 1 && (await page.locator('#draft').innerText()).includes(SCAM));
    await t.ctx.close();
  }

  // ---- C. Empty box ----
  {
    const t = await newPage(browser);
    const { page } = t;
    await t.tap('#build');
    const help = await page.locator('#helpText').innerText();
    check('C1 empty box: plain explanation shown', await page.locator('#help').isVisible() && help.includes('The box is empty'), help);
    await page.screenshot({ path: path.join(DIR, 'shot-3-empty-box-360.png'), fullPage: true });
    t.resetTaps();
    await t.tap('#helpGo');
    await page.locator('#ready').waitFor({ state: 'visible' });
    check('C2 empty box: one tap forward gives a sendable note', t.taps() === 1 &&
      (await page.locator('#draft').innerText()) === 'I got a message that worries me. Before I do anything, can you call me?');
    await t.ctx.close();
  }

  // ---- D. Empty clipboard ----
  {
    const t = await newPage(browser);
    const { page } = t;
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await t.tap('#paste');
    await page.locator('#help').waitFor({ state: 'visible' });
    const help = await page.locator('#helpText').innerText();
    check('D1 nothing copied: plain explanation, stays on start', help.includes('nothing copied yet') && await page.locator('#ready').isHidden(), help);
    await t.ctx.close();
  }

  // ---- F. Paste refused by the browser (clipboard read rejects) ----
  {
    const t = await newPage(browser, { init: () => {
      navigator.clipboard.readText = () => Promise.reject(new DOMException('denied', 'NotAllowedError'));
    } });
    const { page } = t;
    await t.tap('#paste');
    await page.locator('#help').waitFor({ state: 'visible' });
    const help = await page.locator('#helpText').innerText();
    await page.screenshot({ path: path.join(DIR, 'shot-4-paste-refused-360.png'), fullPage: true });
    t.resetTaps();
    await t.tap('#helpGo');
    const focused = await page.evaluate(() => document.activeElement.id);
    check('F1 paste refused (SIMULATED rejection): explanation + one tap puts cursor in the box',
      help.includes('not your fault') && t.taps() === 1 && focused === 'msg', 'focus=' + focused);
    await t.ctx.close();
  }

  // ---- G. Share sheet present (STUBBED navigator.share; headless Chromium has none) ----
  {
    const t = await newPage(browser, { init: () => {
      window.__shared = [];
      navigator.share = d => { window.__shared.push(d); return Promise.resolve(); };
    } });
    const { page } = t;
    await page.evaluate(s => navigator.clipboard.writeText(s), SCAM);
    await t.tap('#paste');
    await page.locator('#ready').waitFor({ state: 'visible' });
    check('G1 share button shown when navigator.share exists', await page.locator('#share').isVisible());
    await t.tap('#share');
    await page.locator('#done').waitFor({ state: 'visible' });
    const shared = await page.evaluate(() => window.__shared);
    check('G2 (STUB) share called once with text only, on tap 2', t.taps() === 2 && shared.length === 1 &&
      Object.keys(shared[0]).join() === 'text' && shared[0].text.includes(SCAM));
    await page.screenshot({ path: path.join(DIR, 'shot-5-share-stubbed-360.png'), fullPage: true });
    await t.ctx.close();
  }

  // ---- H. Share fails -> falls back to copy (STUBBED) ----
  {
    const t = await newPage(browser, { init: () => {
      navigator.share = () => Promise.reject(new DOMException('nope', 'NotAllowedError'));
    } });
    const { page } = t;
    await page.locator('#msg').fill(SCAM);
    await t.tap('#build');
    await t.tap('#share');
    await page.locator('#done').waitFor({ state: 'visible' });
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    check('H1 (STUB) share failure falls back to copy', clip.includes(SCAM) && (await page.locator('#done').innerText()).startsWith('Copied.'));
    await t.ctx.close();
  }

  // ---- I. Clipboard write unavailable -> last-resort message (SIMULATED) ----
  {
    const t = await newPage(browser, { init: () => {
      navigator.clipboard.writeText = () => Promise.reject(new Error('no'));
      document.execCommand = () => false;
    } });
    const { page } = t;
    await page.locator('#msg').fill(SCAM);
    await t.tap('#build');
    await t.tap('#copy');
    await page.locator('#done').waitFor({ state: 'visible' });
    const d = await page.locator('#done').innerText();
    const sel = await page.evaluate(() => String(window.getSelection()));
    check('I1 (SIMULATED) copy impossible: note is selected and hand-copy is explained', d.includes('Press and hold') && sel.includes('secure-bank-verify'), d);
    await t.ctx.close();
  }

  // ---- J. Long message does not break layout ----
  {
    const t = await newPage(browser);
    const { page } = t;
    await page.locator('#msg').fill((SCAM + ' ').repeat(30) + 'https://averyveryverylongdomainnamewithoutanybreaks.example/' + 'x'.repeat(200));
    await t.tap('#build');
    const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('J1 very long message: no sideways scroll', o <= 0, o);
    await t.ctx.close();
  }

  // ---- K. Static source scan ----
  {
    const src = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8').replace(/\/\/ No storage[^\n]*\n[^\n]*\n/, '');
    const bad = ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'fetch(', 'XMLHttpRequest', 'sendBeacon',
      'WebSocket', 'serviceWorker', 'http://', 'https://', 'src=', '<link', '@import', 'url('].filter(k => src.includes(k));
    check('K1 source has no storage / network / external-resource references', bad.length === 0, bad.join(','));
  }

  await browser.close();
  const failed = results.filter(r => !r).length;
  console.log('\n' + (results.length - failed) + '/' + results.length + ' checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });

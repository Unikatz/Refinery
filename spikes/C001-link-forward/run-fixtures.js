// Runs every fixture through the real page at 360px wide, offline. No installs, no network.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const dir = __dirname;
const data = JSON.parse(fs.readFileSync(path.join(dir, 'fixtures.json'), 'utf8'));
const pageUrl = 'file://' + path.join(dir, 'index.html');
const JARGON = /\b(urls?|domains?|subdomains?|punycode|ip address|hostname|tld|phishing|unicode|redirect)\b/i;
const SAFEISH = /\b(safe|safely|secure|secured|trusted|trustworthy|legit|legitimate|genuine|verified|harmless|fine|okay|ok|clean|all clear|no problem|no risk)\b/i;

// Rough read-aloud estimate: syllables at 4 per second (a slow, clear reading). An estimate, not a measurement.
function syllables(sentence) {
  const spoken = sentence.replace(/(\w)\.(\w)/g, '$1 dot $2').replace(/(\w)\.(\w)/g, '$1 dot $2').replace(/-/g, ' ').replace(/[^a-zA-Z' ]/g, ' ');
  let n = 0;
  for (const w of spoken.split(/\s+/).filter(Boolean)) {
    const lw = w.toLowerCase();
    if (!/[aeiouy]/.test(lw)) { n += lw.length; continue; }           // spelled out, e.g. "xyz"
    let c = (lw.replace(/e$/, '').match(/[aeiouy]+/g) || []).length;
    n += Math.max(1, c);
  }
  return n;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await ctx.setOffline(true);
  const page = await ctx.newPage();
  const requests = [], errors = [];
  page.on('request', r => requests.push(r.url()));
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(pageUrl);

  async function pasteAndRead(input) {
    await page.evaluate(() => { document.getElementById('box').value = ''; document.getElementById('out').replaceChildren(); });
    // Path under test: a paste into the box (what the phone's "Paste" does). The page answers with no further tap.
    await page.evaluate((text) => {
      const dt = new DataTransfer(); dt.setData('text', text);
      document.getElementById('box').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    }, input);
    return page.evaluate(() => {
      const out = document.getElementById('out');
      const cards = [...out.querySelectorAll('.card')].map(c => ({
        level: c.classList.contains('warn') ? 'warn' : 'unknown',
        headline: c.querySelector('.headline').innerText, why: c.querySelector('.why').innerText,
        next: c.querySelector('.next').innerText, tag: c.querySelector('.tag').innerText }));
      const prob = out.querySelector('#problem');
      const clone = out.cloneNode(true); clone.querySelectorAll('.shown').forEach(n => n.remove());
      return { cards, problem: prob ? { headline: prob.querySelector('.headline').innerText, buttons: prob.querySelectorAll('button').length } : null,
               textNoEcho: clone.innerText, overflow: document.documentElement.scrollWidth > window.innerWidth,
               anchors: out.querySelectorAll('a').length, buttons: out.querySelectorAll('button').length };
    });
  }

  function judge(f, r) {
    const actual = r.problem ? [r.problem.headline] : r.cards.map(c => c.headline);
    const levels = r.cards.map(c => c.level);
    const wantLevels = f.kind ? [] : [].concat(f.level);
    const checks = {
      reading: JSON.stringify(actual) === JSON.stringify(f.expect),
      level: f.kind ? !!r.problem : JSON.stringify(levels) === JSON.stringify(wantLevels),
      noJargon: !JARGON.test(r.textNoEcho),
      // strip the address-like words before looking for "safe"-type wording, so "secure-login.xyz" itself is not counted
      neverSafe: !SAFEISH.test(r.textNoEcho.replace(/[\w-]+(\.[\w-]+)+/g, ' ')),
      nextStep: r.problem ? r.problem.buttons === 1 : r.cards.every(c => /What to do next/.test(c.next) && c.next.length > 40),
      unknownWording: r.cards.every(c => c.level !== 'unknown' || /Nothing obviously wrong, but I can't confirm it\./.test(c.why)),
      oneSentence: actual.every(h => (h.match(/[.!?](\s|$)/g) || []).length === 1),
      noSideScroll: !r.overflow, notTappable: r.anchors === 0, wayForward: r.buttons >= 1
    };
    const secs = actual.map(h => +(syllables(h) / 4).toFixed(1));
    checks.under5s = secs.every(s => s < 5);
    return { id: f.id, input: f.input, expected: f.expect, actual, levels, estSeconds: secs, checks, pass: Object.values(checks).every(Boolean) };
  }

  const results = [], stress = [];
  for (const f of data.fixtures) results.push(judge(f, await pasteAndRead(f.input)));
  for (const f of data.stress_not_in_pass_set) stress.push(judge(f, await pasteAndRead(f.input)));

  // Screenshots
  const shot = async (input, name) => { await pasteAndRead(input); await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: path.join(dir, name), fullPage: true }); };
  await shot(data.fixtures[3].input, 'shot-warn-360.png');
  await shot(data.fixtures[14].input, 'shot-cant-confirm-360.png');
  await shot(data.fixtures[16].input, 'shot-no-link-360.png');
  await shot(data.fixtures[19].input, 'shot-three-links-360.png');

  // Recovery paths (real taps)
  const recovery = {};
  await page.evaluate(() => { document.getElementById('box').value = ''; document.getElementById('out').replaceChildren(); });
  await page.tap('#checkBtn');
  recovery.emptyExplained = await page.innerText('#problem .headline');
  await page.fill('#box', 'see you at 5');
  await page.tap('#checkBtn');
  recovery.noLinkExplained = await page.innerText('#problem .headline');
  await page.tap('#problem button');                       // one tap: "Try again"
  recovery.afterTryAgain = await page.evaluate(() => ({ boxEmpty: document.getElementById('box').value === '', outEmpty: document.getElementById('out').children.length === 0, focused: document.activeElement.id }));
  await page.fill('#box', 'https://bit.ly/abc123'); await page.tap('#checkBtn');
  await page.tap('#out > button');                         // one tap: "Check another message"
  recovery.afterCheckAnother = await page.evaluate(() => ({ boxEmpty: document.getElementById('box').value === '', outEmpty: document.getElementById('out').children.length === 0 }));

  // Tap targets
  const targets = await page.evaluate(() => [...document.querySelectorAll('button, textarea')].map(b => { const r = b.getBoundingClientRect(); return { what: b.id || b.textContent, w: Math.round(r.width), h: Math.round(r.height) }; }));

  // One-tap path: the "Paste and check" button reading the phone clipboard.
  const oneTap = {};
  try {
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.evaluate(() => navigator.clipboard.writeText('Hello, pay at https://paypal.com.account-check.example/login'));
    await page.evaluate(() => { document.getElementById('box').value = ''; document.getElementById('out').replaceChildren(); });
    await page.tap('#pasteBtn');
    await page.waitForSelector('#out .card, #out #problem', { timeout: 3000 });
    oneTap.tapsUsed = 1;
    oneTap.result = await page.evaluate(() => (document.querySelector('#out .headline') || {}).innerText);
  } catch (e) { oneTap.error = String(e).split('\n')[0]; }
  // Same button with clipboard permission refused
  const denied = {};
  try {
    const ctx2 = await browser.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });
    await ctx2.setOffline(true);
    const p2 = await ctx2.newPage(); await p2.goto(pageUrl);
    await p2.tap('#pasteBtn');
    await p2.waitForSelector('#out .card, #out #problem', { timeout: 3000 });
    denied.result = await p2.innerText('#out .headline');
    await ctx2.close();
  } catch (e) { denied.error = String(e).split('\n')[0]; }

  // Storage and network
  const storage = await page.evaluate(async () => ({
    localStorage: (() => { try { return localStorage.length; } catch (e) { return 'unavailable'; } })(),
    sessionStorage: (() => { try { return sessionStorage.length; } catch (e) { return 'unavailable'; } })(),
    cookie: document.cookie,
    indexedDB: await (async () => { try { return (await indexedDB.databases()).length; } catch (e) { return 'unavailable'; } })(),
    caches: await (async () => { try { return (await caches.keys()).length; } catch (e) { return 'unavailable'; } })(),
    serviceWorkers: await (async () => { try { return (await navigator.serviceWorker.getRegistrations()).length; } catch (e) { return 'unavailable'; } })(),
    online: navigator.onLine
  }));
  const cookies = await ctx.cookies();
  const src = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const sourceScan = { fetch: /\bfetch\s*\(/.test(src), xhr: /XMLHttpRequest/.test(src), beacon: /sendBeacon/.test(src), ws: /WebSocket/.test(src),
    storageApis: /localStorage|sessionStorage|indexedDB|document\.cookie/.test(src), externalRefs: /(src|href)\s*=\s*["']/.test(src) };

  const report = { ranAt: new Date().toISOString(), viewport: '360x740, touch, offline', passSet: { total: results.length, passed: results.filter(r => r.pass).length },
    results, stress, recovery, targets, oneTap, denied, storage, contextCookies: cookies.length,
    requests, nonFileRequests: requests.filter(u => !u.startsWith('file://')), pageErrors: errors, sourceScan };
  fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify(report, null, 2));

  for (const r of results) console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + ' | ' + r.actual.join(' / ') + ' | ~' + r.estSeconds.join(',') + 's' + (r.pass ? '' : ' | failed: ' + Object.keys(r.checks).filter(k => !r.checks[k]).join(',') + ' | expected: ' + r.expected.join(' / ')));
  console.log('--- stress (not in pass set) ---');
  for (const r of stress) console.log((r.pass ? 'as-expected ' : 'DIFFERS ') + r.id + ' | ' + r.actual.join(' / ') + ' | ~' + r.estSeconds.join(',') + 's' + (r.pass ? '' : ' | failed: ' + Object.keys(r.checks).filter(k => !r.checks[k]).join(',')));
  console.log(JSON.stringify({ passSet: report.passSet, recovery, targets, oneTap, denied, storage, cookies: cookies.length, requests, pageErrors: errors, sourceScan }, null, 1));
  await browser.close();
})().catch(e => { console.error('RUN FAILED', e); process.exit(1); });

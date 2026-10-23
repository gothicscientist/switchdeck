// The finder must paint and take an answer before the parts catalog has arrived, and every view that needs the catalog
// must wait for it instead of breaking. Run with npm run test:boot (needs Playwright, like npm run test:ui).
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const {chromium} = createRequire(import.meta.url)('playwright');
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const dist = await mkdtemp(path.join(tmpdir(), 'thock-dist-'));
execFileSync(process.execPath, [path.join(root, 'scripts/stage-site.mjs')], {cwd: root, env: {...process.env, THOCK_DIST: dist}, stdio: 'pipe'});
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'};
const origin = 'http://thock.test';
const browser = await chromium.launch({headless:true, ...(process.env.THOCK_BROWSER_EXECUTABLE ? {executablePath:process.env.THOCK_BROWSER_EXECUTABLE} : {})});
const failures = [];
async function check(name, fn) {
  const context = await browser.newContext({viewport:{width:1280,height:800}});
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let release; const gate = new Promise(r => {release = r}); const asked = [];
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    const pathname = decodeURIComponent(url.pathname);
    // The big catalog files arrive only when the test lets them.
    if (/\/data\/catalog-(cases|switches|keycaps|parts)\.json$/.test(pathname)) {asked.push(pathname); await gate}
    const file = path.resolve(dist, '.' + (pathname === '/' ? '/index.html' : !path.extname(pathname) ? '/' + (pathname.slice(1) || 'index') + '.html' : pathname));
    if (!file.startsWith(dist + path.sep)) return route.fulfill({status:403,body:''});
    try {await route.fulfill({contentType:types[path.extname(file)]||'application/octet-stream', body:await readFile(file)})}
    catch {await route.fulfill({status:404,body:'Not found'})}
  });
  try {await fn({page, release, asked, origin}); assert.deepEqual(errors, [], 'page errors'); console.log('PASS: ' + name)}
  catch (e) {failures.push(name); console.error('FAIL: ' + name + '\n' + (e.stack || e))}
  finally {release(); await context.close()}
}

await check('the finder paints, shows its field and takes an answer while the catalog is still loading', async ({page, release, asked}) => {
  await page.goto(origin + '/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#qcard .opt');
  assert.ok(await page.evaluate(() => typeof FULL !== 'undefined' && FULL === false), 'the catalog has not arrived yet');
  assert.equal(await page.locator('#qcard .opt').first().isDisabled(), false);
  await page.waitForFunction(() => document.querySelectorAll('#field .fitem.feat').length >= 3);
  assert.ok(Number((await page.locator('#qcount b').textContent()).replace(/\D/g, '')) > 0 || /[\d,.]+/.test(await page.locator('#qcount b').textContent()), 'a combination count is shown');
  const title = await page.locator('#quiz-title').textContent();
  await page.locator('#qcard .opt').first().click();
  assert.equal(await page.locator('#qcard .opt').first().getAttribute('aria-pressed'), 'true', 'the pressed option shows at once');
  await page.waitForTimeout(700);
  assert.equal(await page.locator('#quiz-title').textContent(), title, 'the card waits for the catalog');
  release();
  await page.waitForFunction(t => document.querySelector('#quiz-title').textContent !== t, title, {timeout:20000});
  assert.ok(await page.evaluate(() => FULL === true));
  assert.equal(asked.length, 4);
  await page.waitForFunction(() => document.querySelectorAll('#field .fitem.feat').length >= 3);
});
await check('the field is the same boards before and after the catalog arrives', async ({page, release}) => {
  await page.goto(origin + '/', {waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => document.querySelectorAll('#field .fitem.feat').length >= 3);
  const feat = () => page.evaluate(() => [...document.querySelectorAll('#field .fitem:not(.gone):not(.hidden-slot)')].map(e => e.getAttribute('aria-label')).sort().join('|'));
  const before = await feat();
  release();
  await page.waitForFunction(() => FULL === true);
  await page.waitForTimeout(1500);
  assert.equal(await feat(), before);
});
for (const [view, shown, ready] of [
  ['/build', '#view-build', () => document.getElementById('stageboard').innerHTML.length > 0 && !!document.getElementById('buildname').value],
  ['/saved', '#view-saved', () => !document.getElementById('view-saved').hidden]]) {
  await check(view + ' opened directly waits for the catalog and then shows', async ({page, release}) => {
    await page.goto(origin + view, {waitUntil:'domcontentloaded'});
    await page.waitForTimeout(500);
    assert.ok(await page.evaluate(() => FULL === false), 'the catalog has not arrived yet');
    release();
    await page.waitForFunction(() => FULL === true);
    await page.waitForFunction(ready, null, {timeout:20000});
    assert.equal(await page.locator(shown).isVisible(), true);
    assert.equal(new URL(page.url()).pathname, view);
  });
}
await check('a share link opened before the catalog arrives shows its build once it has', async ({page, release}) => {
  // Make a code from a real build first (the catalog is released for this page only).
  release();
  await page.goto(origin + '/', {waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => FULL === true);
  const url = await page.evaluate(() => {const b = {...build}; if (!b.case) {const c = FINDER_CASES[0]; b.case = c.id} return shareUrl(b)});
  assert.match(url, /\?b=/);
  const held = await browser.newContext({viewport:{width:1280,height:800}}), p2 = await held.newPage(), errors = [];
  p2.on('pageerror', e => errors.push(e.message));
  let open; const gate = new Promise(r => {open = r});
  await p2.route('**/*', async route => {
    const u = new URL(route.request().url()); if (u.origin !== origin) return route.abort();
    if (/\/data\/catalog-(cases|switches|keycaps|parts)\.json$/.test(u.pathname)) await gate;
    const pathname = u.pathname, file = path.resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname));
    try {await route.fulfill({contentType:types[path.extname(file)]||'application/octet-stream', body:await readFile(file)})} catch {await route.fulfill({status:404,body:''})}
  });
  await p2.goto(origin + '/' + url.slice(url.indexOf('?')), {waitUntil:'domcontentloaded'});
  await p2.waitForTimeout(500);
  assert.equal(await p2.evaluate(() => document.getElementById('results').hidden), true, 'results wait for the catalog');
  open();
  await p2.waitForFunction(() => !document.getElementById('results').hidden, null, {timeout:20000}).catch(async e => {throw Error(e.message + ' url=' + url + ' now=' + p2.url() + ' toast=' + await p2.locator('.toast, #toast').allTextContents() + ' errs=' + errors)});
  assert.equal(new URL(p2.url()).search, url.slice(url.indexOf('?')), 'the share link stays in the address bar');
  assert.deepEqual(errors, []);
  await held.close();
});
await check('the directory loads its own script only when asked for', async ({page, release}) => {
  await page.goto(origin + '/', {waitUntil:'domcontentloaded'});
  release();
  await page.waitForFunction(() => FULL === true);
  assert.equal(await page.evaluate(() => !!window.SwitchdeckDirectory), false);
  await page.locator('#nav-directory').click();
  await page.waitForFunction(() => !!window.SwitchdeckDirectory, null, {timeout:20000});
  assert.equal(new URL(page.url()).pathname, '/directory');
});
await browser.close();
await rm(dist, {recursive:true, force:true});
if (failures.length) {console.error('\n' + failures.length + ' failed'); process.exit(1)}

// Run with npm run test:ui after npm ci and npx playwright install chromium.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const {chromium} = createRequire(import.meta.url)('playwright');
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const results = path.join(root, 'test-results/ui');
await mkdir(results, {recursive:true});
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    // Like the deployed site, an extensionless view path (/build) serves a copy of the page.
    const file = path.resolve(root, '.' + (pathname === '/' || !path.extname(pathname) ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) {res.writeHead(403).end(); return}
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch {res.writeHead(404).end('Not found')}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless:true, ...(process.env.THOCK_BROWSER_EXECUTABLE ? {executablePath:process.env.THOCK_BROWSER_EXECUTABLE} : {})});
const context = await browser.newContext({viewport:{width:1440,height:900}});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const fixture = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240"><rect x="30" y="30" width="540" height="180" rx="14" fill="#78716c"/></svg>';
let releaseImages;
const imageGate = new Promise(resolve => {releaseImages = resolve});
const routeHandler = async route => {
  if (route.request().url().startsWith(origin)) {
    // Fulfill from disk as well: this also works in browser sandboxes that block loopback networking.
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    // Like the deployed site, an extensionless view path (/build) serves a copy of the page.
    const file = path.resolve(root, '.' + (pathname === '/' || !path.extname(pathname) ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) return route.fulfill({status:403,body:''});
    try {return await route.fulfill({contentType:types[path.extname(file)]||'application/octet-stream',body:await readFile(file)})}
    catch {return route.fulfill({status:404,body:'Not found'})}
  }
  if (route.request().resourceType() === 'image') {
    if (route.request().url().includes('broken-image')) return route.abort();
    await imageGate;
    return route.fulfill({contentType:'image/svg+xml', body:fixture});
  }
  return route.abort(); // Fonts and retailer networking are irrelevant to these behavioral checks.
};
await context.route('**/*',routeHandler);
const step = n => page.waitForFunction(n => quizStep === n, n);
const state = () => page.evaluate(() => ({step:quizStep, answers:{...quizAns}}));
const choose = async (value, next) => {
  await page.locator(`#qcard .opt[data-v="${value}"]`).click();
  await step(next);
};
const sameBox = (a,b) => {
  for (const key of ['x','y','width','height']) assert.ok(Math.abs(a[key]-b[key]) < 1, `${key}: ${a[key]} -> ${b[key]}`);
};
const layoutBox = locator => locator.evaluate(el=>({x:el.offsetLeft,y:el.offsetTop,width:el.offsetWidth,height:el.offsetHeight}));

try {
  await page.goto(origin, {waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => document.querySelectorAll('.fitem.feat .pf.pending').length === 3);
  // Let the existing one-time field entrance finish, without releasing product photos.
  await page.waitForTimeout(1500);
  const firstPhoto = page.locator('.fitem.feat .pf').first();
  const pendingBox = await firstPhoto.boundingBox();
  assert.ok(pendingBox.width > 70 && pendingBox.height > 20);
  releaseImages();
  await page.waitForFunction(() => !document.querySelector('.fitem.feat .pf.pending'));
  sameBox(pendingBox, await firstPhoto.boundingBox());
  console.log('PASS: slow product images reserve their final dimensions');

  // A load failure must use the illustration without changing the product's frame.
  const box = await page.evaluate(() => {
    const host = document.createElement('div'); host.id='image-probe';host.style.cssText='position:fixed;top:80px;left:0;width:280px';
    host.innerHTML=framedPhoto({img:'https://images.test/broken-image.svg',box:[0,0,100,100],ar:2.8},'Test keyboard',buildBoard(build));
    document.body.append(host);const r=host.firstElementChild.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};
  });
  await page.waitForFunction(() => document.querySelector('#image-probe .pf.err'));
  sameBox(box, await page.locator('#image-probe .pf').boundingBox());
  assert.equal(await page.locator('#image-probe .pf-alt').isVisible(), true);
  await page.locator('#image-probe').evaluate(el => el.remove());
  console.log('PASS: broken product images use an illustration with no layout shift');

  await page.keyboard.press('Control+2');
  await page.keyboard.press('Alt+2');
  await page.keyboard.press('Shift+2');
  assert.equal((await state()).step,0);
  assert.deepEqual((await state()).answers,{});
  await page.evaluate(()=>{const input=document.createElement('div');input.id='editing-probe';input.contentEditable='true';document.body.append(input);input.focus()});
  await page.keyboard.press('1');await page.keyboard.press('Backspace');
  assert.deepEqual((await state()).answers,{});
  await page.locator('#editing-probe').evaluate(el=>el.remove());
  // 75% skips the 60% layout question (step 1), forward and back.
  await page.keyboard.press('4'); await step(2);
  await page.keyboard.press('1');
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(420);
  assert.equal((await state()).step,0,'Back cancels the pending answer advance');
  assert.equal((await state()).answers.feel,'Linear');
  await page.keyboard.press('Enter'); await step(2);
  assert.equal(await page.locator('.opt[data-v="Linear"]').getAttribute('aria-pressed'),'true');
  await page.keyboard.press('Enter'); await step(3);
  await choose('thock',4);
  await choose('surprise',5);
  await choose('any',6);
  await choose('any',7);
  await choose('either',8);
  const budget = page.locator('#btrack');
  await budget.focus();
  await page.keyboard.press('Control+ArrowLeft');
  assert.equal((await state()).answers.budget,300);
  await page.keyboard.press('ArrowLeft');
  assert.equal((await state()).answers.budget,290);
  await page.locator('#nolimit').click();
  assert.equal(await budget.getAttribute('aria-valuetext'),'No limit');
  await budget.focus();await page.keyboard.press('Enter');await step(9);
  const complete = (await state()).answers;
  const original = await page.evaluate(() => evalAns(quizAns).list[0].b);
  for (let i=8;i>=0;i--) {if(i===1) continue; await page.keyboard.press('Backspace');await step(i)}
  assert.deepEqual((await state()).answers,complete);
  // 60% asks which 60% layout; changing the size away from 60% drops that answer again.
  await choose('60',1);
  await choose('hhkb',2);
  assert.equal(await page.evaluate(() => evalAns(quizAns).list.every(r=>caseOf(r.b).layout==='60')),true);
  for (let i=1;i>=0;i--) {await page.keyboard.press('Backspace');await step(i)}
  await choose('65',2);
  assert.deepEqual((await state()).answers,{...complete,layout:'65'});
  assert.equal(await page.evaluate(() => evalAns(quizAns).list.every(r=>caseOf(r.b).layout==='65')),true);
  assert.notEqual(await page.evaluate(() => evalAns(quizAns).list[0].b.case),original.case);
  await page.reload({waitUntil:'domcontentloaded'});await step(2);
  assert.deepEqual((await state()).answers,{...complete,layout:'65'});
  console.log('PASS: quiz keyboard controls, answer preservation, refreshed recommendations and reload persistence');

  // Open results through the UI, check focus containment and Escape restoration.
  await page.evaluate(() => moveQuiz(QUESTIONS.length));
  await page.locator('#viewmatches').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id),'rclose');
  assert.equal(await page.locator('main').getAttribute('inert'),'');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => !!document.activeElement.closest('#results')),true);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => !!document.activeElement.closest('#results')),true);
  await page.evaluate(() => Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedText=text}}}));
  const copyBox=await layoutBox(page.locator('#rcopy'));
  await page.locator('#rcopy').click();
  await page.waitForFunction(() => document.querySelector('#rcopy').textContent==='Copied');
  sameBox(copyBox,await layoutBox(page.locator('#rcopy')));
  assert.ok((await page.evaluate(() => window.copiedText)).includes('https://'));
  const exactBuild=await page.evaluate(()=>buildKey(resView(resList[resIdx]).b));
  await page.locator('#rshare').click();
  await page.waitForFunction(()=>document.getElementById('rshare').classList.contains('copied'));
  const shareURL=await page.evaluate(()=>window.copiedText);
  assert.match(shareURL,/^http:\/\/127\.0\.0\.1:\d+\/\?b=2\.[^#]+$/);
  const sharePage=await context.newPage();
  sharePage.on('pageerror',error=>errors.push(error.message));
  await sharePage.goto(shareURL,{waitUntil:'domcontentloaded'});
  // The results open as soon as the catalog has loaded, which is after DOMContentLoaded.
  await sharePage.waitForFunction(()=>!document.getElementById('results').hidden);
  assert.equal(await sharePage.evaluate(()=>buildKey(resView(resList[resIdx]).b)),exactBuild);
  assert.equal(await sharePage.evaluate(()=>document.activeElement.id),'rclose');
  await sharePage.evaluate(()=>openShare(SwitchdeckShare.encode(resView(resList[resIdx]).b,quizAns,QUESTIONS)));
  assert.equal(await sharePage.evaluate(()=>document.activeElement.id),'rclose');
  await sharePage.keyboard.press('Escape');
  await sharePage.waitForFunction(()=>document.getElementById('results').hidden);
  assert.equal(await sharePage.evaluate(()=>document.querySelector('main').inert),false);
  await sharePage.close();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('results').hidden);
  assert.equal(await page.evaluate(() => document.activeElement.id),'viewmatches');
  assert.equal(await page.locator('main').getAttribute('inert'),null);
  console.log('PASS: modal focus containment, Escape, focus restoration and copy confirmation');

  await page.locator('#nav-build').click();
  // Open a picker from its real trigger, then type digits and Backspace without changing the quiz.
  const trigger = page.locator('[data-pick="switches"]').first();
  await trigger.click();
  assert.equal(await page.locator('#pkfilters').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'picker filters fit their column');
  const framedThumbs=await page.locator('#picker .thumb .pf-photo').evaluateAll(items=>items.every(el=>{
    const frame=el.closest('.thumb').getBoundingClientRect(),photo=el.getBoundingClientRect();
    return photo.height<=frame.height+1&&photo.width<=frame.width+1;
  }));
  assert.equal(framedThumbs,true,'portrait product photos stay inside their thumbnail frames');
  const beforeTyping = await state();
  await page.locator('#pkq').fill('oilking 123');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Enter');
  assert.deepEqual(await state(),beforeTyping);
  assert.equal(await page.locator('#pkq').inputValue(),'oilking 12');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#picker').getAttribute('hidden'),'');
  assert.equal(await trigger.evaluate(el => document.activeElement===el),true);
  await page.locator('#copycode').click();
  await page.waitForFunction(() => document.querySelector('#copycode').textContent==='Copied');
  await page.evaluate(() => {navigator.clipboard.writeText=async()=>{throw Error('blocked')}});
  await page.locator('#copylist').click();
  assert.equal(await page.locator('#copyfallback').isVisible(),true);
  assert.equal(await page.evaluate(() => document.activeElement.id),'copyfallback');
  console.log('PASS: picker typing, focus restoration, builder copy and clipboard failure fallback');

  await page.locator('#nav-directory').click();
  await page.locator('.directory-card').first().waitFor();
  // Store links under each tile sit above the tile's full-size open button, so a tap reaches the store.
  assert.equal(await page.locator('.directory-actions a').first().evaluate(a=>{const r=a.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return a===hit||a.contains(hit)}),true,'directory store links are clickable');
  await page.locator('[data-detail]').first().click();
  await page.locator('#directory-detail-title').waitFor();
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains('directory-close')),true);
  const directoryPhoto=page.locator('.directory-main-photo');
  const directoryBox=await directoryPhoto.boundingBox();
  await directoryPhoto.evaluate(img => {img.parentElement.classList.add('pending');img.src='/broken-image.jpg'});
  await page.waitForFunction(() => document.querySelector('.directory-main-photo').classList.contains('directory-photo-error'));
  sameBox(directoryBox,await directoryPhoto.boundingBox());
  const gallery=page.locator('[data-gallery]');
  if(await gallery.count()>1){await gallery.nth(1).click();await page.waitForFunction(()=>!document.querySelector('.directory-main-photo').classList.contains('directory-photo-error'));}
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  console.log('PASS: native details dialog, asynchronous focus, broken directory photo and gallery recovery');

  // Browser history and small screens keep the same UI and cannot leak overlays.
  await page.goBack();await page.waitForFunction(()=>!document.getElementById('view-build').hidden);
  assert.equal(new URL(page.url()).pathname,'/build');
  await page.goForward();await page.waitForFunction(()=>!document.getElementById('view-directory').hidden);
  assert.equal(new URL(page.url()).pathname,'/directory');
  // URLs carry no # fragment, a view path opens that view directly, and links shared in the old #view / #b= form still open.
  {
    const linkPage=await context.newPage();
    linkPage.on('pageerror',error=>errors.push(error.message));
    await linkPage.goto(origin+'/saved',{waitUntil:'domcontentloaded'});
    await linkPage.waitForFunction(()=>!document.getElementById('view-saved').hidden);
    await linkPage.goto(origin+'/#build',{waitUntil:'domcontentloaded'});
    await linkPage.waitForFunction(()=>!document.getElementById('view-build').hidden);
    assert.equal(linkPage.url(),origin+'/build');
    await linkPage.locator('#brandlink').click();
    await linkPage.waitForFunction(()=>!document.getElementById('view-finder').hidden);
    assert.equal(linkPage.url(),origin+'/');
    const code=new URL(shareURL).searchParams.get('b');
    await linkPage.goto(origin+'/#b='+code,{waitUntil:'domcontentloaded'});
    await linkPage.waitForFunction(()=>!document.getElementById('results').hidden);
    assert.equal(linkPage.url(),origin+'/?b='+code);
    assert.equal(await linkPage.evaluate(()=>buildKey(resView(resList[resIdx]).b)),exactBuild);
    await linkPage.keyboard.press('Escape');
    await linkPage.waitForFunction(()=>document.getElementById('results').hidden);
    assert.equal(linkPage.url(),origin+'/');
    await linkPage.close();
  }
  await page.locator('#nav-finder').click();
  for(const [width,height] of [[1440,900],[1280,631],[768,800],[390,844],[390,667]]){
    await page.setViewportSize({width,height});
    await page.evaluate(()=>moveQuiz(0));await page.waitForTimeout(600);
    const fits=await page.evaluate(()=>{
      const card=document.getElementById('qcard').getBoundingClientRect();
      return {inside:card.left>=-1&&card.right<=innerWidth+1&&card.bottom<=innerHeight+1,overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    assert.equal(fits.inside,true,`${width}x${height}: card stays in viewport`);
    assert.equal(fits.overflow,false,`${width}x${height}: no horizontal overflow`);
    const caps=await page.locator('.fitem.feat .cap').evaluateAll(items=>items.map(el=>{const cap=el.getBoundingClientRect(),board=el.closest('.fitem').getBoundingClientRect();return cap.width<=board.width+1}));
    assert.ok(caps.every(Boolean),'product labels fit within their boards');
    await page.screenshot({path:path.join(results,`finder-${width}-${height}.png`)});
  }
  await page.emulateMedia({colorScheme:'dark'});
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  await page.locator('#theme-toggle').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await page.locator('.opt').first().focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid');
  await page.screenshot({path:path.join(results,'keyboard-focus.png')});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>moveQuiz(3));
  assert.equal(await page.locator('.qbody').evaluate(el=>getComputedStyle(el).animationName),'none');
  await choose('thock',4);
  assert.equal(await page.locator('#qcard').evaluate(el=>el.style.height),'');
  assert.deepEqual(errors,[]);
  console.log('PASS: browser history, responsive viewports, reduced motion and zero JavaScript errors');

  // Real touch input, including the mobile filter sheet and Escape in a search field.
  const touchContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  await touchContext.route('**/*',routeHandler);
  const touchPage=await touchContext.newPage();
  touchPage.on('pageerror',error=>errors.push(error.message));
  await touchPage.goto(origin,{waitUntil:'domcontentloaded'});
  // Phone browsers leave far less height than the screen size once their toolbars show. On every question the centre
  // boards either show at a readable size or not at all, never as a squeezed caption with no picture.
  for(const [width,height] of [[320,568],[360,640],[375,553],[375,667],[390,664],[393,659],[414,715],[430,739],[844,390]]){
    await touchPage.setViewportSize({width,height});
    for(let n=0;n<9;n++){
      await touchPage.evaluate(n=>{if(n===1) quizAns.layout='60'; moveQuiz(n)},n);await touchPage.waitForTimeout(450);
      const widths=await touchPage.locator('.fitem.feat').evaluateAll(items=>items.map(el=>el.getBoundingClientRect().width));
      assert.ok(widths.every(w=>w>=60),`${width}x${height} question ${n+1}: centre boards ${widths.map(Math.round)}`);
    }
  }
  await touchPage.setViewportSize({width:390,height:844});
  await touchPage.evaluate(()=>moveQuiz(0));
  await touchPage.locator('.opt[data-v="75"]').tap();
  await touchPage.waitForFunction(()=>quizStep===2);
  await touchPage.locator('#nav-build').tap();
  await touchPage.locator('[data-pick="switches"]').first().tap();
  await touchPage.locator('#pkfilt').tap();
  assert.equal(await touchPage.locator('#pkfilt').getAttribute('aria-expanded'),'true');
  await touchPage.locator('#pkq').fill('linear 123');
  await touchPage.keyboard.press('Escape');
  assert.equal(await touchPage.locator('#picker').getAttribute('hidden'),'');
  await touchPage.locator('#nav-finder').tap();
  await touchPage.evaluate(()=>openResults());
  assert.equal(await touchPage.locator('#rclose').evaluate(el=>getComputedStyle(el).position),'absolute');
  await touchPage.locator('#rclose').tap();
  assert.equal(await touchPage.locator('#results').getAttribute('hidden'),'');
  await touchContext.close();
  assert.deepEqual(errors,[]);
  console.log('PASS: touch quiz choices and mobile picker filters');
} catch(error) {
  console.error('UI state at failure:', await state(), errors);
  console.error(await page.locator('#qcard .opt').evaluateAll(items=>items.map(el=>({value:el.dataset.v,disabled:el.disabled}))));
  await page.screenshot({path:path.join(results,'failure.png'),fullPage:true});
  throw error;
} finally {
  releaseImages();
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}

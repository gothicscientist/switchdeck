import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../assets/analytics.js',import.meta.url),'utf8');
function load(hostname='thock.cc'){
  const scripts=[],listeners={};
  const window={};
  const document={createElement:()=>({}),head:{appendChild:s=>scripts.push(s)},addEventListener:(n,f)=>listeners[n]=f};
  vm.runInNewContext(source,{window,document,location:{hostname},URL});
  return {window,scripts,listeners,api:window.ThockAnalytics,events:()=>Array.from(window.dataLayer||[]).filter(a=>a[0]==='event')};
}
test('loads the correct GA4 property once, asynchronously, on production only',()=>{
  const t=load();
  assert.equal(t.scripts.length,1);
  assert.equal(t.scripts[0].async,true);
  assert.equal(t.scripts[0].src,'https://www.googletagmanager.com/gtag/js?id=G-PM25KR04FW');
  assert.equal(t.window.dataLayer[1][1],'G-PM25KR04FW');
  const local=load('localhost');local.api.answer('layout',1,'65');
  assert.equal(local.scripts.length,0);assert.equal(local.events().length,0);
});
test('deduplicates redraws and repeat answers, but records changed answers and new attempts',()=>{
  const t=load();
  t.api.step('layout',1);t.api.step('layout',1);
  t.api.answer('layout',1,'65');t.api.answer('layout',1,'65');t.api.answer('layout',1,'75');
  t.api.complete({match_count:12});t.api.complete({match_count:12});
  assert.deepEqual(t.events().map(e=>e[1]),['quiz_step_view','quiz_start','quiz_answer','quiz_answer','quiz_complete']);
  t.api.reset();t.api.step('layout',1);t.api.answer('layout',1,'65');t.api.complete({match_count:12});
  assert.equal(t.events().filter(e=>e[1]==='quiz_start').length,2);
  assert.equal(t.events().filter(e=>e[1]==='quiz_complete').length,2);
});
test('viewing a shared build cannot count as completing the quiz',()=>{
  const t=load();t.api.step('layout',1);t.api.complete({match_count:1});
  assert.equal(t.events().filter(e=>e[1]==='quiz_complete').length,0);
});
test('retailer clicks preserve product metadata and exclude tracking query strings',()=>{
  const t=load();
  const a={href:'https://shop.example/product?affiliate=abc',dataset:{productId:'board-1',productCategory:'case'}};
  t.listeners.click({target:{closest:()=>a},type:'click'});
  t.listeners.auxclick({target:{closest:()=>a},type:'auxclick',button:2});
  t.listeners.auxclick({target:{closest:()=>a},type:'auxclick',button:1});
  assert.equal(t.events().length,2);
  const params=t.events()[0][2];
  assert.equal(params.item_id,'board-1');assert.equal(params.retailer,'shop.example');
  assert.equal(params.link_url,'https://shop.example/product');
});
test('blocked analytics cannot break quiz interactions',()=>{
  const t=load();t.window.gtag=()=>{throw Error('blocked')};
  assert.doesNotThrow(()=>{t.api.answer('layout',1,'65');t.api.complete({match_count:1});t.api.reset()});
});

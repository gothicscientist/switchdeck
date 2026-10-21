import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import vm from 'node:vm';
import {getJSON,feedAllowed} from '../scripts/catalog-network.mjs';
import {admit,normalize,SOURCES} from '../scripts/catalog-lib.mjs';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean).join('\n');
async function engine(storage={}){
  const ctx={URL,window:{},localStorage:{getItem:k=>storage[k]??null},innerWidth:1300,btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary')};vm.createContext(ctx);
  for(const f of ['assets/product-links.js','data/product-links.js','assets/part-names.js','data/builder-catalog.js'])vm.runInContext(await readFile(new URL('../'+f,import.meta.url),'utf8'),ctx);
  vm.runInContext(inline.slice(0,inline.indexOf('const LAYOUTS =')),ctx);
  vm.runInContext(inline.slice(inline.indexOf('function partName('),inline.indexOf('let toastT;'))+inline.match(/function decodeBuild\(code\)\{[^\n]+/)[0]+'\n'+inline.match(/const storeOf[^\n]+/)[0],ctx);
  vm.runInContext(inline.slice(inline.indexOf('const B_MIN='),inline.indexOf('/*COMBOS-END*/')),ctx);
  return code=>vm.runInContext(code,ctx,{timeout:30000});
}

test('all browser scripts compile, including lazy directory and theme scripts',async()=>{
  for(const f of (await readdir(new URL('../assets/',import.meta.url))).filter(f=>f.endsWith('.js')))new vm.Script(await readFile(new URL('../assets/'+f,import.meta.url),'utf8'),{filename:f});
  new vm.Script(inline);
});

test('malformed browser storage and wrong-category build codes recover safely',async()=>{
  const run=await engine({'sy.saved':'{}','sy.build':'{"extras":"broken","case":"oilking","switches":"rainy75","name":{},"color":-20}'});
  assert.equal(run('saved.length'),0);
  assert.equal(run('build.case'),null);assert.equal(run('build.switches'),null);assert.equal(run('build.extras.length'),0);assert.equal(run('build.color'),0);
  const code='SY1:'+Buffer.from(JSON.stringify({n:'Keyboard 🧽',c:'rainy75',e:['oilking','puller','puller'],k:999})).toString('base64');
  assert.equal(run(`decodeBuild(${JSON.stringify(code)}).name`),'Keyboard 🧽');
  assert.equal(run(`decodeBuild(${JSON.stringify(code)}).extras.join(',')`),'puller');
  assert.equal(run(`decodeBuild(${JSON.stringify(code)}).color`),0);
  assert.throws(()=>run('decodeBuild("bnVsbA==")'));
});

test('assembled magnetic boards reject MX upgrades and unknown fit is never called compatible',async()=>{
  const run=await engine();
  assert.equal(run(`(()=>{const c=CASES.find(c=>c.assembled&&c.switchSystem==='hall-effect');return compat({case:c.id,switches:'oilking',extras:[]}).some(i=>i.level==='fail'&&i.slot==='switches')})()`),true);
  assert.equal(run(`verdict([{level:'info',slot:'pcb'}]).text`),'Check part compatibility');
});

test('finder recommendations stay purchasable and within whole-build budgets',async()=>{
  const run=await engine();
  for(const ans of [{budget:100},{budget:150,layout:'65'},{budget:300,feel:'Linear',sound:'thock'},{budget:500,layout:'full',solder:'hotswap'}]){
    const result=run(`(()=>{const list=evalAns(${JSON.stringify(ans)}).list;return {count:list.length,bad:list.filter(r=>Math.abs(r.t-total(r.b))>.001||r.t>${ans.budget}+.001||lineItems(r.b).some(i=>i.part.soldOut)||compat(r.b).some(i=>i.level==='fail')).map(r=>r.b.case)}})()`);
    assert.ok(result.count>0,JSON.stringify(ans));assert.equal(result.bad.length,0,JSON.stringify(result.bad));
  }
  assert.equal(run(`evalAns({solder:'hotswap'}).list.some(r=>effPcb(r.b)?.hotswap!==true)`),false);
});

test('reviewed legacy parts inherit sold-out status from their current retailer snapshots',async()=>{
  const run=await engine();
  assert.equal(run('ALLPARTS.filter(p=>!p.soldOut&&p.retailers?.length&&p.retailers.every(r=>r.available===false)).length'),0);
});

test('kit listing with in-stock components and a sold-out full kit keeps kit price and stock',()=>{
  const p=normalize({id:100,title:'XD84 Pro Custom Mechanical Keyboard Kit 75%',handle:'xd84',vendor:'Example',product_type:'Keyboard',tags:[],body_html:'75% layout',images:[{src:'https://example.com/photo.jpg'}],options:[],variants:[{id:1,title:'XD84 Pro / Plate Only',price:'16.60',available:true},{id:2,title:'XD84 Pro / PCB only',price:'33.90',available:true},{id:3,title:'XD84 Pro / Kit 1',price:'64.30',available:false}]},SOURCES[0],new Date().toISOString());
  const r=admit(p);assert.equal(r.parts[0].price,64.3);assert.equal(r.parts[0].soldOut,true);assert.match(r.parts[0].retailers[0].url,/variant=3/);
});

test('a 70% board without function keys is not silently classified as a 75% board',()=>{
  const p=normalize({id:101,title:'Example K14 Pro Wireless Mechanical Keyboard',handle:'k14',vendor:'Example',product_type:'Keyboard',tags:[],body_html:'Layout: 70%',images:[{src:'https://example.com/photo.jpg'}],options:[],variants:[{id:1,title:'Default Title',price:'70',available:true}]},SOURCES[0],new Date().toISOString());
  assert.equal(p.specs.layout,'70');assert.equal(admit(p).reason,"layout the builder can't draw");
});

test('network errors, temporary HTTP failures and invalid JSON are retried; permanent 404 is not',async()=>{
  let calls=0;
  const request=async()=>{calls++;if(calls===1)throw Error('socket reset');if(calls===2)return new Response('busy',{status:503});if(calls===3)return new Response('<html>oops');return Response.json({products:[]})};
  assert.deepEqual(await getJSON('https://store.example/products.json',{request,pause:async()=>{}}),{products:[]});assert.equal(calls,4);
  calls=0;await assert.rejects(getJSON('https://store.example/missing',{request:async()=>{calls++;return new Response('',{status:404})},pause:async()=>{}}),/HTTP 404/);assert.equal(calls,1);
});

test('robots uses the actual Thock agent, longest rule and anchored paths',()=>{
  assert.equal(feedAllowed('User-agent: *\nAllow: /\nUser-agent: ThockCatalog\nDisallow: /products.json'),false);
  assert.equal(feedAllowed('User-agent: *\nDisallow: /products\nAllow: /products.json$'),true);
  assert.equal(feedAllowed('User-agent: *\nDisallow: /products.json$','ThockCatalog','/products.json?limit=250'),true);
  assert.equal(feedAllowed('User-agent: *\nDisallow: /*.json'),false);
});

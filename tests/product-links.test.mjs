import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import '../assets/product-links.js';
import {identity} from '../scripts/build-product-links.mjs';
import {loadFullCatalog} from '../scripts/catalog-pack.mjs';
const {productURL,orderLinks,linksFor}=globalThis.SwitchdeckLinks;
test('reject homepages, category/search/store pages, redirects and unsafe URLs',()=>{
 for(const url of ['https://amazon.com','https://amazon.com/s?k=yellow','https://amazon.com/stores/brand','https://amazon.com/clp/B0CR1JTHWV','https://divinikey.com','https://divinikey.com/search?q=oil','https://kbdfans.com/collections/all','https://kbdfans.com/products','https://kbdfans.com/products/foo.js','https://kbdfans.com/products/foo?redirect=other','https://evil:password@amazon.com/dp/B0CR1JTHWV','javascript:alert(1)'])assert.equal(productURL(url),null,url);
});
test('Amazon is canonical, first, deduplicated, and has a truthful label',()=>{
 const links=orderLinks([{name:'Maker',url:'https://keychron.com/products/q1?variant=123'},{name:'Other',url:'https://www.amazon.com/Keychron/dp/B0CR1JTHWV/ref=something?tag=old-20'},{name:'Amazon duplicate',url:'https://www.amazon.com/dp/B0CR1JTHWV'},{name:'Amazon',url:'https://amazon.com/s?k=q1'}]);
 assert.equal(links.length,2);assert.equal(links[0].name,'Amazon');assert.equal(links[0].url,'https://www.amazon.com/dp/B0CR1JTHWV');assert.equal(links[1].url,'https://keychron.com/products/q1?variant=123');
});
test('brand homepage is never a fallback and missing links are safe',()=>{
 assert.deepEqual(linksFor({id:'unknown',brand:'Gateron',photo:{page:'https://gateron.com'},retailers:[{url:'https://amazon.com/s?k=foo'}]},{}),[]);
});
test('an imported builder keeps its exact variant URL ahead of a generic source page',()=>{
 const p={id:'source-123~456',catalogId:'source-123',retailers:[{name:'Store',url:'https://example.com/products/part?variant=456'}]};
 const r={'source-123':[{name:'Store',url:'https://example.com/products/part'},{name:'Amazon',url:'https://www.amazon.com/dp/B0CR1JTHWV'}]};
 const links=linksFor(p,r);assert.equal(links[0].name,'Amazon');assert.match(links[1].url,/variant=456$/);
});
test('the real finder, builder and directory data resolve only to product pages',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 const ctx={URL,window:{},localStorage:{getItem:()=>null},innerWidth:1300};vm.createContext(ctx);
 for(const f of ['assets/part-names.js','assets/product-links.js','data/product-links.js'])vm.runInContext(await readFile(new URL('../'+f,import.meta.url),'utf8'),ctx);
 ctx.window.SWITCHDECK_CATALOG=await loadFullCatalog(new URL('../data/',import.meta.url));
 vm.runInContext(script.slice(0,script.indexOf('const LAYOUTS =')),ctx);
 const results=vm.runInContext('ALLPARTS.map(p=>({id:p.id,links:SwitchdeckLinks.linksFor(p)}))',ctx);
 const report=JSON.parse(await readFile(new URL('../data/product-link-report.json',import.meta.url),'utf8'));
 assert.deepEqual(Array.from(results.filter(p=>!p.links.length),p=>p.id).sort(),report.missing.map(p=>p.id).sort());
 for(const p of results)for(const r of p.links)assert.equal(productURL(r.url),r.url,p.id);
 assert.ok(results.find(p=>p.id==='oilking').links[0].name==='Amazon');
 assert.ok(vm.runInContext('[...FINDER_CASES,...CASES,...PCBS,...PLATES,...SWITCHES,...KEYCAPS,...STABS,...EXTRAS].every(p=>SwitchdeckLinks.linksFor(p).length>0)',ctx));
 assert.ok(vm.runInContext("BYID.tofu60 && !CASES.some(p=>p.id==='tofu60')",ctx),'saved builds retain pending IDs');
});
test('revision, brand, category and variant identity are not conflated',()=>{
 const p={brand:'Gateron',name:'Black Ink V2',category:'switches'};
 for(const q of [{...p,name:'Black Ink V3'},{...p,brand:'Kailh'},{...p,category:'extras'},{...p,name:'Black Ink V2 Silent'}])assert.notEqual(identity(p),identity(q));
});
test('all buying surfaces use product policy; missing links do not break exports',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const policy=html.match(/function buyLinks\(p\)\{[^\n]+/)[0];
 const ctx={globalThis:{SwitchdeckLinks:globalThis.SwitchdeckLinks}};vm.createContext(ctx);vm.runInContext(policy,ctx);
 assert.equal(vm.runInContext("buyLinks({id:'unresolved'}).length",ctx),0);
 assert.match(html,/buyLinks\(i.part\)\[0\]\?\.u/);
 assert.match(html,/Exact product link not confirmed yet/);
 assert.doesNotMatch(html,/const SHOPS|STORES_FOR|function searchLink/);
 const directory=await readFile(new URL('../assets/directory.js',import.meta.url),'utf8');assert.match(directory,/SwitchdeckLinks.linksFor\(p\)/);
});
test('affiliate tags apply only to stores with a code, on the shopper link, never the canonical URL',()=>{
 const {affiliateFor,hasAffiliates}=globalThis.SwitchdeckLinks;
 const cfg={'amazon.com':{param:'tag',code:'switchyard-20'},'kbdfans.com':{param:'ref',code:''},'example.com':{wrap:'https://go.example.net/?u={url}'}};
 assert.equal(affiliateFor('https://www.amazon.com/dp/B0CR1JTHWV',cfg),'https://www.amazon.com/dp/B0CR1JTHWV?tag=switchyard-20');
 assert.equal(affiliateFor('https://kbdfans.com/products/foo',cfg),'https://kbdfans.com/products/foo','empty code stays untagged');
 assert.equal(affiliateFor('https://divinikey.com/products/foo',cfg),'https://divinikey.com/products/foo','unknown store stays untagged');
 assert.equal(affiliateFor('https://example.com/products/a?variant=1',cfg),'https://go.example.net/?u='+encodeURIComponent('https://example.com/products/a?variant=1'));
 assert.equal(affiliateFor('https://www.amazon.com/dp/B0CR1JTHWV?tag=switchyard-20',cfg),'https://www.amazon.com/dp/B0CR1JTHWV?tag=switchyard-20','no double tag');
 assert.equal(hasAffiliates(cfg),true); assert.equal(hasAffiliates({'a.com':{param:'ref',code:''}}),false);
 // a store's old tag is stripped before ours is added
 assert.equal(productURL('https://www.amazon.com/dp/B0CR1JTHWV?tag=someone-20'),'https://www.amazon.com/dp/B0CR1JTHWV');
});
test('every store link on the page and in the directory goes out through the affiliate-tagged href',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8'), dir=await readFile(new URL('../assets/directory.js',import.meta.url),'utf8');
 assert.ok(html.indexOf('assets/affiliates.js')<html.indexOf('assets/product-links.js'));
 assert.match(html,/u:r\.href\|\|r\.url/); assert.match(dir,/href="\$\{esc\(r\.href\|\|r\.url\)\}"/);
 assert.doesNotMatch(dir,/\.href=safeURL\(v\.url\)/);
 const links=globalThis.SwitchdeckLinks.linksFor({id:'x',url:'https://kbdfans.com/products/foo'},{});
 assert.equal(links[0].url,'https://kbdfans.com/products/foo'); assert.ok('href' in links[0]);
});
test('Bharat\'s affiliate codes tag every link from those stores, and Amazon then affiliate stores lead',async()=>{
 const ctx={};vm.runInNewContext(await readFile(new URL('../assets/affiliates.js',import.meta.url),'utf8'),ctx);
 const cfg=ctx.globalThis?.SWITCHDECK_AFFILIATES||ctx.SWITCHDECK_AFFILIATES, {affiliateFor,storeRank}=globalThis.SwitchdeckLinks;
 assert.equal(affiliateFor('https://www.amazon.com/dp/B0CR1JTHWV',cfg),'https://www.amazon.com/dp/B0CR1JTHWV?tag=thock-20');
 assert.equal(affiliateFor('https://www.keychron.com/products/keychron-q1-max?variant=1',cfg),'https://www.keychron.com/products/keychron-q1-max?variant=1&ref=thock');
 assert.equal(affiliateFor('https://epomaker.com/products/epomaker-th80-v2',cfg),'https://epomaker.com/products/epomaker-th80-v2?sca_ref=12591760.vF400L2Pzt');
 assert.deepEqual(['https://divinikey.com/products/a','https://epomaker.com/products/a','https://www.amazon.com/dp/B0CR1JTHWV'].map(u=>storeRank(u,cfg)),[2,1,0]);
 const prev=globalThis.SWITCHDECK_AFFILIATES;globalThis.SWITCHDECK_AFFILIATES=cfg;
 try{
  const links=orderLinks([{name:'Divinikey',url:'https://divinikey.com/products/q2'},{name:'Keychron',url:'https://www.keychron.com/products/q2'},{name:'Sold out',url:'https://epomaker.com/products/q2',available:false},{name:'Amazon',url:'https://www.amazon.com/dp/B0CR1JTHWV'}]);
  assert.deepEqual(links.map(l=>l.name),['Amazon','Keychron','Divinikey','Sold out']);
 }finally{globalThis.SWITCHDECK_AFFILIATES=prev}
});

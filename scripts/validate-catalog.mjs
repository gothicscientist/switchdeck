import assert from 'node:assert/strict';
// In GitHub Actions, surface the failing check as an annotation so it is readable without the raw log.
if(process.env.GITHUB_ACTIONS) process.on('uncaughtException',e=>{console.log('::error title=catalog check::'+String(e.message).replace(/\n/g,' ').slice(0,900));process.exit(1)});
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {digest,requiredFields} from './catalog-lib.mjs';
const base=new URL('../data/',import.meta.url);
const load=async name=>JSON.parse(await readFile(new URL(name,base),'utf8'));
const manifest=await load('catalog-manifest.json'),index=await load('catalog-index.json');
const products=(await Promise.all(manifest.shards.map(load))).flat();
assert.equal(products.length,manifest.listingCount);assert.equal(index.length,products.length);assert.equal(new Set(products.map(p=>p.id)).size,products.length);assert.equal(digest(products),manifest.fingerprint);
const byId=new Map(products.map(p=>[p.id,p]));
for(const p of products){
  assert.ok(p.name&&p.brand&&p.retailer&&p.sourceId&&p.checkedAt&&p.images.length&&p.variants.length,p.id);
  assert.ok(Number.isFinite(Date.parse(p.checkedAt)),p.id);
  const source=manifest.sources.find(s=>s.id===p.sourceId);assert.ok(source,p.id);assert.equal(new URL(p.url).origin,new URL(source.url).origin);
  for(const u of [p.url,...p.images,...p.variants.map(v=>v.url)])assert.equal(new URL(u).protocol,'https:',p.id);
  assert.ok(p.priceMin>0&&p.priceMax>=p.priceMin,p.id);assert.equal(p.currency,'USD');assert.equal(p.available,p.variants.some(v=>v.available));
  assert.deepEqual(p.missingFields,requiredFields(p.category).filter(k=>p.specs[k]===undefined));
  if(p.specs.totalTravelMm!==undefined)assert.ok(p.specs.totalTravelMm>=1&&p.specs.totalTravelMm<=6,p.id+' travel');
  if(p.specs.actuationForceG!==undefined)assert.ok(p.specs.actuationForceG>=10&&p.specs.actuationForceG<=150,p.id+' force');
  for(const v of p.variants){assert.ok(v.price>0&&Number.isFinite(v.price));if(v.quantity)assert.ok(Math.abs(v.unitPrice-v.price/v.quantity)<.00001)}
}
for(const i of index){const p=byId.get(i.id);assert.ok(p.images.includes(i.image)||(new URL(i.image).protocol==='https:'&&new URL(i.image).hostname===new URL(p.images[0]).hostname),'directory image '+i.id);assert.equal(i.price,p.priceMin);assert.ok(manifest.shards.includes(i.shard))}
for(const [cat,info] of Object.entries(manifest.categories))assert.equal(info.count,products.filter(p=>p.category===cat).length);
const ctx={window:{}};vm.runInNewContext(await readFile(new URL('builder-catalog.js',base),'utf8'),ctx);
const catalog=ctx.window.SWITCHDECK_CATALOG;
assert.equal(catalog.switches.length,manifest.builderSwitchCount);assert.equal(catalog.extras.length,manifest.builderExtraCount);
for(const [k,m] of [['cases','builderCaseCount'],['keycaps','builderKeycapCount'],['stabs','builderStabCount']])assert.equal((catalog[k]||[]).length,manifest[m]??0,k);
// A shown photo must have passed the image check, which records the product's outline in the frame.
const checkedPhoto=(ph,id)=>{if(ph===null)return;assert.ok(ph&&new URL(ph.img).protocol==='https:','photo url '+id);
  assert.ok(Array.isArray(ph.box)&&ph.box.length===4&&ph.box.every(v=>Number.isFinite(v)&&v>=0&&v<=100)&&ph.box[2]>0&&ph.box[3]>0&&ph.box[0]+ph.box[2]<=100.01&&ph.box[1]+ph.box[3]<=100.01,'photo frame '+id);
  assert.ok(Number.isFinite(ph.ar)&&ph.ar>0.2&&ph.ar<8,'photo aspect '+id)};
for(const [id,meta] of Object.entries(catalog.curated||{})){checkedPhoto(meta.photo??null,id);for(const r of meta.retailers)assert.equal(new URL(r.url).protocol,'https:')}
const builderIds=new Set();
for(const b of [...catalog.switches,...catalog.extras,...(catalog.cases||[]),...(catalog.keycaps||[]),...(catalog.stabs||[])]){
  const p=byId.get(b.id.split('~')[0]);assert.ok(p&&p.available,b.id);assert.ok(!builderIds.has(b.id),'duplicate builder id '+b.id);builderIds.add(b.id);
  assert.ok(b.price>0&&b.retailers.every(r=>new URL(r.url).origin===new URL(p.url).origin),b.id);checkedPhoto(b.photo??null,b.id);
}
for(const b of catalog.switches){const p=byId.get(b.id.split('~')[0]);assert.ok(!p.specs.system||p.specs.system==='mx-mechanical',b.id);if(!b.id.includes('~'))assert.equal(b.force,p.specs.actuationForceG??null);assert.equal(b.travel,p.specs.totalTravelMm??null);assert.ok(b.packQuantity&&b.packPrice);assert.equal(b.sound,null)}
for(const b of catalog.cases||[]){const p=byId.get(b.id.split('~')[0]);assert.equal(p.category,'keyboards');assert.ok(['60','65','75','tkl','full'].includes(b.layout));assert.equal(b.kit.pcb.hotswap,p.specs.hotswap??null)}
for(const b of catalog.keycaps||[]){const p=byId.get(b.id.split('~')[0]);assert.equal(p.category,'keycaps');assert.ok(b.profile)}
for(const b of catalog.stabs||[])assert.ok(['screw','clip','plate'].includes(b.mount),b.id)
console.log(`Validated ${products.length} listings, ${products.reduce((n,p)=>n+p.variants.length,0)} variants, ${catalog.switches.length} builder switches, ${(catalog.cases||[]).length} keyboards, ${(catalog.keycaps||[]).length} keycap sets, ${(catalog.stabs||[]).length} stabilizers, ${catalog.extras.length} extras across ${manifest.sources.length} retailers.`);

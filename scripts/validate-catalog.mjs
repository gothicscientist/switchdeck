import assert from 'node:assert/strict';
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
for(const i of index){const p=byId.get(i.id);assert.equal(i.image,p.images[0]);assert.equal(i.price,p.priceMin);assert.ok(manifest.shards.includes(i.shard))}
for(const [cat,info] of Object.entries(manifest.categories))assert.equal(info.count,products.filter(p=>p.category===cat).length);
const ctx={window:{}};vm.runInNewContext(await readFile(new URL('builder-catalog.js',base),'utf8'),ctx);
const catalog=ctx.window.SWITCHDECK_CATALOG;
assert.equal(catalog.switches.length,manifest.builderSwitchCount);assert.equal(catalog.extras.length,manifest.builderExtraCount);
for(const meta of Object.values(catalog.curated||{})){if(meta.photo)assert.equal(new URL(meta.photo.img).protocol,'https:');for(const r of meta.retailers)assert.equal(new URL(r.url).protocol,'https:')}
for(const b of catalog.switches){const p=byId.get(b.id);assert.ok(p&&p.available);assert.equal(p.specs.system,'mx-mechanical');assert.equal(p.missingFields.length,0);assert.equal(b.force,p.specs.actuationForceG);assert.equal(b.travel,p.specs.totalTravelMm);assert.ok(b.packQuantity&&b.packPrice);assert.equal(b.sound,null)}
console.log(`Validated ${products.length} listings, ${products.reduce((n,p)=>n+p.variants.length,0)} variants, ${catalog.switches.length} builder switches, ${catalog.extras.length} extras across ${manifest.sources.length} retailers.`);

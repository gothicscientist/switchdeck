import assert from 'node:assert/strict';
// In GitHub Actions, surface the failing check as an annotation so it is readable without the raw log.
if(process.env.GITHUB_ACTIONS) process.on('uncaughtException',e=>{console.log('::error title=catalog check::'+String(e.message).replace(/\n/g,' ').slice(0,900));process.exit(1)});
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {parseVideosFile} from './sound-videos.mjs';
import {digest,requiredFields,EXTRA_KINDS,SWITCH_SYSTEMS,soundFromMaterials,MOD_TYPES} from './catalog-lib.mjs';
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
for(const [k,m] of [['cases','builderCaseCount'],['keycaps','builderKeycapCount'],['stabs','builderStabCount'],['pcbs','builderPcbCount'],['plates','builderPlateCount']])assert.equal((catalog[k]||[]).length,manifest[m]??0,k);
// A shown photo must have passed the image check, which records the product's outline in the frame.
const checkedPhoto=(ph,id)=>{if(ph===null)return;assert.ok(ph&&new URL(ph.img).protocol==='https:','photo url '+id);
  assert.ok(Array.isArray(ph.box)&&ph.box.length===4&&ph.box.every(v=>Number.isFinite(v)&&v>=0&&v<=100)&&ph.box[2]>0&&ph.box[3]>0&&ph.box[0]+ph.box[2]<=100.01&&ph.box[1]+ph.box[3]<=100.01,'photo frame '+id);
  assert.ok(Number.isFinite(ph.ar)&&ph.ar>0.2&&ph.ar<8,'photo aspect '+id)};
for(const [id,meta] of Object.entries(catalog.curated||{})){checkedPhoto(meta.photo??null,id);for(const r of meta.retailers)assert.equal(new URL(r.url).protocol,'https:')}
const builderIds=new Set();
// Sold-out parts are admitted through the same rules but carry soldOut:true and an unavailable retailer; in-stock parts carry neither.
for(const b of [...catalog.switches,...catalog.extras,...(catalog.cases||[]),...(catalog.keycaps||[]),...(catalog.stabs||[]),...(catalog.pcbs||[]),...(catalog.plates||[])]){
  const p=byId.get(b.id.split('~')[0]);assert.ok(p,b.id);
  if(b.soldOut){assert.equal(b.soldOut,true);assert.ok(b.retailers.every(r=>r.available===false),'sold-out retailer '+b.id)}
  else{assert.ok(p.available,b.id);assert.ok(!('soldOut' in b),'in-stock part with soldOut '+b.id);assert.ok(b.retailers.every(r=>r.available===true),'retailer '+b.id)}assert.ok(!builderIds.has(b.id),'duplicate builder id '+b.id);builderIds.add(b.id);
  assert.ok(b.price>0&&b.retailers.every(r=>new URL(r.url).origin===new URL(p.url).origin),b.id);checkedPhoto(b.photo??null,b.id);
  const selected=p.variants.find(v=>v.id===b.variantId);assert.ok(selected,'exact selected variant '+b.id);
  assert.ok(['complete','incomplete'].includes(b.pricing?.status),'price interpretation '+b.id);
  assert.ok(['in-stock','sold-out','preorder','made-to-order'].includes(b.availability),'availability interpretation '+b.id);
  assert.equal(b.pricing.url,selected.url,'selected variant price URL '+b.id);
  if(b.cat!=='switches')assert.equal(b.price,selected.price,'price belongs to selected variant '+b.id);
  else assert.ok(Math.abs(b.packPrice/b.packQuantity-b.price)<.00001,'rounded pack price '+b.id);
  if(b.cat==='case'&&b.assembled)assert.ok(b.includes?.switches&&b.includes?.keycaps,'assembled contents '+b.id);
  if(b.cat==='keycaps'&&b.keycapFit?.status==='confirmed')assert.ok(b.keycapFit.stem&&(b.covers?.length||b.addon),'confirmed cap evidence '+b.id);
}
for(const b of catalog.switches){const p=byId.get(b.id.split('~')[0]);assert.ok(b.switchSystem===undefined||b.switchSystem===null||SWITCH_SYSTEMS.includes(b.switchSystem),b.id);if(!b.switchSystem)assert.ok(!p.specs.system||p.specs.system==='mx-mechanical',b.id);// A spec is either extracted from the retailer's text or read from its published spec table; it is never invented.
  const stated=(v,x)=>x===null||x===v||Object.values(p.publishedSpecs||{}).some(t=>String(t).includes(String(x)));
  if(!b.id.includes('~'))assert.ok(stated(p.specs.actuationForceG,b.force),b.id+' force');assert.ok(stated(p.specs.totalTravelMm,b.travel),b.id+' travel');assert.ok(b.packQuantity&&b.packPrice);assert.ok(b.sound===null||b.sound===soundFromMaterials(p.specs.topHousing,p.specs.bottomHousing,p.specs.stemMaterial),b.id+' sound must come from published materials')}
for(const b of catalog.cases||[]){const p=byId.get(b.id.split('~')[0]);assert.ok(['60','65','75','tkl','full'].includes(b.layout));if(b.kit)assert.ok(b.kit.pcb.hotswap===null||typeof b.kit.pcb.hotswap==='boolean');assert.ok(b.switchSystem===undefined||SWITCH_SYSTEMS.includes(b.switchSystem),b.id);assert.ok(b.fit==null||b.fit.startsWith(p.sourceId+':'),b.id)}
for(const b of catalog.keycaps||[]){const p=byId.get(b.id.split('~')[0]);assert.ok(b.profile===null||typeof b.profile==='string',b.id)}
// The admission-report format marks a catalog built by the current rules: extras there carry a known kind and no sound or feel effect.
if(manifest.builderAdmission)for(const b of catalog.extras){assert.ok(EXTRA_KINDS.includes(b.kind),b.id+' kind');assert.ok(b.mod===undefined||MOD_TYPES[b.mod],b.id+' mod type'); assert.equal(JSON.stringify(b.fx),JSON.stringify(b.mod?MOD_TYPES[b.mod].fx:{}),b.id+' fx comes only from its mod type')}
for(const b of catalog.pcbs||[]){assert.ok(b.layout===null||['60','65','75','tkl','full'].includes(b.layout),b.id);assert.ok(b.hotswap===null||typeof b.hotswap==='boolean',b.id);assert.ok(b.fit==null||b.fit.startsWith(byId.get(b.id.split('~')[0]).sourceId+':'),b.id)}
for(const b of catalog.plates||[]){assert.ok(b.layout===null||['60','65','75','tkl','full'].includes(b.layout),b.id);assert.ok(b.material===null||typeof b.material==='string',b.id)}
// Every listing is admitted or excluded for a named reason.
if(manifest.builderAdmission)for(const [cat,r] of Object.entries(manifest.builderAdmission)){assert.equal(r.total,manifest.categories[cat].count,cat);assert.equal(r.admitted+r.soldOutAdmitted+Object.values(r.excluded).reduce((a,b)=>a+b,0),r.total,cat+' admission');assert.ok(Object.keys(r.excluded).every(k=>k.length>3),cat+' reason')}
for(const b of catalog.stabs||[])assert.ok(['screw','clip','plate'].includes(b.mount),b.id)
console.log(`Validated ${products.length} listings, ${products.reduce((n,p)=>n+p.variants.length,0)} variants, ${catalog.switches.length} builder switches, ${(catalog.cases||[]).length} keyboards, ${(catalog.keycaps||[]).length} keycap sets, ${(catalog.stabs||[]).length} stabilizers, ${catalog.extras.length} extras, ${(catalog.pcbs||[]).length} PCBs, ${(catalog.plates||[]).length} plates across ${manifest.sources.length} retailers.`);
// Sound test videos are links only: an 11-character video ID, a title, and optional chapter times.
for(const [k,v] of Object.entries(parseVideosFile(await readFile(new URL('sound-videos.js',base),'utf8')))){
  assert.match(v.video,/^[\w-]{11}$/,'sound video '+k);assert.ok(typeof v.title==='string'&&v.title,'sound video title '+k);
  assert.ok(Object.keys(v).every(f=>['video','title','creator','start'].includes(f)),'sound video fields '+k);
}

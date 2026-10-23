import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import '../assets/affiliates.js';
import '../assets/product-links.js';
const {productURL,isAmazon,storeRank,linksFor,affiliateFor}=globalThis.SwitchdeckLinks;
const root=new URL('../',import.meta.url);
const ctx={};vm.runInNewContext(await readFile(new URL('data/product-links.js',root),'utf8'),ctx);
const registry=ctx.SWITCHDECK_PRODUCT_LINKS;
for(const [id,links] of Object.entries(registry)){
  assert.equal(new Set(links.map(l=>l.url)).size,links.length,'duplicate '+id);
  for(const l of links)assert.equal(productURL(l.url),l.url,'non-product URL '+id);
  const live=links.filter(l=>l.available!==false);
  if(live.some(l=>isAmazon(l.url)))assert.ok(isAmazon(links[0].url),'Amazon must be first '+id);
  for(let i=1;i<links.length;i++)if((links[i-1].available===false)===(links[i].available===false))assert.ok(storeRank(links[i-1].url)<=storeRank(links[i].url),'Amazon, then affiliate stores, first '+id);
}
const manifest=JSON.parse(await readFile(new URL('data/catalog-manifest.json',root),'utf8'));
let count=0;
for(const shard of manifest.shards){for(const p of JSON.parse(await readFile(new URL('data/'+shard,root),'utf8'))){
  assert.ok(productURL(p.url),'listing '+p.id);assert.ok(linksFor(p,registry).length,p.id);
  for(const v of p.variants)assert.ok(productURL(v.url),'variant '+p.id);
  // Every listing from a store with a code goes out tagged, new refresh additions included.
  for(const l of linksFor(p,registry)){const a=globalThis.SWITCHDECK_AFFILIATES[new URL(l.url).hostname.replace(/^www\./,'')];if(a?.code)assert.equal(new URL(l.href).searchParams.get(a.param),a.code,'untagged affiliate link '+p.id)}
  count++;
}}
const report=JSON.parse(await readFile(new URL('data/product-link-report.json',root),'utf8'));
const curated=JSON.parse(await readFile(new URL('scripts/curated-parts.json',root),'utf8'));
assert.equal(report.catalogProducts,count);
assert.deepEqual(report.missing.map(p=>p.id).sort(),curated.filter(p=>!linksFor(p,registry).length).map(p=>p.id).sort());
const html=await readFile(new URL('index.html',root),'utf8');
assert.doesNotMatch(html,/const SHOPS|const STORES_FOR|amazon\.com\/s\?k=|function searchLink/);
assert.ok(html.indexOf('assets/product-links.js')<html.indexOf('<script>'));
console.log(`Checked ${count} product listings and ${Object.keys(registry).length} link groups; ${report.amazonProducts} Amazon-first products. ${report.missing.length} older generic/historical parts explicitly have no confirmed purchase link.`);

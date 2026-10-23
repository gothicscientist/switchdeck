import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PACK_FILES,PACK_GROUPS,CATALOG_KEYS,loadFullCatalog} from '../scripts/catalog-pack.mjs';
import {buildBoot} from '../scripts/boot-data.mjs';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const data=new URL('../data/',import.meta.url);

test('the packed catalog files are the ones the page loads and preloads', () => {
  const files=Object.values(PACK_FILES).map(f=>'data/'+f);
  const loaded=html.match(/const CATALOG_FILES=\[([^\]]*)\]/)[1].match(/data\/[\w.-]+/g);
  assert.deepEqual(loaded.sort(),[...files].sort());
  for(const f of files) assert.match(html,new RegExp(`<link rel="preload" href="${f.replace('.','\\.')}" as="fetch" crossorigin fetchpriority="low">`),f+' is preloaded');
  assert.equal(html.match(/<!--thock-boot-->/g)?.length,1);
  assert.equal(html.match(/<!--thock-preload-->/g)?.length,1);
  assert.equal(html.match(/<script>/g)?.length,1,'the finder keeps a single inline script');
  assert.equal(PACK_GROUPS.cases.concat(PACK_GROUPS.switches,PACK_GROUPS.keycaps,PACK_GROUPS.parts).sort().join(),[...CATALOG_KEYS].sort().join());
});
test('the packed files hold the whole catalog the manifest counts', async () => {
  const manifest=JSON.parse(await readFile(new URL('catalog-manifest.json',data),'utf8')), cat=await loadFullCatalog(data);
  const count={switches:'Switch',extras:'Extra',cases:'Case',keycaps:'Keycap',stabs:'Stab',pcbs:'Pcb',plates:'Plate'};
  for(const [k,m] of Object.entries(count)) assert.equal(cat[k].length,manifest['builder'+m+'Count'],k);
  for(const [k,list] of Object.entries(cat)) if(Array.isArray(list)) for(const p of list) assert.ok(p.cat&&p.sourceName&&p.name,p.id+' is complete');
  assert.ok(cat.generatedAt&&cat.curated);
  await assert.rejects(readFile(new URL('builder-catalog.js',data)),'the one big catalog script is gone');
});
test('the boot data draws the same boards as the whole catalog (checked while it is built)', async () => {
  const boot=await buildBoot(new URL('../',import.meta.url).pathname);
  assert.equal(boot.pool.length,21);
  assert.equal(new Set(boot.pool).size,21);
  assert.ok(boot.combos>0);
  for(const id of boot.pool) assert.ok(boot.res[id],id+' has a keycap set and a price');
  assert.ok(JSON.stringify(boot).length<60000,'the boot data stays small enough to inline');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {supplemental40s,reviewedAt} from '../scripts/supplemental-40s.mjs';
import {catalogParts} from '../scripts/catalog-lib.mjs';
import {loadFullCatalog} from '../scripts/catalog-pack.mjs';

test('reviewed 40% kits survive admission with source links, stock and assembly requirements',()=>{
  const listings=supplemental40s(),parts=catalogParts(listings);
  assert.equal(parts.length,5);
  assert.equal(new Set(parts.map(p=>p.id)).size,5);
  for(const p of parts){
    assert.equal(p.cat,'case');assert.equal(p.layout,'40');assert.equal(p.assembled,false);
    assert.equal(p.soldOut,true);assert.equal(p.retailers[0].available,false);
    assert.match(p.blurb,/Requires/);
    const listing=listings.find(x=>x.id===p.id);
    assert.equal(p.retailers[0].url,listing.provenance.url);
    assert.equal(listing.checkedAt,reviewedAt);
  }
  assert.equal(parts.find(p=>p.brand==='Akko').kit.pcb.hotswap,true);
  for(const p of parts.filter(p=>p.brand==='MechWild'||p.brand==='0xCB'))assert.equal(p.knob,true);
});

test('published catalog includes every supplemental board and refresh preserves its review date',async()=>{
  const catalog=await loadFullCatalog(new URL('../data/',import.meta.url));
  for(const p of supplemental40s())assert.ok(catalog.cases.some(c=>c.id===p.id),p.id);
  const sync=await readFile(new URL('../scripts/sync-catalog.mjs',import.meta.url),'utf8');
  assert.match(sync,/concat\(supplemental40s\(\)\)/);
  assert.match(sync,/checkedAt:reviewedAt/);
});

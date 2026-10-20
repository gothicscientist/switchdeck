import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import '../assets/part-names.js';
import {normalize,builderPart,SOURCES} from '../scripts/catalog-lib.mjs';
const {name,part}=globalThis.SwitchdeckNames;

test('retailer SEO is removed while the complete colourway remains',()=>{
  const title='Taihao Blue Glacial Lake double shot keycaps for diy gaming mechanical keyboard Cubic OEM Profile for XD64 BM60 BM68 BM80 BM65';
  assert.equal(name(title,'keycaps','KPrepublic'),'Taihao Blue Glacial Lake');
  assert.equal(name('Egyptian 9009 colorway cherry profile Dye Sub Keycap Set thick PBT plastic keyboard gh60 xd60','keycaps'),'Egyptian 9009');
  assert.equal(name('[Preorder] GMK CYL Botanical V2 Keycap Set','keycaps','GMK'),'CYL Botanical V2');
  assert.equal(name('Keychron ISO & ANSI Q1 & Q1 Pro & Q2 & K2 Pro OEM Dye-Sub PBT Keycap Set - Retro','keycaps','Keychron'),'OEM Retro');
});

test('all part categories shed marketing and compatibility tails',()=>{
  for(const [input,cat,expected] of [
    ['Gateron Oil King Linear Switches 5pin RGB for Mechanical Keyboard','switches','Gateron Oil King'],
    ['Zoom75 Wireless Mechanical Keyboard','case','Zoom75'],
    ['DZ60 RGB V2 PCB for mechanical keyboard','pcb','DZ60 RGB V2 PCB'],
    ['Tofu65 Brass Plate for mechanical keyboard','plate','Tofu65 Brass Plate'],
    ['Everglide V2 Stabilizers for Custom Mechanical Keyboard gh60 xd64','stabs','Everglide V2'],
    ['Krytox 205g0 lubricant for mechanical keyboard','extras','Krytox 205g0 lubricant'],
    ['Botanical Deskmat for mechanical keyboard','deskmats','Botanical Deskmat'],
  ])assert.equal(name(input,cat),expected,input);
});

test('revisions and selected variants remain distinguishable',()=>{
  assert.notEqual(name('Jade Switches V2','switches'),name('Jade Switches V3','switches'));
  assert.equal(name('Jade Switches V2','switches'),'Jade V2');
  assert.notEqual(name('Jade Switches · 45g','switches'),name('Jade Switches · 55g','switches'));
  assert.notEqual(name('Botanical Keycaps · Base','keycaps'),name('Botanical Keycaps · Novelties','keycaps'));
  assert.equal(name('Botanical Keycaps · Botanical / UK-ISO','keycaps'),'Botanical · UK-ISO');
});

test('existing catalog names stay nonempty and normalization preserves purchase and fit data',async()=>{
  const ctx={window:{}};
  vm.runInNewContext(await readFile(new URL('../data/builder-catalog.js',import.meta.url),'utf8'),ctx);
  const parts=Object.values(ctx.window.SWITCHDECK_CATALOG).filter(Array.isArray).flat();
  assert.ok(parts.length>1000);
  for(const p of parts){const n=part(p);assert.ok(n.name.trim(),p.id);assert.deepEqual(part(n),n,'idempotent '+p.id);for(const key of Object.keys(p).filter(k=>k!=='name'))assert.deepEqual(n[key],p[key],p.id+' '+key)}
  const lake=parts.find(p=>/Taihao Blue Glacial Lake/.test(p.name));
  assert.equal(part(lake).name,'Taihao Blue Glacial Lake');
});

test('future imports use the same names without changing source titles or specs',()=>{
  const raw={id:123,title:'Gateron Oil King Linear Switches 5pin RGB for Mechanical Keyboard',handle:'oil-king',vendor:'Gateron',product_type:'Switches',tags:[],body_html:'MX Switch. Actuation force: 55g. Total travel: 4mm. 5-pin. 10 switches per pack.',images:[{src:'https://cdn.shopify.com/oil.jpg'}],options:[],variants:[{id:456,title:'Default Title',price:'7',available:true}]};
  const listing=normalize(raw,SOURCES[1],'2026-10-20T00:00:00Z');
  assert.equal(listing.name,raw.title);assert.equal(listing.displayName,'Oil King');
  const builder=builderPart(listing);assert.equal(builder.name,'Oil King');assert.equal(builder.pins,5);assert.equal(builder.force,55);assert.match(builder.retailers[0].url,/variant=456$/);
});

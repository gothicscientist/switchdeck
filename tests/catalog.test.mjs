import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {normalize,extractSpecs,category,packQuantity,builderPart,SOURCES} from '../scripts/catalog-lib.mjs';

const source=SOURCES[1];
const raw=(changes={})=>({id:123,title:'Gateron Example Linear Switches',handle:'example-switch',vendor:'Gateron',product_type:'Switches',tags:['MX Switch'],body_html:'<ul><li>Actuation: 45g</li><li>Total Travel: 3.6mm</li><li>5-Pin, PCB Mount</li><li>18 included in each pack</li></ul>',images:[{src:'https://cdn.shopify.com/example.jpg'}],options:[],variants:[{id:456,title:'18 Set',price:'9.00',available:true}],...changes});
test('separate actuation, bottom-out, travel and tolerance values',()=>{
  const s=extractSpecs(raw({body_html:'<p>3.0±0.2mm total travel (Pre-Travel: 1.7±0.4mm)</p><table><tr><td>Spring Weight</td><td>60±15gf operating force</td></tr><tr><td>Bottom-out Force</td><td>70g</td></tr></table>'}),'switches');
  assert.equal(s.totalTravelMm,3);assert.equal(s.preTravelMm,1.7);assert.equal(s.actuationForceG,60);assert.equal(s.bottomOutForceG,70);
});
test('unknown force is not filled with bottom-out weight',()=>{
  const s=extractSpecs(raw({body_html:'<li>Bottom-out: 65g</li>'}),'switches');assert.equal(s.actuationForceG,undefined);assert.equal(s.bottomOutForceG,65);
});
test('magnetic, optical and low-profile systems never enter standard-MX builder',()=>{
  for(const title of ['Gateron Magnetic Jade HE Linear Switches','Keychron Optical Linear Switches','Gateron KS-33 Low Profile Linear Switches']) {
    const p=normalize(raw({title}),source,'2026-10-19T00:00:00Z');assert.notEqual(p.specs.system,'mx-mechanical');assert.equal(builderPart(p),null);
  }
});
test('incorrect collection tags do not turn a normal switch into low-profile',()=>{
  const p=normalize(raw({tags:['MX Switch','Low Profile']}),source,'2026-10-19T00:00:00Z');assert.equal(p.specs.system,'mx-mechanical');
});
test('pack price stays separate from unit price and variant URL',()=>{
  const p=normalize(raw(),source,'2026-10-19T00:00:00Z');assert.equal(p.variants[0].quantity,18);assert.equal(p.variants[0].unitPrice,.5);assert.equal(p.priceMin,9);assert.match(p.variants[0].url,/variant=456$/);assert.equal(builderPart(p).packPrice,9);
});
test('ambiguous switch quantity or variant cannot become a builder part',()=>{
  const p=normalize(raw({body_html:'Actuation: 45g\nTotal Travel: 3.6mm\n5-pin',variants:[{id:456,title:'Default Title',price:'9',available:true}]}),source,'2026-10-19T00:00:00Z');assert.equal(p.variants[0].quantity,null);assert.equal(builderPart(p),null);
  const multi=normalize(raw({variants:[{id:1,title:'18 Set / 45g',price:'9',available:true},{id:2,title:'18 Set / 55g',price:'10',available:true}]}),source,'2026-10-19T00:00:00Z');
  // Spring weights become separate parts; a weight with no stated meaning is not reported as actuation force.
  const split=builderPart(multi);assert.equal(split.length,2);assert.deepEqual(split.map(x=>x.name),['Example Linear Switches · 45g','Example Linear Switches · 55g']);assert.ok(split.every(x=>x.force===null&&x.id.startsWith(multi.id+'~')));
});
test('quantity parsing does not confuse force weight with pack count',()=>{
  assert.equal(packQuantity(raw({body_html:'',options:[{name:'Spring weight'}]}),{title:'45'},'switches'),null);
  assert.equal(packQuantity(raw({body_html:'',options:[{name:'Quantity'}]}),{title:'36'},'switches'),36);
  assert.equal(packQuantity(raw(),{title:'45g'},'switches'),18);assert.equal(packQuantity(raw({body_html:''}),{title:'45g'},'switches'),null);
});
test('exclude unrelated products and distinguish replacement components',()=>{
  for(const title of ['Gift Card','Keyboard Build Service','Switch Sample Pack','Mouse','Keyboard Carrying Case'])assert.equal(category(raw({title,product_type:''})),null);
  assert.equal(category(raw({title:'Q1 Brass Plate',product_type:'Custom Keyboards'})),'plate');
  assert.equal(category(raw({title:'Switch opener',product_type:'Accessories'})),'extras');
  assert.equal(category(raw({title:'KBDfans DZ60 PCB',product_type:'PCB'})),'pcb');
  assert.equal(category(raw({title:'Athena 1800 with PBTfans BOW',product_type:'Keyboard'})),'keyboards');
  assert.equal(category(raw({title:'Holy80 Keyboard with keycaps',product_type:'Keyboard'})),'keyboards');
  assert.equal(category(raw({title:'Calla TKL Accessories',product_type:'Keyboard Kit'})),'extras');
});
test('no missing photos, invalid prices, or disallowed URL protocols',()=>{
  assert.equal(normalize(raw({images:[]}),source,''),null);
  assert.equal(normalize(raw({variants:[{id:1,price:'0'}]}),source,''),null);
  assert.equal(normalize(raw({images:[{src:'javascript:alert(1)'}]}),source,''),null);
});
test('generic Shopify vendor is replaced by published manufacturer',()=>{
  const p=normalize(raw({vendor:'Stocked'}),source,'2026-10-19T00:00:00Z');assert.equal(p.brand,'Gateron');
});
test('site scripts compile and builder rounds switch purchases to whole packs',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean).join('\n');new vm.Script(inline);
  const ctx={window:{},localStorage:{getItem:()=>null}};vm.createContext(ctx);
  vm.runInContext(await readFile(new URL('../data/builder-catalog.js',import.meta.url),'utf8'),ctx);
  const beforeRendering=inline.slice(0,inline.indexOf('const LAYOUTS ='));
  vm.runInContext(beforeRendering,ctx);
  assert.equal(vm.runInContext('switchCost({packQuantity:18,packPrice:9,price:.5},70)',ctx),36);
  assert.equal(vm.runInContext('switchCost({packQuantity:36,packPrice:12.24,price:.34},90)',ctx),36.72);
  assert.equal(vm.runInContext('switchCost({price:.5},70)',ctx),35);
  assert.equal(vm.runInContext('cleanBuild({case:"missing",switches:"removed",extras:["puller","removed"]}).switches',ctx),null);
});
test('builder admits kits, keycap sets and stabilizers only with the facts it needs',()=>{
  const kb=(changes={})=>normalize(raw({title:'Example65 Barebones Keyboard Kit',product_type:'Keyboard Kit',vendor:'Example',body_html:'<li>Layout: 65%</li><li>Hot-swap PCB</li><li>Mount: Gasket</li>',options:[{name:'Color',values:['Black','White']}],variants:[{id:1,title:'Black',price:'129',available:true},{id:2,title:'White',price:'129',available:true}],...changes}),source,'2026-10-19T00:00:00Z');
  const k=builderPart(kb());assert.equal(k.cat,'case');assert.equal(k.layout,'65');assert.equal(k.kit.pcb.hotswap,true);assert.equal(k.kit.plate,null);assert.equal(k.kit.stabs,null);assert.deepEqual(k.colors.map(c=>c[0]),['Black','White']);
  assert.equal(builderPart(kb({title:'Example40 Keyboard Kit',body_html:'40% layout'})),null);
  assert.equal(builderPart(kb({title:'Example65 Magnetic HE Keyboard'})),null);
  assert.equal(builderPart(kb({title:'Example65 Keyboard Kit (UK ISO Layout)'})),null);
  assert.equal(builderPart(kb({variants:[{id:1,title:'Black',price:'129',available:false}]})),null);
  const caps=(changes={})=>normalize(raw({title:'Example Keycap Set',product_type:'Keycaps',body_html:'Cherry profile, PBT, dye-sub, 129 keys',variants:[{id:1,title:'Base',price:'60',available:true},{id:2,title:'Numpad',price:'20',available:true}],...changes}),source,'2026-10-19T00:00:00Z');
  const c=builderPart(caps());assert.equal(c.profile,'Cherry');assert.equal(c.price,60);assert.ok(c.covers.includes('full'));
  assert.equal(builderPart(caps({variants:[{id:1,title:'Kit A',price:'60',available:true},{id:2,title:'Kit B',price:'20',available:true}]})),null,'ambiguous kit choice');
  assert.equal(builderPart(caps({body_html:'PBT, dye-sub'})),null,'no profile');
  const stab=normalize(raw({title:'Example Plate Mount Stabilizers',product_type:'Stabilizers',body_html:'Unlike screw-in stabilizers these clip into the plate'}),source,'2026-10-19T00:00:00Z');
  assert.equal(builderPart(stab).mount,'plate');
});
test('switches with pack-size variants are admitted at the cheapest unit price',()=>{
  const p=normalize(raw({options:[{name:'Quantity'}],body_html:'Linear. 5-pin.',variants:[{id:1,title:'10',price:'6',available:true},{id:2,title:'70',price:'35',available:true}]}),source,'2026-10-19T00:00:00Z');
  const b=builderPart(p);assert.equal(b.packQuantity,70);assert.equal(b.price,.5);assert.equal(b.verified,false);assert.equal(b.force,null);
});
test('pack counts of unknown size are not switch quantities',()=>{
  assert.equal(packQuantity(raw({body_html:''}),{title:'1 pack'},'switches'),null);
  assert.equal(packQuantity(raw({body_html:''}),{title:'3 packs'},'switches'),null);
  assert.equal(packQuantity(raw({body_html:''}),{title:'Linear / 35 Pieces'},'switches'),35);
  assert.equal(packQuantity(raw({body_html:''}),{title:'10-pack'},'switches'),10);
});
test('store titles that describe switches for keyboards are switches',()=>{
  assert.equal(category(raw({title:'Gateron North Pole Switch Linear 50g 5pin SMD RGB mx stem switch for mechanical keyboard',product_type:''})),'switches');
  assert.equal(category(raw({title:'Example 65% Hot-swap Keyboard with 5pin Gateron switches',product_type:''})),'keyboards');
});

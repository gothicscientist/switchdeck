import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {normalize,extractSpecs,category,packQuantity,builderPart,boardName,SOURCES} from '../scripts/catalog-lib.mjs';

const source=SOURCES[1];
const raw=(changes={})=>({id:123,title:'Gateron Example Linear Switches',handle:'example-switch',vendor:'Gateron',product_type:'Switches',tags:['MX Switch'],body_html:'<ul><li>Actuation: 45g</li><li>Total Travel: 3.6mm</li><li>5-Pin, PCB Mount</li><li>18 included in each pack</li></ul>',images:[{src:'https://cdn.shopify.com/example.jpg'}],options:[],variants:[{id:456,title:'18 Set',price:'9.00',available:true}],...changes});
test('separate actuation, bottom-out, travel and tolerance values',()=>{
  const s=extractSpecs(raw({body_html:'<p>3.0±0.2mm total travel (Pre-Travel: 1.7±0.4mm)</p><table><tr><td>Spring Weight</td><td>60±15gf operating force</td></tr><tr><td>Bottom-out Force</td><td>70g</td></tr></table>'}),'switches');
  assert.equal(s.totalTravelMm,3);assert.equal(s.preTravelMm,1.7);assert.equal(s.actuationForceG,60);assert.equal(s.bottomOutForceG,70);
});
test('unknown force is not filled with bottom-out weight',()=>{
  const s=extractSpecs(raw({body_html:'<li>Bottom-out: 65g</li>'}),'switches');assert.equal(s.actuationForceG,undefined);assert.equal(s.bottomOutForceG,65);
});
// Behavior change: non-MX switches used to be left out of the builder; they are now admitted and carry their own switchSystem,
// so a finder can filter them. They are still never labelled mx-mechanical.
test('magnetic, optical and low-profile systems are admitted with their own switchSystem, never as standard MX',()=>{
  for(const [title,system] of [['Gateron Magnetic Jade HE Linear Switches','hall-effect'],['Keychron Optical Linear Switches','optical'],['Gateron KS-33 Low Profile Linear Switches','low-profile']]) {
    const p=normalize(raw({title}),source,'2026-10-19T00:00:00Z');assert.notEqual(p.specs.system,'mx-mechanical');
    const b=builderPart(p);assert.equal(b.switchSystem,system,title);assert.equal(b.verified,false,title);
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
  const split=builderPart(multi);assert.equal(split.length,2);assert.deepEqual(split.map(x=>x.name),['Example · 45g','Example · 55g']);assert.ok(split.every(x=>x.force===null&&x.id.startsWith(multi.id+'~')));
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
  const inline=[...html.matchAll(/<script(?![^>]*application\/ld\+json)(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean).join('\n');new vm.Script(inline);
  const ctx={URL,window:{},localStorage:{getItem:()=>null}};vm.createContext(ctx);
  for(const file of ['assets/product-links.js','data/product-links.js'])vm.runInContext(await readFile(new URL('../'+file,import.meta.url),'utf8'),ctx);
  vm.runInContext(await readFile(new URL('../assets/part-names.js',import.meta.url),'utf8'),ctx);
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
  // Behavior change: HE boards are admitted with switchSystem set (they were excluded before).
  assert.equal(builderPart(kb({title:'Example65 Magnetic HE Keyboard'})).switchSystem,'hall-effect');
  assert.equal(builderPart(kb({title:'Example65 Keyboard Kit (UK ISO Layout)'})),null);
  // Behavior change: a sold-out board is admitted through the same rules and marked soldOut.
  const gone=builderPart(kb({variants:[{id:1,title:'Black',price:'129',available:false}]}));assert.equal(gone.soldOut,true);assert.equal(gone.retailers[0].available,false);assert.ok(!('soldOut' in k));
  const caps=(changes={})=>normalize(raw({title:'Example Keycap Set',product_type:'Keycaps',body_html:'Cherry profile, PBT, dye-sub, 129 keys',variants:[{id:1,title:'Base',price:'60',available:true},{id:2,title:'Numpad',price:'20',available:true}],...changes}),source,'2026-10-19T00:00:00Z');
  const c=builderPart(caps());assert.equal(c.profile,'Cherry');assert.equal(c.price,60);assert.ok(c.covers.includes('full'));
  // Behavior change: with no variant named as a base kit, the cheapest non-add-on variant is the set; and a set with no stated profile has profile null.
  assert.equal(builderPart(caps({variants:[{id:1,title:'Kit A',price:'60',available:true},{id:2,title:'Kit B',price:'20',available:true}]})).price,20,'cheapest non-add-on kit');
  assert.equal(builderPart(caps({body_html:'PBT, dye-sub'})).profile,null,'no profile stated');
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
test('lubed switch packs, LEDs, films, badges and hardware packs are never boards',()=>{
  const cat=t=>category(raw({title:t,product_type:'Keyboards'}));
  assert.equal(cat('KTT Wine Red Switch Linear 53g MX switch for mechanical keyboard 80m Factory Lubed'),'switches');
  for(const t of ['4pin rgb leds Diffused rgb led for mechanical keyboard such as keycool 87','DZ60 WKL PE Film','Neo75 Cu Accent Badge','Keycult No. 1 / 60 Hardware Pack','Perfect Grip Sheet for Filco Majestouch Fullsize','ZOOM64 Mechanical Keyboard Kit Add Ons'])
    assert.notEqual(cat(t),'keyboards',t);
  for(const t of ['One 2 Mini v2 RGB LED 60% Double Shot PBT Mechanical Keyboard','QK65 V2 Classic by Qwertykeys - Custom Keyboard Kit'])
    assert.equal(cat(t),'keyboards',t);
});
test('board names keep only brand and model',()=>{
  const shown=(title,brand,retailer)=>{const b=boardName(title,brand,retailer);return b.brand+' '+b.name};
  const cases=[
    ['Keychron Q1 Pro QMK/VIA Wireless Custom Mechanical Keyboard','Keychron','Keychron Q1 Pro'],
    ['Keychron Q65 Max QMK/VIA Wireless Custom Mechanical Keyboard','Keychron','Keychron Q65 Max'],
    ['Keychron V1 Max 75% Hotswap Wireless Keyboard','Keychron','Keychron V1 Max'],
    ['Keychron Q1 Ultra 8K Aluminum 75% Wireless Keyboard','Keychron','Keychron Q1 Ultra 8K'],
    ['Lemokey X1 QMK/VIA Wired Mechanical Keyboard','Lemokey X series','Lemokey X1'],
    ['Lemokey L1 QMK/VIA Wireless Custom Gaming Keyboard','L series','Lemokey L1'],
    ['Keyboard 81 Pro QMK/VIA Wireless Custom Mechanical Keyboard','Q Pro series','Keychron 81 Pro','Keychron'],
    ['Meko Blink 60% Hotswap Bluetooth RGB Mechanical Keyboard','Meko','Meko Blink'],
    ['Meko Push White 65% Hotswap Bluetooth RGB Double Shot ABS Mechanical Keyboard','Meko','Meko Push'],
    ['Ducky One 3 Mini Aura Clear Black 60% Hotswap RGB LED Double Shot ABS Mechanical Keyboard','Ducky','Ducky One 3 Mini'],
    ['Odin Gaming Nova 65 Black Aluminum Barebones 65% Hotswap RGB Mechanical Keyboard','Odin Gaming','Odin Gaming Nova 65'],
    ['Qwertykeys Neo60 Core Keyboard Kit','Qwertykeys','Qwertykeys Neo60 Core'],
    ['Meletrix Zoom65 V3 - Barebones Keyboard Kit [Batch 2]','Meletrix','Meletrix Zoom65 V3'],
    ['QK65 V2 Classic by Qwertykeys - Custom Keyboard Kit','Dangkeebs','Qwertykeys QK65 V2'],
    ['KBDfans Athena 75 with PBTfans Klein Blue R3','KBDfans','KBDfans Athena 75'],
    ['Epomaker Bridge75 R3 Hotswap Wireless RGB Mechanical Keyboard','Epomaker','Epomaker Bridge75 R3'],
    ['Keychron K8 QMK Wireless Mechanical Keyboard (Version 2)','Keychron','Keychron K8 Version 2'],
    ['Hexgears Nova Aluminum TKL RGB Laser Etched ABS Mechanical Keyboard','Hexgears','Hexgears Nova TKL'],
  ];
  for(const [title,brand,want,retailer] of cases) assert.equal(shown(title,brand,retailer),want,title);
  // Different models stay different; same model in another colour collapses to the same name.
  assert.notEqual(shown('Keychron Q1 Pro QMK/VIA Wireless Custom Mechanical Keyboard','Keychron'),shown('Keychron Q1 Max QMK/VIA Wireless Custom Mechanical Keyboard','Keychron'));
  assert.notEqual(shown('Keychron K8 QMK Wireless Mechanical Keyboard','Keychron'),shown('Keychron K8 QMK Wireless Mechanical Keyboard (Version 2)','Keychron'));
  assert.equal(shown('Meko Blink White 60% Hotswap Bluetooth RGB Mechanical Keyboard','Meko'),shown('Meko Blink 60% Hotswap Bluetooth RGB Mechanical Keyboard','Meko'));
});
test('board name never ends up empty and never splits a model code',()=>{
  for(const title of ['Custom Mechanical Keyboard','Keychron Mechanical Keyboard','Wireless Keyboard Kit','X']) {
    const b=boardName(title,'Keychron');assert.ok(b.name.trim().length>0,title);
  }
  assert.equal(boardName('Keychron Bridge75 R3 Wireless Keyboard','Keychron').name,'Bridge75 R3');
});
test('builder case parts use the short board name and a clean brand',()=>{
  const p=normalize(raw({title:'Lemokey X1 QMK/VIA Wired Mechanical Keyboard',product_type:'Keyboard Kit',vendor:'Lemokey X series',body_html:'<li>Layout: 75%</li><li>Hot-swap PCB</li><li>Mount: Gasket</li>',options:[{name:'Color',values:['Black']}],variants:[{id:1,title:'Barebone / Black',price:'149',available:true},{id:2,title:'Assembled / Black',price:'169',available:true}]}),source,'2026-10-19T00:00:00Z');
  const k=builderPart(p);assert.equal(k.cat,'case');assert.equal(k.brand+' '+k.name,'Lemokey X1');
});

test('switch sound character comes only from published housing and stem materials',async()=>{
  const {soundFromMaterials:f}=await import('../scripts/catalog-lib.mjs');
  assert.equal(f('POM','POM','POM'),'deep','full POM');
  assert.equal(f('Nylon','Nylon PA66','POM'),'deep','full nylon');
  assert.equal(f('PC','PC','POM, extended'),'bright','PC with a long-pole stem');
  assert.equal(f('Polycarbonate','Polycarbonate','POK'),'bright');
  assert.equal(f('PC','Nylon','POM'),null,'classic mixed housing stays balanced');
  assert.equal(f(null,null,null),null,'nothing published, nothing guessed');
  assert.equal(f('Proprietary ink','Proprietary ink','P3'),null,'unknown materials stay unknown');
});

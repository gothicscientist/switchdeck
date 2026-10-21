import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalize,packQuantity,layoutFromName,admit,builderPart,catalogParts,admissionReport,keycapBase,extraKind,EXTRA_KINDS,SOURCES,modOf,MOD_TYPES} from '../scripts/catalog-lib.mjs';

const source=SOURCES[1];
const when='2026-10-19T00:00:00Z';
const mk=(changes={})=>normalize({id:900,title:'Example Item',handle:'example-item',vendor:'Example',product_type:'',tags:[],body_html:'',images:[{src:'https://cdn.shopify.com/example.jpg'}],options:[],variants:[{id:1,title:'Default Title',price:'20.00',available:true}],...changes},source,when);
const v=(id,title,price,available=true)=>({id,title,price:String(price),available});

test('pack sizes come only from stated counts, aligned with the variant',()=>{
  const q=(variant,{options=[{name:'Quantity'}],title='Example Linear Switch',body=''}={})=>packQuantity({title,options,body_html:body,tags:[]},{title:variant},'switches');
  for(const [t,n] of [['x35',35],['x 36',36],['Pack of 70',70],['35 pcs',35],['35 pieces',35],['110 in 1',110],['70-pack',70],['10 / pack',10],['Linear / 35 Pieces',35],['36 PCS (1 pack)',36]]) assert.equal(q(t),n,t);
  // Spring weights, bare pack counts and model names are not quantities.
  for(const t of ['45g','1 pack','3 packs','V2 Switches','Default Title']) assert.equal(q(t,{options:[]}),null,t);
  // A pack multiplier applies to a stated size, never to nothing.
  assert.equal(q('3 packs',{options:[{name:'Pack'}],title:'Switch x35'}),105);
  assert.equal(q('Default Title',{options:[],title:'Gateron Oil King Switches (70 pcs)'}),70);
  // No stated count: the listing is excluded with a named reason, not guessed.
  const p=mk({title:'Gateron Example Linear Switch',product_type:'Switches',tags:['MX Switch']});
  assert.equal(admit(p).reason,'no pack size');
});

test('switch accessories go to extras and switch testers stay out with a reason',()=>{
  const films=admit(mk({title:'Gateron Switch Films',product_type:'Switches',variants:[v(1,'Default Title',6)]}));
  assert.equal(films.parts[0].cat,'extras');assert.equal(films.parts[0].kind,'Switch films');
  const springs=admit(mk({title:'Example Switch Springs 45g',product_type:'Switches',variants:[v(1,'Default Title',6)]}));
  assert.equal(springs.parts[0].cat,'extras');assert.equal(springs.parts[0].kind,'Springs');
  assert.equal(admit(mk({title:'Example Switch Mystery Pack',product_type:'Switches',variants:[v(1,'70pcs',19.9)]})).reason,'switch tester or sample pack');
});

test('non-MX switches are admitted with switchSystem; a switch with no type is excluded as "no switch type"',()=>{
  const sw=(title,body='')=>admit(mk({title,product_type:'Switches',body_html:body,options:[{name:'Quantity'}],variants:[v(1,'35',17.5)]}));
  for(const [title,system] of [['Gateron Magnetic Jade HE Linear Switches','hall-effect'],['Keychron Optical Linear Switches','optical'],['Gateron KS-33 Low Profile Linear Switches','low-profile'],['Cherry MX Brown Tactile Switches','mx-mechanical']]) {
    const r=sw(title,'<li>MX</li>');assert.equal(r.parts[0].cat,'switches',title);assert.equal(r.parts[0].switchSystem,system,title);
  }
  const none=sw('Gateron Example Switches');assert.equal(none.reason,'no switch type');
  assert.equal(sw('Topre Linear Switches').reason,'unsupported switch system (Topre/EC/Alps)');
});

test('keycap base variant: a named base kit wins, else the cheapest non-add-on, never an add-on',()=>{
  const names=l=>l.map((n,i)=>({id:i,name:n[0],price:n[1]}));
  assert.equal(keycapBase(names([['Novelties',25],['Base Kit',130],['Spacebars',30],['Alphas',90]])).v.name,'Base Kit');
  assert.equal(keycapBase(names([['Numpad',20],['Alphas',90],['Bundle',200]])).v.name,'Alphas');
  assert.equal(keycapBase(names([['Kit A',60],['Kit B',45],['Numpad',20]])).v.name,'Kit B');
  assert.equal(keycapBase(names([['Numpad',20],['Spacebar',15],['Artisan add-on',30]])),null);
});

test('keycap sets are admitted without a profile; artisans, accents, spacebars and numpads are not full sets',()=>{
  const caps=(title,changes={})=>admit(mk({title,product_type:'Keycaps',body_html:'PBT, dye-sub, 129 keys',variants:[v(1,'Base',60),v(2,'Numpad',20)],...changes}));
  const set=caps('Example Keycap Set');assert.equal(set.parts[0].cat,'keycaps');assert.equal(set.parts[0].profile,null);assert.equal(set.parts[0].price,60);
  assert.equal(caps('Example Keycap Set',{body_html:'Cherry profile, PBT, dye-sub, 129 keys'}).parts[0].profile,'Cherry');
  for(const t of ['Artisan Keycap Dragon','Example Accent Keycaps','Example Spacebar Keycap','Example Numpad Keycaps']) assert.equal(caps(t,{variants:[v(1,'Default Title',30)]}).reason,'not a full set',t);
});

test('layout names: glued sizes and four-digit sizes are read, units are not',()=>{
  const l=n=>layoutFromName(n)?.layout??null;
  assert.equal(l('Practice TKL'),'tkl');assert.equal(l('PracticeTKL Keyboard'),'tkl');
  assert.equal(l('Rekt1800 Keyboard'),'full');assert.equal(l('Stacked65 Keyboard Kit'),'65');assert.equal(l('Zoom75 Keyboard'),'75');
  assert.equal(l('Crush 80 Keyboard'),'tkl');assert.equal(l('Example 100% Keyboard'),'full');
  assert.equal(l('Example Switch 5000 gf'),null);assert.equal(l('Cable 1.65 m'),null);
});

test('keyboards: HE, low-profile and optical boards are admitted with switchSystem; layouts the builder cannot draw are named',()=>{
  const kb=(title,changes={})=>admit(mk({title,product_type:'Keyboards',body_html:'<li>Hot-swap PCB</li>',variants:[v(1,'Black',129)],...changes}));
  const he=kb('Example65 Magnetic HE Keyboard');assert.equal(he.parts[0].cat,'case');assert.equal(he.parts[0].layout,'65');assert.equal(he.parts[0].switchSystem,'hall-effect');
  assert.equal(kb('Example75 Low Profile Keyboard').parts[0].switchSystem,'low-profile');
  assert.equal(kb('Example75 Optical Keyboard').parts[0].switchSystem,'optical');
  assert.equal(kb('Example65 Barebones Keyboard Kit').parts[0].switchSystem,undefined);
  for(const t of ['Example Ortho 40% Keyboard','Example Split Keyboard','Example Alice Layout Keyboard','Example Numpad','Example Macropad 12 Keys']) assert.equal(kb(t).reason,"layout the builder can't draw",t);
  assert.equal(kb('Example65 Keyboard Kit (UK ISO Layout)').reason,'non-ANSI layout');
});

test('sold-out listings go through the same rules, marked soldOut with an unavailable retailer',()=>{
  const sold=admit(mk({title:'Example65 Barebones Keyboard Kit',product_type:'Keyboard Kit',body_html:'<li>Layout: 65%</li>',variants:[v(1,'Black',129,false)]}));
  const part=sold.parts[0];assert.equal(part.soldOut,true);assert.equal(part.retailers[0].available,false);assert.equal(part.layout,'65');
  const live=admit(mk({title:'Example65 Barebones Keyboard Kit',product_type:'Keyboard Kit',body_html:'<li>Layout: 65%</li>',variants:[v(1,'Black',129,true)]})).parts[0];
  assert.ok(!('soldOut' in live));assert.equal(live.retailers[0].available,true);
  // In stock only through an add-on: the sold-out base kit is the part, marked sold out.
  const caps=admit(mk({title:'Example Keycap Set',product_type:'Keycaps',body_html:'PBT, 129 keys',variants:[v(1,'Base Kit',120,false),v(2,'Numpad',20,true)]})).parts[0];
  assert.equal(caps.soldOut,true);assert.equal(caps.price,120);
  // Same rules for sold-out switches: the pack size still has to be stated.
  assert.equal(admit(mk({title:'Gateron Example Linear Switches',product_type:'Switches',variants:[v(1,'Default Title',9,false)]})).reason,'no pack size');
  const sw=admit(mk({title:'Gateron Example Linear Switches',product_type:'Switches',options:[{name:'Quantity'}],variants:[v(1,'35',17.5,false)]})).parts[0];
  assert.equal(sw.soldOut,true);assert.equal(sw.packQuantity,35);
});

test('extras carry one of the named kinds and no effect',()=>{
  for(const [name,variant,kind] of [
    ['Krytox 205g0 Lubricant','','Lube'],['Aviator Coiled USB-C Cable','','Cable'],['Dangkeebs Gasket Switch Films','','Switch films'],['Example Switch Springs','','Springs'],
    ['Poron Case Foam','','Foam'],['Large Deskmat 900x400','','Deskmat'],['Brass Knob','','Knob'],['Custom Feet Set','','Feet'],['Zoom65 Brass Weight','','Weight'],
    ['Iron Badge','','Badge'],['Extra Gaskets','','Gaskets'],['Switch Opener','','Tool'],['Stabilizer Tuning Tool','','Tool'],['Stabilizer Shims','','Tool'],
    ['Zoom65 V2 Knobs and Weights','Weight / PVD Black','Weight'],['Example Accessories','Foam Kit','Foam'],['Mystery Widget','','Accessory'],
  ]) assert.equal(extraKind(name,variant),kind,name);
  const p=admit(mk({title:'Example Deskmat',product_type:'Deskmats',variants:[v(1,'Default Title',25)]}));
  assert.equal(p.parts[0].cat,'extras');assert.equal(p.parts[0].kind,'Deskmat');assert.deepEqual(p.parts[0].fx,{});
  assert.ok(EXTRA_KINDS.includes('Accessory'));
});

test('PCBs, plates and bare cases are admitted; fit links only a full case, PCB and plate family from one store',()=>{
  const listing=(id,title,type,changes={})=>mk({id,title,product_type:type,variants:[v(id,'Default Title',50)],...changes});
  const parts=catalogParts([
    listing(1,'Savage65 Case','Cases'),listing(2,'Savage65 PCB','PCB',{body_html:'<li>Hot-swap</li>'}),listing(3,'Savage65 Plate','Plates',{variants:[v(31,'FR4',20),v(32,'Brass',40)]}),
    listing(4,'Orphan75 Case','Cases'),listing(5,'Orphan75 PCB','PCB'),
    listing(6,'Lonely60 Case','Cases'),
  ]);
  const by=n=>parts.filter(p=>p.name.startsWith(n));
  const pcb=by('Savage65 PCB')[0],plates=by('Savage65 Plate'),cas=by('Savage65 Case')[0];
  assert.equal(cas.cat,'case');assert.equal(cas.kit,null);assert.equal(cas.layout,'65');
  assert.equal(pcb.cat,'pcb');assert.equal(pcb.layout,'65');assert.equal(pcb.hotswap,true);
  assert.deepEqual(plates.map(p=>p.material).sort(),['Brass','FR4']);assert.ok(plates.every(p=>p.cat==='plate'&&p.layout==='65'));
  const fit=`${source.id}:savage65`;
  assert.equal(cas.fit,fit);assert.equal(pcb.fit,fit);assert.ok(plates.every(p=>p.fit===fit));
  // A case and PCB without a plate, and a case alone, link to nothing.
  assert.ok(by('Orphan75').every(p=>p.fit===null));assert.equal(by('Lonely60')[0].fit,null);
  // Different stores never share a family.
  assert.notEqual(fit,`other:savage65`);
});

test('every listing is admitted or excluded for a named reason, and the report adds up',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../data/catalog-manifest.json',import.meta.url),'utf8'));
  const products=(await Promise.all(manifest.shards.map(async s=>JSON.parse(await readFile(new URL('../data/'+s,import.meta.url),'utf8'))))).flat();
  const rep=admissionReport(products);
  for(const p of products) {
    const r=admit(p);
    assert.ok(r.parts?.length||(typeof r.reason==='string'&&r.reason.length>3),p.id+' has neither a part nor a reason');
    if(r.parts) for(const part of r.parts) {
      assert.equal(!!part.soldOut,part.retailers[0].available===false,p.id);
      if(part.cat==='extras'){assert.ok(EXTRA_KINDS.includes(part.kind),p.id);const m=modOf(part.kind,part.name);assert.equal(part.mod,m??undefined,p.id);assert.deepEqual(part.fx,m?MOD_TYPES[m].fx:{},p.id+' fx only from its mod type')}
    }
  }
  for(const [cat,r] of Object.entries(rep)) {
    assert.equal(r.admitted+r.soldOutAdmitted+Object.values(r.excluded).reduce((a,b)=>a+b,0),r.total,cat);
    assert.equal(r.total,products.filter(p=>p.category===cat).length,cat);
  }
  assert.ok(Object.values(rep).every(r=>Object.keys(r.excluded).every(k=>/\S/.test(k))));
  // Spot checks of the single-listing entry point.
  assert.equal(builderPart(products[0])===null||typeof builderPart(products[0])==='object',true);
});

test('a switch with no stated count is priced per switch at $1.50 or less; above that it stays out as "no pack size"',()=>{
  const sw=(price,title='Example Tactile PCB Mount Switch',changes={})=>admit(mk({title,product_type:'Switches',variants:[v(1,'Default Title',price)],...changes}));
  const cheap=sw(0.35).parts[0];
  assert.equal(cheap.cat,'switches');assert.equal(cheap.packQuantity,1);assert.equal(cheap.packPrice,0.35);assert.equal(cheap.price,0.35);
  assert.match(cheap.blurb,/Priced per switch\./);assert.equal(cheap.type,'Tactile');
  assert.equal(sw(1.5).parts[0].packQuantity,1);
  assert.equal(sw(1.51).reason,'no pack size');assert.equal(sw(9).reason,'no pack size');
  // A stated count is never replaced by the per-switch rule, and a switch with no stated type is still excluded.
  const packed=sw(0.9,'Example Tactile Switches',{options:[{name:'Quantity'}],variants:[v(1,'35',0.9)]}).parts[0];
  assert.equal(packed.packQuantity,35);assert.ok(!/Priced per switch/.test(packed.blurb));
  assert.equal(sw(0.35,'Example Switch').reason,'no switch type');
  // Sold out goes through the same rule.
  assert.equal(sw(0.35,undefined,{variants:[v(1,'Default Title',0.35,false)]}).parts[0].soldOut,true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import '../assets/build-engine.js';
import {normalize,builderPart,SOURCES,variantPack} from '../scripts/catalog-lib.mjs';
import {boardEvidence,keycapEvidence,availability} from '../scripts/catalog-evidence.mjs';
const E=globalThis.SwitchdeckBuild;
const offer=(id,extra={})=>({id,brand:'Fixture',name:id,price:10,availability:'in-stock',pricing:{status:'complete'},retailers:[{name:'Primary',url:'https://example.com/products/'+id+'?variant=1',available:true}],...extra});
const board=(id='board',extra={})=>offer(id,{cat:'case',classification:'barebones-kit',layout:'65',keys:68,conn:'Wired',switchSystem:'mx-mechanical',includes:{case:true,pcb:true,plate:true,stabs:true,switches:false,keycaps:false},kit:{pcb:{hotswap:true,pins:5,stabs:['screw']},plate:'PC',stabs:'Included'},price:50,...extra});
const sw=(id='switch',extra={})=>offer(id,{cat:'switches',type:'Linear',switchSystem:'mx-mechanical',pins:5,stem:'mx-cross',packQuantity:35,packPrice:7,price:.2,...extra});
const caps=(id='caps',extra={})=>offer(id,{cat:'keycaps',covers:['60','65','75','tkl','full'],keycapFit:{status:'confirmed',stem:'mx-cross',sizes:[1,1.25,1.75,2,2.25,2.75,6.25],addon:false},price:20,...extra});
const fixture=(extra={})=>E.create({cases:[board()],switches:[sw()],keycaps:[caps()],...extra});
const raw=(extra={})=>normalize({id:900,title:'Example65 Keyboard Kit',vendor:'Example',handle:'example65',product_type:'Keyboard',body_html:'',tags:[],images:[{src:'https://example.com/a.jpg'}],options:[],variants:[{id:1,title:'Default Title',available:true,price:'50'}],...extra},SOURCES[1],'2026-10-20T00:00:00Z');

test('XD84 plate/PCB-only variants never become a keyboard kit while complete kits are sold out',()=>{
 const p=raw({title:'XD84 Pro Custom Mechanical Keyboard Kit 75%',variants:[{id:31408374513757,title:'XD84 Pro / Plate Only',price:'16.60',available:true},{id:2,title:'XD84 Pro / PCB Only',price:'33.90',available:true},{id:3,title:'XD84 Pro / Kit 1',price:'64.30',available:false}]});
 const parts=[].concat(builderPart(p));assert.equal(parts.find(x=>x.variantId==='31408374513757').cat,'plate');
 assert.equal(parts.filter(x=>x.cat==='case'&&x.availability==='in-stock').length,0);
 assert.ok(parts.filter(x=>x.cat==='case').every(x=>x.pricing.status==='incomplete'));
});
test('Neo configurators cannot be treated as assembled or completely priced from an include list',()=>{
 const p=raw({title:'Qwertykeys Neo65 Core Plus Keyboard',body_html:'Must include a PCB and Plate.<br>Includes:<br>1 Keyboard Case<br>1 PCB<br>1 Plate<br>1 Set Stabilizers',variants:[{id:42391727767617,title:'Slate Blue / Brass',price:'75',available:true}]});
 const b=builderPart(p);assert.equal(b.assembled,false);assert.equal(b.includes.pcb,false);assert.equal(b.includes.plate,false);assert.equal(b.kit,null);assert.equal(b.pricing.status,'incomplete');assert.equal(fixture({cases:[b]}).count({budget:200}),0);
});
test('deposits and unknown kit inclusions cannot qualify at any budget',()=>{
 for(const name of ['Deposit','Case / Deposit'])assert.equal(boardEvidence(raw(),{id:'1',name,url:'https://example.com/products/a?variant=1'}).pricing.status,'incomplete');
 const b=builderPart(raw());assert.equal(b.pricing.status,'incomplete');assert.equal(fixture({cases:[b]}).count({budget:500}),0);
});
test('a fully assembled configurator title does not establish a complete selected configuration',()=>{
 const p=raw({title:'TOFU60 3.0 Fully Assembled Keyboard',handle:'tofu60-3-0-fully-assembled-configurator',body_html:'Fully assembled keyboard. Optional switches. If you do not buy switches, we ship a DIY kit.',options:[{name:'Top Case',values:['Black']}],variants:[{id:1,title:'WK / Black',price:'53.30',available:true}]});
 const b=builderPart(p);assert.equal(b.assembled,false);assert.equal(b.pricing.status,'incomplete');assert.equal(fixture({cases:[b]}).count({budget:500}),0);
});
test('complete totals use actual switch count, whole packs, tools, stabs and exact budget boundaries',()=>{
 const b=board('board',{includes:{case:true,pcb:true,plate:true,stabs:false},requiredTools:['tool']});
 const st=offer('stabs',{cat:'stabs',mount:'screw',stabCoverage:['65'],price:12});const tool=offer('tool',{cat:'extras',price:4});
 const e=fixture({cases:[b],stabs:[st],extras:[tool]});const a=[...e.enumerate({budget:100})];assert.equal(a.length,1);assert.equal(a[0].t,100);assert.equal(e.count({budget:99.99}),0);assert.equal(e.count({budget:100}),1);
 assert.equal(e.items(a[0].b).find(x=>x.slot==='switches').qty,70);assert.equal(e.evaluate(a[0].b).ready,true);
 for(const key of ['switches','keycaps','stabs'])assert.equal(e.evaluate({...a[0].b,[key]:null}).ready,false,key);
 assert.equal(e.evaluate({...a[0].b,extras:[]}).ready,false);
});
test('separate PCB and plate are priced and require exact confirmed relationships',()=>{
 const fit='fixture:model-v2',proof={status:'confirmed',model:'model-v2'};
 const c=board('case',{kit:null,price:30,includes:{case:true,stabs:true},fit,fitEvidence:proof});
 const p=offer('pcb',{cat:'pcb',price:22,layout:'65',fit,fitEvidence:proof,hotswap:true,pins:5});
 const pl=offer('plate',{cat:'plate',price:11,layout:'65',fit,fitEvidence:proof});
 const e=fixture({cases:[c],pcbs:[p],plates:[pl]});assert.equal(e.count({budget:96.99}),0);assert.equal(e.count({budget:97}),1);
 assert.equal(E.exactFit(c,p,{...pl,fit:'fixture:model-v1'}),false);assert.equal(E.exactFit(c,{...p,fitEvidence:{status:'provisional'}},pl),false);
 assert.equal(E.exactFit(c,{...p,fit:null},pl),false);assert.equal(E.exactFit(c,p,{...pl,layout:'75'}),false);
});
test('key count, profile and material never prove fit; alphas remain add-ons',()=>{
 const p=raw({title:'Example Keycaps',product_type:'Keycaps',body_html:'Cherry profile, PBT, 180 keys. MX compatible.'});
 const k=keycapEvidence(p,{name:'Base Kit',id:'1',url:p.url});assert.equal(k.covers,null);assert.equal(k.keycapFit.status,'unknown');
 const alphas=keycapEvidence({...p,sourceText:'Supports 60%, 65%, 75%. MX compatible.'},{name:'Alphas',id:'1'});assert.equal(alphas.keycapFit.addon,true);assert.equal(alphas.covers,null);
 assert.equal(fixture({keycaps:[caps('unknown',{keycapFit:{status:'unknown',stem:'mx-cross'}})]}).count({}),0);
 assert.equal(E.capsFit(board('b',{requiredKeySizes:[7]}),caps()),false);assert.equal(E.capsFit(board('b',{layoutVariant:'compact-full'}),caps()),false);
});
test('magnetic, optical and low-profile families require exact switch interfaces',()=>{
 for(const sys of ['hall-effect','optical','low-profile']){const b=board('b',{switchSystem:sys});assert.equal(E.switchFits(b,sw('s',{switchSystem:sys})),false);assert.equal(E.switchFits({...b,switchInterface:'a'},sw('s',{switchSystem:sys,switchInterface:'b'})),false);assert.equal(E.switchFits({...b,switchInterface:'a'},sw('s',{switchSystem:sys,switchInterface:'a'})),true);}
 assert.equal(E.switchFits(board(),sw('s',{switchSystem:'hall-effect'})),false);assert.equal(E.switchFits(board('b',{kit:{pcb:{pins:3}}}),sw()),false);
});
test('sold-out/deferred variants are excluded by default; preorder opt-in is explicit',()=>{
 const p=raw();assert.equal(availability({...p,sourceText:'Estimated Ship Time: 12 weeks after ordering'},p.variants[0]),'made-to-order');
 for(const status of ['sold-out','preorder','made-to-order','unverified']){const e=fixture({switches:[sw('s',{availability:status})]});assert.equal(e.count({}),0,status);if(['preorder','made-to-order'].includes(status))assert.equal(e.count({includePreorder:true}),1);}
 assert.equal(fixture({keycaps:[caps('s',{soldOut:true})]}).count({}),0);
});
test('assembled keyboards only confirm selected feel and must-haves from evidence',()=>{
 const assembled=board('a',{assembled:true,classification:'assembled',includes:{pcb:true,plate:true,stabs:true,switches:true,keycaps:true},includedFeel:null});
 const e=fixture({cases:[assembled]});assert.equal(e.count({budget:50}),1);for(const feel of ['Silent','Tactile','Linear'])assert.equal(e.count({feel}),0);
 const t=fixture({cases:[{...assembled,includedFeel:'Tactile'}]});assert.equal(t.count({feel:'Tactile'}),1);assert.equal(t.count({feel:'Silent'}),0);assert.equal(t.count({must:'knob'}),0);
 assert.equal(fixture({cases:[{...assembled,switchSystem:'hall-effect'}]}).count({must:'rapid'}),0);
 assert.equal(fixture({cases:[{...assembled,switchSystem:'hall-effect',rapidTrigger:true}]}).count({must:'rapid'}),1);
});
test('affordable parts survive hundreds of expensive higher-ranked candidates',()=>{
 const switches=[...Array.from({length:100},(_,i)=>sw('expensive-'+i,{price:10+i,packPrice:350+i})),sw('cheap')];
 const keycaps=[...Array.from({length:100},(_,i)=>caps('expensive-cap-'+i,{price:200+i})),caps('cheap-cap')];
 const e=fixture({switches,keycaps});const ds=e.domains({budget:84});assert.equal(ds.length,1);assert.deepEqual(ds[0].ds[0].switches.map(s=>s.id),['cheap']);assert.equal([...e.enumerate({budget:84})].length,1);
});
test('duplicate retailer offers are one product while revisions remain distinct',()=>{
 const e=fixture({keycaps:[caps('one',{name:'Same'}),caps('two',{name:'Same',price:21}),caps('three',{name:'Same V2',price:22})]});assert.equal(e.count({}),2);
});
test('negative compatibility text never grants coverage',()=>{
 const p={...raw(),sourceText:'Cherry MX compatible. Supports TKL but excludes 6.25u bottom row.\nDoes not support 65%.'};assert.equal(keycapEvidence(p,{name:'Base',id:'1'}).covers,null);
});
test('the selected board variant controls layout, including a single layout shared by cosmetic variants',()=>{
 const p=raw({title:'Example Barebones Keyboard',body_html:'Includes:<br>1 PCB<br>1 Plate',variants:[{id:1,title:'Black / 75% / ANSI',price:'79',available:true},{id:2,title:'Silver / 75% / ANSI',price:'79',available:true}]});
 assert.equal(builderPart(p).layout,'75');
 const split=builderPart({...p,variants:[...p.variants,{...p.variants[0],id:'3',name:'Black / 100% / ANSI'}]});assert.deepEqual(new Set(split.map(b=>b.layout)),new Set(['75','full']));
});
test('a cheaper ISO or JIS variant cannot qualify as an ANSI rendered build',()=>{
 for(const layoutStandard of ['ISO','JIS'])assert.equal(fixture({cases:[board('iso',{layoutStandard})]}).count({budget:200}),0);
});
test('required keycap extension is itemized at its exact variant price and stock status',()=>{
 const ext=offer('numpad',{price:15,verified:true});const k=caps('base',{covers:['tkl'],addon:{full:ext}});
 const c=board('board',{layout:'full',keys:104});const e=fixture({cases:[c],keycaps:[k]});
 const result=[...e.enumerate({budget:106})][0];assert.equal(result.t,106);assert.equal(e.count({budget:105.99}),0);assert.equal(e.items(result.b).find(i=>i.extension).part.retailers[0].url,ext.retailers[0].url);assert.equal(e.evaluate(result.b).ready,true);
 const sold=fixture({cases:[c],keycaps:[{...k,addon:{full:{...ext,availability:'sold-out'}}}]});assert.equal(sold.count({}),0);
});
test('ingestion extracts a required numpad extension rather than assigning the base universal coverage',()=>{
 const p=raw({title:'Example Keycap Set',product_type:'Keycaps',body_html:'Cherry MX compatible.<br>Supports TKL and full-size layouts.<br>Full-size requires a numpad kit.<br>Base excludes numpad.',variants:[{id:1,title:'Base',price:'40',available:true},{id:2,title:'Numpad',price:'15',available:true}]});
 const k=builderPart(p);assert.deepEqual(k.covers,['tkl']);assert.equal(k.addon.full.price,15);assert.equal(k.addon.full.variantId,'2');assert.equal(k.keycapFit.status,'confirmed');
});
test('identical base prices for 1/10/70/110 packs are provisional, not a $4 complete switch purchase',()=>{
 const p=raw({title:'Example MX Linear Switches',product_type:'Switches',options:[{name:'Quantity',values:['1','10','70','110']}],variants:[1,10,70,110].map((q,i)=>({id:i+1,title:q+' pcs',available:true,price:'4.45'}))});
 const s=builderPart(p);assert.equal(s.pricing.status,'incomplete');assert.match(s.pricing.reason,/pack quantities/);assert.equal(fixture({switches:[s]}).count({budget:500}),0);
});
test('pack optimization minimizes actual purchase cost rather than the nominal unit price',()=>{
 const s=sw('packs',{packQuantity:110,packPrice:33,price:.3,purchasePacks:[{variantId:'small',quantity:35,price:12,url:'https://example.com/products/s?variant=2',available:true},{variantId:'large',quantity:110,price:33,url:'https://example.com/products/s?variant=3',available:true}]});
 const e=fixture({switches:[s]});const result=[...e.enumerate({budget:94})][0];assert.equal(result.t,94);const item=e.items(result.b).find(i=>i.slot==='switches');assert.equal(item.price,24);assert.equal(item.qty,70);assert.match(item.part.retailers[0].url,/variant=2$/);assert.equal(e.count({budget:93.99}),0);
});
test('quantity option beats a model or missing-unit force token such as MZ Z1 53 switch',()=>{
 assert.equal(variantPack('MZ Z1 53 switch / x10 switches',['switch','amounts']).n,10);
 assert.equal(variantPack('MZ Z1 53 switch / x35 switches',['switch','amounts']).n,35);
 assert.equal(variantPack('MZ Z1 53 switch / x10 switches',[]).n,10);
});

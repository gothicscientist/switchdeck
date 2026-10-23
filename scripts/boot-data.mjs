// What the finder needs to paint before the parts catalog has loaded.
//
// With no answers the page draws a fixed set of boards (the three it features, then the best matches for the default
// answers) and a count of possible builds. Both come from the same ranking code the page runs once the catalog is in,
// so the deploy runs that code here, on the whole catalog, and writes down what it drew: the boards' ids in order, the
// parts those boards are made of, the keycaps and price evalAns gave each, and the build count. The page embeds it as
// window.THOCK_BOOT (see "Catalog loading" in index.html), paints from it, and replaces it with the real thing a moment
// later. The page never has to wait for 6 MB of parts to show a first card.
//
// The answer is checked before it is used: a page started from the boot data alone must pick exactly these boards.
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {PACK_FILES,loadFullCatalog,CAT_OF} from './catalog-pack.mjs';

const POOL_SIZE=21; // the three featured boards plus the most background boards any screen shows (a phone's 6 plus 12 spares)

const between=(src,from,to,fromEnd=false)=>{
  const a=src.indexOf(from), b=src.indexOf(to,a);
  if(a<0||b<0) throw Error(`index.html: cannot find "${from}" ... "${to}"`);
  return src.slice(a,fromEnd?b+to.length:b);
};
// The pieces of the page's script that run without a document: the parts and answers, the recommendation engine and
// the field's board choice. Tests read the page the same way.
function pieces(html){
  const inline=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  return {
    state:inline.slice(0,inline.indexOf('const LAYOUTS =')),
    helpers:between(inline,'function partName(','let toastT;')+inline.match(/function decodeBuild\(code\)\{[^\n]+/)[0]+'\n'+inline.match(/const storeOf[^\n]+/)[0],
    engine:between(inline,'const B_MIN=','/*COMBOS-END*/'),
    field:between(inline,'const FIELD_SLOTS=','function initField(){'),
    pool:between(inline,'function fieldPool(','let introOn=false'),
  };
}
async function context(root,{full,boot}){
  const read=f=>readFile(new URL(f,root),'utf8');
  const ctx={URL,window:{},localStorage:{getItem:()=>null},innerWidth:1300};
  vm.createContext(ctx);
  if(boot)ctx.window.THOCK_BOOT=boot;
  for(const f of ['assets/affiliates.js','assets/product-links.js'])vm.runInContext(await read(f),ctx);
  if(full)vm.runInContext(await read('data/product-links.js'),ctx);
  vm.runInContext(await read('assets/part-names.js'),ctx);
  if(full)ctx.window.SWITCHDECK_CATALOG=await loadFullCatalog(new URL('data/',root));
  const p=pieces(await read('index.html'));
  vm.runInContext(p.state,ctx);
  vm.runInContext(p.helpers,ctx);
  if(full)vm.runInContext(p.engine,ctx);
  vm.runInContext(p.field,ctx);
  vm.runInContext(p.pool,ctx);
  return code=>vm.runInContext(code,ctx);
}
export async function buildBoot(root){
  root=root instanceof URL?root:new URL('file://'+root.replace(/\/?$/,'/'));
  const run=await context(root,{full:true});
  const pool=run(`(()=>{const m=fieldPool(evalAns({}),true); return [...m.top,...m.rest]})()`);
  const desktop=run(`(()=>{const m=fieldPool(evalAns({}),false); return [...m.top,...m.rest]})()`);
  if(pool.length!==POOL_SIZE)throw Error('Boot pool has '+pool.length+' boards, expected '+POOL_SIZE);
  if(desktop.join()!==pool.slice(0,desktop.length).join())throw Error('Desktop pool is not a prefix of the phone pool');
  const res=run(`(()=>{const r=evalAns({}); return Object.fromEntries(${JSON.stringify(pool)}.filter(id=>r.byCase.has(id)).map(id=>{const x=r.byCase.get(id); return [id,[x.b.keycaps??null,x.b.pcb??null,x.t]]}))})()`);
  const combos=run('comboCount({})');
  // The parts those boards are drawn from, as the pack files hold them (curated parts are in the page already, but any
  // catalog photo and stores they were given travel as curated entries).
  const raw={};
  for(const name of Object.values(PACK_FILES)){const body=JSON.parse(await readFile(new URL('data/'+name,root),'utf8')); Object.assign(raw,{...body,generatedAt:raw.generatedAt??body.generatedAt})}
  const want={cases:new Set(pool),keycaps:new Set(),pcbs:new Set()};
  for(const [k,p,] of Object.values(res)){if(k)want.keycaps.add(k); if(p)want.pcbs.add(p)}
  const cat={generatedAt:raw.generatedAt,cases:[],keycaps:[],pcbs:[],curated:{}};
  const found=new Set();
  for(const key of ['cases','keycaps','pcbs'])for(const p of raw[key]||[])if(want[key].has(p.id)){cat[key].push(p);found.add(p.id)}
  for(const [id,meta] of Object.entries(raw.curated||{}))if(pool.includes(id))cat.curated[id]=meta;
  // Anything not in the pack files must be a curated part the page defines itself.
  const curatedHere=run(`${JSON.stringify([...new Set([...pool,...want.keycaps,...want.pcbs])])}.filter(id=>BASE.flat().some(p=>p.id===id))`);
  for(const id of [...pool,...want.keycaps,...want.pcbs])if(!found.has(id)&&!curatedHere.includes(id))throw Error('Boot part '+id+' is in neither the pack files nor the page');
  // The links each of those parts has beyond their own stores (the registry itself loads later).
  const registry=JSON.parse(run(`JSON.stringify(SWITCHDECK_PRODUCT_LINKS)`));
  const links={};
  for(const id of [...pool,...want.keycaps,...want.pcbs])for(const k of [id,id.split('~')[0]])if(registry[k])links[k]=registry[k];
  const boot={pool,res,combos,cat,links};
  await verifyBoot(root,boot,pool,desktop);
  return boot;
}
// A page started from the boot data alone must choose the boards the whole catalog chose.
async function verifyBoot(root,boot,pool,desktop){
  const run=await context(root,{full:false,boot:JSON.parse(JSON.stringify(boot))});
  const check=(mobile,want)=>{const got=run(`(()=>{const m=fieldPool(fieldRes({}),${mobile}); return [...m.top,...m.rest]})()`); if(got.join()!==want.join())throw Error('Boot data picks different boards ('+(mobile?'phone':'desktop')+'): '+got.join()+' vs '+want.join())};
  check(true,pool); check(false,desktop);
  const missing=run(`${JSON.stringify(pool)}.filter(id=>!BYID[id]||!BYID[id].photo)`);
  if(missing.length)throw Error('Boot boards without a part or photo: '+missing.join());
  const notFinder=run(`${JSON.stringify(pool)}.filter(id=>!FINDER_CASES.some(c=>c.id===id))`);
  if(notFinder.length)throw Error('Boot boards missing from the finder: '+notFinder.join());
}
// The picture URL framedPhoto asks for when it draws a board in the field (index.html, framedPhoto), so it can be fetched early.
export function fieldPhotoUrl(photo,width=520){
  const u=new URL(photo.img); if(u.hostname==='cdn.shopify.com')u.searchParams.set('width',width); return u.href;
}
export {CAT_OF};

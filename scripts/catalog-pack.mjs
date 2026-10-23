// The builder catalog as the browser receives it: a few JSON files, loaded after first paint (see index.html, "Catalog
// loading"). The catalog sync writes them from the parts it just built; the validators, tests and the deploy read them
// back with loadFullCatalog(), which returns the same shape the page works with.
//
// A packed part is the part as the page uses it, minus what no page reads (photo colour samples, key counts, bottom-out
// force) and minus what the group already says (cat) or the name already holds (sourceName when it equals name). Names
// are cleaned here, once, instead of in every visitor's browser.
import '../assets/part-names.js';
import '../assets/product-links.js';
import {readFile,writeFile,rm} from 'node:fs/promises';

export const PACK_FILES={cases:'catalog-cases.json',switches:'catalog-switches.json',keycaps:'catalog-keycaps.json',parts:'catalog-parts.json'};
// Which catalog arrays travel in which file. Files are fetched in parallel and parsed as they arrive.
export const PACK_GROUPS={cases:['cases'],switches:['switches'],keycaps:['keycaps'],parts:['extras','pcbs','plates','stabs']};
// The cat each array's parts carry (cases hold 'case', pcbs hold 'pcb', and so on).
export const CAT_OF={cases:'case',switches:'switches',keycaps:'keycaps',stabs:'stabs',extras:'extras',pcbs:'pcb',plates:'plate'};
export const CATALOG_KEYS=['switches','extras','cases','keycaps','stabs','pcbs','plates'];
const UNUSED=['keyCount','bottom'];

const tidyPhoto=ph=>{if(!ph||typeof ph!=='object')return ph;const {tone,...rest}=ph;return rest};
export function packPart(p,key){
  if(p.cat!==CAT_OF[key])throw Error(`${p.id}: cat ${p.cat} in ${key}`);
  const named=globalThis.SwitchdeckNames.part(p);
  const out={};
  for(const [k,v] of Object.entries(p)){
    if(k==='cat'||k==='sourceName'||UNUSED.includes(k))continue;
    out[k]=k==='photo'?tidyPhoto(v):k==='name'?named.name:v;
  }
  if(named.sourceName!==named.name)out.sourceName=named.sourceName;
  return out;
}
export function unpackPart(p,key){
  const out={};
  for(const [k,v] of Object.entries(p))out[k]=v;
  out.cat=CAT_OF[key];out.sourceName??=out.name;
  return out;
}
// Parts with no purchase link of their own (retailers, url or photo page). The page keeps these out of the finder unless the
// links registry gives them one, so it checks only these; every other part is known to be linked without parsing its URLs.
const noOwnLink=(p,key)=>{
  const q={...p,cat:CAT_OF[key],catalogId:p.catalogId??p.id.split('~')[0]}; if(q.photo&&!q.photo.page)q.photo={...q.photo,page:q.retailers?.[0]?.url};
  return !globalThis.SwitchdeckLinks.hasLinks(q,{});
};
// {generatedAt, switches, ...} -> {fileName: object}
export function packCatalog(cat){
  const files={};
  for(const [file,keys] of Object.entries(PACK_GROUPS)){
    const body={v:1};
    if(file==='cases')body.generatedAt=cat.generatedAt;
    for(const key of keys)body[key]=(cat[key]||[]).map(p=>packPart(p,key));
    body.nl=keys.flatMap(key=>(cat[key]||[]).filter(p=>noOwnLink(p,key)).map(p=>p.id));
    if(file==='parts')body.curated=Object.fromEntries(Object.entries(cat.curated||{}).map(([id,m])=>[id,{...m,photo:tidyPhoto(m.photo)}]));
    files[PACK_FILES[file]]=body;
  }
  return files;
}
export async function writePacks(dir,cat){
  const files=packCatalog(cat);
  for(const [name,body] of Object.entries(files))await writeFile(new URL(name,dir),JSON.stringify(body)+'\n');
  await rm(new URL('builder-catalog.js',dir),{force:true});
  return files;
}
// The catalog the page builds its parts from: the packed files put back together. dir is a directory URL or path.
export async function loadFullCatalog(dir){
  const base=dir instanceof URL?dir:new URL('file://'+dir.replace(/\/?$/,'/'));
  const out={generatedAt:null,switches:[],extras:[],cases:[],keycaps:[],stabs:[],pcbs:[],plates:[],curated:{}};
  for(const name of Object.values(PACK_FILES)){
    const body=JSON.parse(await readFile(new URL(name,base),'utf8'));
    if(body.generatedAt)out.generatedAt=body.generatedAt;
    for(const key of CATALOG_KEYS)if(body[key])out[key]=body[key].map(p=>unpackPart(p,key));
    if(body.curated)out.curated=body.curated;
  }
  return out;
}

// One-off conversion of a catalog written as data/builder-catalog.js (the format before the packed files):
//   node scripts/catalog-pack.mjs --from-legacy data/builder-catalog.js
if(typeof process!=='undefined'&&process.argv[1]&&process.argv[1]===new URL(import.meta.url).pathname&&process.argv[2]==='--from-legacy'){
  const {default:vm}=await import('node:vm');
  const file=new URL(process.argv[3],'file://'+process.cwd()+'/');
  const ctx={window:{}};vm.runInNewContext(await readFile(file,'utf8'),ctx);
  const dir=new URL('../data/',import.meta.url);
  const files=await writePacks(dir,ctx.window.SWITCHDECK_CATALOG);
  console.log('Wrote '+Object.keys(files).join(', '));
}

import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {SOURCES,CATEGORIES,normalize,catalogParts,admissionReport,digest} from './catalog-lib.mjs';
import {pickPhotos} from './photo-check.mjs';
import {keycapMood,keycapPalette} from './keycap-look.mjs';
import {buildProductLinks} from './build-product-links.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function getJSON(url) {
  for(let i=0;i<4;i++) {
    const r=await fetch(url,{headers:{'User-Agent':'SwitchdeckCatalog/1.0 (+https://github.com/gothicscientist/switchdeck)'},signal:AbortSignal.timeout(45000)});
    if(r.ok) return r.json();
    if(r.status!==429&&r.status<500)throw Error(url+': HTTP '+r.status);
    await sleep(Math.min(15000,Number(r.headers.get('retry-after')||2)*1000*(i+1)));
  }
  throw Error('Retries exhausted: '+url);
}
async function allowed(source) {
  const r=await fetch(source.url+'/robots.txt',{signal:AbortSignal.timeout(20000)});
  if(r.status===404)return;
  if(!r.ok)throw Error('Cannot verify robots.txt: '+r.status);
  const groups=[];let group=null;
  for(const raw of (await r.text()).split('\n')) {
    const line=raw.replace(/#.*/,'').trim(),m=line.match(/^(user-agent|disallow|allow)\s*:\s*(.*)$/i);if(!m)continue;
    if(m[1].toLowerCase()==='user-agent'){if(!group||group.rules.length){group={agents:[],rules:[]};groups.push(group)}group.agents.push(m[2].toLowerCase())}
    else if(group&&m[2])group.rules.push({allow:m[1].toLowerCase()==='allow',pattern:m[2]});
  }
  const specific=groups.filter(g=>g.agents.some(a=>a!=='*'&&'switchdeckcatalog'.includes(a)));
  const rules=(specific.length?specific:groups.filter(g=>g.agents.includes('*'))).flatMap(g=>g.rules);
  const target='/products.json';
  const matches=rules.filter(r=>new RegExp('^'+r.pattern.split('*').map(s=>s.replace(/[.+?^${}()|[\]\\]/g,'\\$&')).join('.*').replace(/\\\$$/,'$')).test(target)).sort((a,b)=>b.pattern.length-a.pattern.length||Number(b.allow)-Number(a.allow));
  if(matches[0]&&!matches[0].allow)throw Error('Product feed disallowed by robots.txt');
}
export async function syncCatalog({offline=false,log=console.log,photos=true}={}) {
  const cache=path.join(root,'.cache');await mkdir(cache,{recursive:true});
  const snapshots=[];let cursor=0;
  // Three stores at once; requests within a store are serial and rate limited.
  await Promise.all(Array.from({length:3},async()=>{while(cursor<SOURCES.length){const source=SOURCES[cursor++];const file=path.join(cache,source.id+'.json');
    try{
      let snapshot;
      if(offline)snapshot=JSON.parse(await readFile(file,'utf8'));
      else {
        await allowed(source);
        if(source.optional){const cart=await getJSON(source.url+'/cart.js');if(cart.currency!==source.currency)throw Error('Store currency is '+cart.currency)}
        const products=[],seen=new Set();let complete=false;
        for(let page=1;page<=100;page++) {
          const body=await getJSON(source.url+'/products.json?limit=250&page='+page);
          if(!Array.isArray(body.products))throw Error('Invalid product feed');
          for(const p of body.products){if(seen.has(p.id))throw Error('Feed repeated product IDs across pages');seen.add(p.id);products.push(p)}
          if(body.products.length<250){complete=true;break}await sleep(500);
        }
        if(!complete)throw Error('Pagination limit reached');
        if(!products.length)throw Error('Empty feed; refusing to replace last good snapshot');
        snapshot={sourceId:source.id,checkedAt:new Date().toISOString(),products};
        await writeFile(file+'.tmp',JSON.stringify(snapshot));await rename(file+'.tmp',file);
      }
      snapshots.push({source,snapshot,status:offline?'cached':'fresh'});log(source.name+': '+snapshot.products.length+' products');
    }catch(e){
      try{const snapshot=JSON.parse(await readFile(file,'utf8'));snapshots.push({source,snapshot,status:'stale',error:e.message});log(source.name+': using last good snapshot ('+e.message+')')}
      catch{snapshots.push({source,snapshot:{products:[]},status:source.optional?'skipped':'failed',error:e.message});log(source.name+': '+e.message)}
    }
  }}));
  if(snapshots.some(s=>s.status==='failed'||(s.status==='stale'&&!s.source.optional)))throw Error('One or more sources failed. Existing published catalog was retained. Fix source or restore its snapshot before publishing.');
  const products=snapshots.flatMap(({source,snapshot})=>snapshot.products.map(p=>normalize(p,source,snapshot.checkedAt)).filter(Boolean)).sort((a,b)=>a.id.localeCompare(b.id));
  if(products.length<500)throw Error('Unexpectedly small catalog; existing catalog retained');
  const previous=await readFile(path.join(root,'data/catalog-manifest.json'),'utf8').then(JSON.parse).catch(()=>null);
  if(previous&&products.length<previous.listingCount*0.8)throw Error('Catalog shrank more than 20%; review sources before accepting a destructive refresh');
  const dir=path.join(root,'data');await mkdir(path.join(dir,'parts'),{recursive:true});
  const index=[],files=[];
  for(let start=0;start<products.length;start+=80){const chunk=products.slice(start,start+80),name='parts/'+String(start/80).padStart(4,'0')+'.json';
    files.push({name,body:JSON.stringify(chunk)});
    for(const p of chunk)index.push({id:p.id,name:p.name,displayName:p.displayName,brand:p.brand,category:p.category,sourceId:p.sourceId,retailer:p.retailer,image:p.images[0],price:p.priceMin,priceMax:p.priceMax,currency:p.currency,available:p.available,url:p.url,specs:p.specs,missingFields:p.missingFields,shard:name});
  }
  // Every listing is either a builder part (in stock, or marked soldOut) or counted under a named exclusion reason in builderAdmission.
  let builder=catalogParts(products);
  const matches=JSON.parse(await readFile(path.join(root,'scripts/curated-matches.json'),'utf8'));
  const byId=new Map(products.map(p=>[p.id,p]));
  const curated=Object.fromEntries(Object.entries(matches).map(([id,ids])=>{
    const listings=ids.map(id=>byId.get(id)).filter(Boolean).sort((a,b)=>Number(b.available)-Number(a.available));
    return [id,{photo:listings[0]?{img:listings[0].images[0],page:listings[0].url}:null,retailers:listings.map(p=>({name:p.retailer,url:p.url,available:p.available})),listings}];
  }));
  // Every photo the site shows must pass the image check: a clear, uncluttered shot of the product,
  // framed to its outline. A part with no passing photo is drawn as an icon instead.
  if(photos){
    const site=await readFile(path.join(root,'index.html'),'utf8');
    const sitePhoto=id=>site.match(new RegExp(`'${id}':\\{img:'([^']+)'`))?.[1];
    const siteLayout=id=>site.match(new RegExp(`id:'${id}'[^\\n]*?layout:'(\\w+)'`))?.[1];
    const kind=c=>c==='keyboards'||c==='cases'?'case':['switches','keycaps','stabs'].includes(c)?c:'extras';
    const uniq=a=>[...new Set(a.filter(Boolean))].slice(0,10);
    const jobs=[
      ...builder.map(b=>({key:'b:'+b.id,cat:b.cat,layout:b.layout,urls:uniq([b.photo?.img,...(byId.get(b.id.split('~')[0])?.images||[])])})),
      ...Object.entries(curated).map(([id,m])=>({key:'c:'+id,cat:kind(m.listings[0]?.category),layout:siteLayout(id),urls:uniq([sitePhoto(id),...m.listings.flatMap(p=>p.images)])})),
    ];
    const chosen=await pickPhotos(jobs,{cacheFile:path.join(cache,'photo-checks.json'),log});
    builder=builder.map(b=>({...b,photo:chosen.get('b:'+b.id)||null}));
    for(const [id,m] of Object.entries(curated)){const ph=chosen.get('c:'+id); m.photo=ph?{...ph,page:m.listings[0].url}:null}
    const shown=new Map(builder.filter(b=>b.photo).map(b=>[b.id.split('~')[0],b.photo.img]));
    for(const e of index) if(shown.has(e.id)) e.image=shown.get(e.id);
  }
  // Keycap look: mood from the retailer's name plus measured photo pixels, palette from the photo's colours.
  builder=builder.map(b=>{
    if(b.cat!=='keycaps') return b;
    const pal=keycapPalette(b.photo?.tone);
    return {...b,mood:keycapMood(b.name,b.photo?.tone),...(pal?{pal}:{})};
  });
  for(const m of Object.values(curated)) delete m.listings;
  const pick=c=>builder.filter(p=>p.cat===c);
  const switches=pick('switches'),extras=pick('extras'),cases=pick('case'),keycaps=pick('keycaps'),stabs=pick('stabs'),pcbs=pick('pcb'),plates=pick('plate');
  const manifest={schemaVersion:1,generatedAt:new Date().toISOString(),listingCount:products.length,inStockCount:products.filter(p=>p.available).length,builderSwitchCount:switches.length,builderExtraCount:extras.length,builderCaseCount:cases.length,builderKeycapCount:keycaps.length,builderStabCount:stabs.length,builderPcbCount:pcbs.length,builderPlateCount:plates.length,builderSoldOutCount:builder.filter(b=>b.soldOut).length,builderAdmission:admissionReport(products),categories:Object.fromEntries(Object.entries(CATEGORIES).map(([id,label])=>[id,{label,count:products.filter(p=>p.category===id).length}])),sources:snapshots.map(({source,snapshot,status,error})=>({...source,status,checkedAt:snapshot.checkedAt,rawProducts:snapshot.products.length,listings:products.filter(p=>p.sourceId===source.id).length,...(error?{error}:{})})),shards:files.map(f=>f.name),fingerprint:digest(products)};
  // Write dependent data first and publish the manifest last.
  for(const f of files)await writeFile(path.join(dir,f.name),f.body+'\n');
  await writeFile(path.join(dir,'catalog-index.json'),JSON.stringify(index)+'\n');
  await writeFile(path.join(dir,'builder-catalog.js'),'/* Generated by npm run catalog:sync; retailer facts, no invented compatibility. */\nwindow.SWITCHDECK_CATALOG = '+JSON.stringify({generatedAt:manifest.generatedAt,switches,extras,cases,keycaps,stabs,pcbs,plates,curated})+';\n');
  await writeFile(path.join(dir,'catalog-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  await buildProductLinks();
  log(JSON.stringify({listings:products.length,builderSwitches:switches.length,builderExtras:extras.length,builderCases:cases.length,builderKeycaps:keycaps.length,builderStabs:stabs.length,builderPcbs:pcbs.length,builderPlates:plates.length,builderSoldOut:builder.filter(b=>b.soldOut).length,categories:manifest.categories}));return manifest;
}
if(typeof process!=='undefined'&&process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  // In GitHub Actions, failures and per-store problems also go out as annotations, readable without the raw log.
  const gha=!!process.env.GITHUB_ACTIONS;
  try{await syncCatalog({offline:process.argv.includes('--offline'),log:m=>{console.log(m);if(gha&&/: (?:using last good|HTTP|Store currency|Product feed|Cannot verify|Unexpected|Retries|Invalid|Empty|Feed)/.test(m))console.log('::warning title=catalog source::'+m.slice(0,500))}})}
  catch(e){if(gha)console.log('::error title=catalog sync::'+String(e.message).slice(0,900));throw e}
}


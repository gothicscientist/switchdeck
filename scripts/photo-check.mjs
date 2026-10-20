import {readFile,writeFile,rename} from 'node:fs/promises';
import {analyze,judge,photoRecord} from './image-check.mjs';

// Pixel summaries are cached by image URL, so a refresh only downloads photos it hasn't seen
// and changing the rules in image-check.mjs never needs a re-download.
const VERSION=3;
const small=u=>{const x=new URL(u); if(x.hostname==='cdn.shopify.com') x.searchParams.set('width','160'); return x.href};

async function features(url,sharp){
  for(let i=0;i<3;i++){
    try{
      const r=await fetch(small(url),{signal:AbortSignal.timeout(30000)});
      if(r.status===404||r.status===403) return {missing:true};
      if(!r.ok) throw Error('HTTP '+r.status);
      const {data,info}=await sharp(Buffer.from(await r.arrayBuffer())).resize({width:160,withoutEnlargement:false}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      return analyze({data,width:info.width,height:info.height,channels:info.channels});
    }catch(e){ if(i===2) return {error:e.message}; await new Promise(r=>setTimeout(r,1000*(i+1))) }
  }
}

// Photos a person checked by eye and found wrong (the bottom of a board, a layout diagram), keyed by
// URL without its version query so a re-upload of the same file stays rejected.
const bare=u=>u.split('?')[0];
export const REJECTED=new Set(Object.keys(JSON.parse(await readFile(new URL('./photo-rejects.json',import.meta.url),'utf8'))).map(bare));
export const rejected=u=>REJECTED.has(bare(u));

// jobs: [{key, cat, layout, urls}] → Map key → photo record, or null when no photo passes.
export async function pickPhotos(jobs,{cacheFile,log=console.log,concurrency=16}={}){
  const {default:sharp}=await import('sharp');
  let cache={};
  try{const c=JSON.parse(await readFile(cacheFile,'utf8')); if(c.version===VERSION) cache=c.urls}catch{}
  const urls=[...new Set(jobs.flatMap(j=>j.urls))].filter(u=>!cache[u]||cache[u].error);
  let next=0, done=0;
  await Promise.all(Array.from({length:concurrency},async()=>{while(next<urls.length){const u=urls[next++]; cache[u]=await features(u,sharp); if(++done%500===0) log(`Checked ${done} of ${urls.length} new photos`)}}));
  await writeFile(cacheFile+'.tmp',JSON.stringify({version:VERSION,urls:cache})); await rename(cacheFile+'.tmp',cacheFile);
  const out=new Map(); let shown=0;
  for(const j of jobs){
    let best=null,bs=0;
    for(const u of j.urls){const f=cache[u]; const s=f&&!f.error&&!f.missing&&!rejected(u)?judge(f,j.cat,j.layout):0; if(s>bs){bs=s;best=photoRecord(u,f,j.cat)}}
    out.set(j.key,best); if(best) shown++;
  }
  const failed=urls.filter(u=>cache[u]?.error).length;
  log(`Photos: ${shown} of ${jobs.length} parts have a clear photo; the rest use a drawn icon. ${failed} downloads failed.`);
  return out;
}

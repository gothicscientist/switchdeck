// Finds a YouTube sound test for each in-stock switch that has none yet, using the YouTube Data API.
// Only the video ID, title and channel are stored, and the site links to the video. Nothing is downloaded or played from here.
// Needs a YOUTUBE_API_KEY secret (a free key from the Google Cloud console). Without one this exits quietly and the site
// falls back to a YouTube search link for every switch.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';

const VIDEOS_FILE=new URL('../data/sound-videos.js',import.meta.url);
const MISSES_FILE=new URL('../data/sound-video-misses.json',import.meta.url);
const PREFIX='globalThis.SWITCHDECK_SOUND_VIDEOS=';
const MAX_SEARCHES=80;      // a search costs 100 of the 10,000 free daily units
const RETRY_MISSES_DAYS=45; // a switch with no good video is tried again after this long

// Must match sameKey in index.html: one key per brand and name, shared by every store's listing.
export const switchKey=p=>(p.brand+' '+p.name).toLowerCase().replace(/\b(switch(es)?|keycaps?( set)?)\b|[^a-z0-9]/g,'');
const words=s=>s.toLowerCase().replace(/[^a-z0-9\s]+/g,'').split(/\s+/).filter(Boolean);

// A result counts only if its title names this exact switch and says it is a sound test, typing test or review.
export function matchVideo(part,items){
  const brand=words(part.brand==='Various'?'':part.brand||'');
  const name=words(part.name).filter(w=>!['switch','switches','x'].includes(w));
  if(!name.length) return null;
  const need=name.length<2?[...brand,...name]:name;
  for(const it of items||[]){
    const id=it?.id?.videoId, title=it?.snippet?.title;
    if(!/^[\w-]{11}$/.test(id||'')||typeof title!=='string') continue;
    const have=new Set(words(title));
    if(need.every(w=>have.has(w))&&/\b(sound|sounds|typing|test|review)\b/i.test(title)) return {video:id,title,creator:it.snippet.channelTitle||undefined};
  }
  return null;
}

export const parseVideosFile=text=>JSON.parse(text.trim().replace(PREFIX,'').replace(/;$/,''));
export const videosFileText=map=>PREFIX+JSON.stringify(Object.fromEntries(Object.entries(map).sort(([a],[b])=>a<b?-1:1)),null,1)+';\n';

async function readJson(url,fallback){try{return JSON.parse(await readFile(url,'utf8'))}catch{return fallback}}

async function main(){
  const key=process.env.YOUTUBE_API_KEY;
  if(!key){console.log('YOUTUBE_API_KEY is not set: leaving sound test videos as they are.');return}
  const videos=parseVideosFile(await readFile(VIDEOS_FILE,'utf8')), misses=await readJson(MISSES_FILE,{});
  const ctx={window:{}}; vm.runInNewContext(await readFile(new URL('../data/builder-catalog.js',import.meta.url),'utf8'),ctx);
  const today=new Date().toISOString().slice(0,10), cutoff=Date.now()-RETRY_MISSES_DAYS*864e5;
  const seen=new Map();
  for(const p of ctx.window.SWITCHDECK_CATALOG.switches){
    const k=switchKey(p); if(videos[k]) continue;
    const e=seen.get(k)||{p,n:0,stock:false}; e.n++; e.stock||=p.retailers?.some(r=>r.available); seen.set(k,e);
  }
  // Switches the finder can recommend come first: in stock, then the most widely listed.
  const todo=[...seen].filter(([k,e])=>e.stock&&!(misses[k]&&Date.parse(misses[k])>cutoff)).sort((a,b)=>b[1].n-a[1].n).slice(0,MAX_SEARCHES);
  let found=0;
  for(const [k,{p}] of todo){
    const q=[p.brand==='Various'?'':p.brand,p.name,'sound test'].filter(Boolean).join(' ');
    const res=await fetch('https://www.googleapis.com/youtube/v3/search?'+new URLSearchParams({part:'snippet',type:'video',maxResults:'8',q,key}));
    if(!res.ok){console.log(`YouTube search stopped at HTTP ${res.status}.`);break}
    const m=matchVideo(p,(await res.json()).items);
    if(m){videos[k]=m;delete misses[k];found++} else misses[k]=today;
  }
  await writeFile(VIDEOS_FILE,videosFileText(videos));
  await writeFile(MISSES_FILE,JSON.stringify(Object.fromEntries(Object.entries(misses).sort()),null,1)+'\n');
  console.log(`Searched ${todo.length} switches, found ${found} videos, ${Object.keys(videos).length} stored in all.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) await main();

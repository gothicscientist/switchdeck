// Finds a YouTube sound test for each in-stock switch that has none yet, using the YouTube Data API.
// Only the video ID, title and channel are stored, and the site links to the video. Nothing is downloaded or played from here.
// Needs a YOUTUBE_API_KEY secret (a free key from the Google Cloud console). Without one this exits quietly and the site
// falls back to a YouTube search link for every switch.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {loadFullCatalog} from './catalog-pack.mjs';

const VIDEOS_FILE=new URL('../data/sound-videos.js',import.meta.url);
const MISSES_FILE=new URL('../data/sound-video-misses.json',import.meta.url);
const PREFIX='globalThis.SWITCHDECK_SOUND_VIDEOS=';
const MAX_SEARCHES=80;      // a search costs 100 of the 10,000 free daily units
const RETRY_MISSES_DAYS=45; // a switch with no good video is tried again after this long

// Must match sameKey in index.html: one key per brand and name, shared by every store's listing.
export const switchKey=p=>(p.brand+' '+p.name).toLowerCase().replace(/\b(switch(es)?|keycaps?( set)?)\b|[^a-z0-9]/g,'');
const words=s=>s.toLowerCase().replace(/[^a-z0-9\s]+/g,'').split(/\s+/).filter(Boolean);

// The API returns titles with HTML entities ("&amp;", "&#39;"); store plain text.
export const decodeEntities=t=>t.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);/gi,(m,e)=>{
  const named={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'};
  if(e[0]!=='#') return named[e.toLowerCase()];
  const n=e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):Number(e.slice(1));
  return Number.isFinite(n)&&n>0&&n<0x110000?String.fromCodePoint(n):m;
});

// A result counts only if its title names this exact switch and says it is a sound test, typing test or review.
// Comparisons ("vs", "comparison"), Shorts and a bare brand name are not specific to one switch, so they are rejected.
export function matchVideo(part,items){
  const brand=words(part.brand==='Various'?'':part.brand||'');
  const name=words(part.name).filter(w=>!['switch','switches','x'].includes(w));
  if(!name.length||name.every(w=>brand.includes(w))) return null;
  // A short model name is only unique within its brand ("Red", "Cherry MX"), so the brand must appear too.
  const need=name.length<=2?[...new Set([...brand,...name])]:name;
  for(const it of items||[]){
    const id=it?.id?.videoId;
    if(!/^[\w-]{11}$/.test(id||'')||typeof it?.snippet?.title!=='string') continue;
    const title=decodeEntities(it.snippet.title), have=new Set(words(title));
    if(/#shorts?\b|\b(vs|versus)\b|comparison/i.test(title)) continue;
    if(need.every(w=>have.has(w))&&/\b(sound|sounds|typing|test|review)\b/i.test(title)) return {video:id,title,creator:it.snippet.channelTitle?decodeEntities(it.snippet.channelTitle):undefined};
  }
  return null;
}

export const parseVideosFile=text=>JSON.parse(text.trim().replace(PREFIX,'').replace(/;$/,''));
export const videosFileText=map=>PREFIX+JSON.stringify(Object.fromEntries(Object.entries(map).sort(([a],[b])=>a<b?-1:1)),null,1)+';\n';

async function readJson(url,fallback){try{return JSON.parse(await readFile(url,'utf8'))}catch{return fallback}}

async function main(){
  const key=process.env.YOUTUBE_API_KEY;
  const videos=parseVideosFile(await readFile(VIDEOS_FILE,'utf8')), misses=await readJson(MISSES_FILE,{});
  const catalog=await loadFullCatalog(new URL('../data/',import.meta.url));
  const today=new Date().toISOString().slice(0,10), cutoff=Date.now()-RETRY_MISSES_DAYS*864e5;
  const seen=new Map();
  for(const p of catalog.switches){
    const k=switchKey(p); const e=seen.get(k)||{p,n:0,stock:false}; e.n++; e.stock||=p.retailers?.some(r=>r.available); seen.set(k,e);
  }
  // Re-check stored videos with the current rules, so tightening a rule also cleans up older matches.
  // A video whose switch has left the catalog is kept.
  let dropped=0;
  for(const [k,v] of Object.entries(videos)){
    const e=seen.get(k); if(!e) continue;
    const m=matchVideo(e.p,[{id:{videoId:v.video},snippet:{title:v.title,channelTitle:v.creator}}]);
    if(!m){delete videos[k];dropped++} else videos[k]={...v,title:m.title,...(m.creator?{creator:m.creator}:{})};
  }
  if(dropped) console.log(`Dropped ${dropped} stored videos that no longer pass the matching rules.`);
  if(!key){
    await writeFile(VIDEOS_FILE,videosFileText(videos));
    console.log('YOUTUBE_API_KEY is not set: no new videos searched.');return
  }
  const todo=[...seen].filter(([k,e])=>!videos[k]&&e.stock&&!(misses[k]&&Date.parse(misses[k])>cutoff)).sort((a,b)=>b[1].n-a[1].n).slice(0,MAX_SEARCHES);
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

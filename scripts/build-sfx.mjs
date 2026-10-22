// Cuts the site's interface sounds (single key presses, down and up) from openly licensed Freesound recordings.
// Run by .github/workflows/sfx.yml (needs ffmpeg and network access); writes assets/sounds/ui/.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.join(root,'assets/sounds/ui'), tmp=path.join(root,'.cache/sfx');
await mkdir(out,{recursive:true}); await mkdir(tmp,{recursive:true});
const {sources,clips}=JSON.parse(await readFile(path.join(root,'scripts/sfx-sources.json'),'utf8'));
const SR=44100, decoded={};

// The license listed here has to match the sound's own Freesound page, so a relicensed or mistyped source stops the build.
async function checkLicense(key){
  const s=sources[key];
  if(!/^CC0/.test(s.license)) throw Error(`${key}: license ${s.license} is not CC0`);
  const r=await fetch(`https://freesound.org/people/${encodeURIComponent(s.user)}/sounds/${s.freesound}/`);
  if(!r.ok) throw Error(`${key}: Freesound page HTTP ${r.status}`);
  const html=await r.text();
  if(!html.includes('creativecommons.org/publicdomain/zero/1.0')) throw Error(`${key}: Freesound page does not show CC0`);
  console.log(`${key}: CC0 confirmed on freesound.org/s/${s.freesound}`);
}

async function load(key){
  if(decoded[key]) return decoded[key];
  const s=sources[key];
  await checkLicense(key);
  const r=await fetch(s.preview); if(!r.ok) throw Error(`${key}: HTTP ${r.status}`);
  const src=path.join(tmp,key+'.mp3'); await writeFile(src,Buffer.from(await r.arrayBuffer()));
  // Rumble below 50 Hz and hiss above 13 kHz go; the body of the keystroke stays as recorded.
  const raw=execFileSync('ffmpeg',['-loglevel','error','-i',src,'-af','highpass=f=50,lowpass=f=13000','-ac','1','-ar',String(SR),'-f','f32le','-'],{maxBuffer:1<<28});
  return decoded[key]=new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4);
}

function wav(x){
  const b=Buffer.alloc(44+x.length*2);
  b.write('RIFF',0); b.writeUInt32LE(36+x.length*2,4); b.write('WAVEfmt ',8); b.writeUInt32LE(16,16); b.writeUInt16LE(1,20); b.writeUInt16LE(1,22);
  b.writeUInt32LE(SR,24); b.writeUInt32LE(SR*2,28); b.writeUInt16LE(2,32); b.writeUInt16LE(16,34); b.write('data',36); b.writeUInt32LE(x.length*2,40);
  x.forEach((v,i)=>b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2));
  return b;
}

const credits=[];
for(const c of clips){
  const x=await load(c.source), s=sources[c.source];
  // The press starts where the signal first reaches a fifth of its peak near the listed time, so every clip begins
  // on the attack (4 ms of lead-in) and plays without a gap.
  const a=Math.max(0,Math.round((c.at-.04)*SR)), z=Math.min(x.length,Math.round((c.at+.06)*SR));
  let pk=0; for(let i=a;i<z;i++) pk=Math.max(pk,Math.abs(x[i]));
  let on=a; while(on<z&&Math.abs(x[on])<pk*.2) on++;
  const start=Math.max(0,on-Math.round(.004*SR)), n=Math.round(c.length*SR), y=new Float32Array(n);
  for(let i=0;i<n&&start+i<x.length;i++) y[i]=x[start+i];
  let max=0; for(const v of y) max=Math.max(max,Math.abs(v));
  const gain=.708/max, fi=Math.round(.002*SR), fo=Math.round(n*.35);
  for(let i=0;i<n;i++){
    let g=gain;
    if(i<fi) g*=Math.sin(Math.PI/2*i/fi);
    if(i>n-fo) g*=.5+.5*Math.cos(Math.PI*(i-(n-fo))/fo);
    y[i]*=g;
  }
  await writeFile(path.join(out,c.file+'.wav'),wav(y));
  console.log(`${c.file}: ${((start/SR)).toFixed(3)} s, ${c.length} s, gain ${(20*Math.log10(gain)).toFixed(1)} dB`);
  credits.push(`- \`${c.file}.wav\`: ${c.use}. From "${s.title}" by ${s.user}, https://freesound.org/s/${s.freesound}/ (${s.license}), cut at ${(start/SR).toFixed(3)} s, filtered and level-matched.`);
}
await writeFile(path.join(out,'CREDITS.md'),`# Interface sound credits\n\nThe site's interface sounds are single key presses cut from these Freesound recordings, each released under the license shown.\n\n${credits.join('\n')}\n`);
console.log(`Wrote ${clips.length} sounds`);

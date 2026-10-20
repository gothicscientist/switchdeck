// Cuts the quiz's 10-second sound examples from openly licensed Freesound recordings.
// Run by .github/workflows/sounds.yml (needs ffmpeg and network access); writes assets/sounds/.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.join(root,'assets/sounds'), tmp=path.join(root,'.cache/sounds');
await mkdir(out,{recursive:true}); await mkdir(tmp,{recursive:true});
const sources=JSON.parse(await readFile(path.join(root,'scripts/sound-sources.json'),'utf8'));
const credits=[];
for(const s of sources){
  if(!/^CC0|^CC BY/.test(s.license)) throw Error(`${s.key}: license ${s.license} is not CC0 or CC BY`);
  const r=await fetch(s.preview); if(!r.ok) throw Error(`${s.key}: HTTP ${r.status}`);
  const src=path.join(tmp,s.key+'.mp3'); await writeFile(src,Buffer.from(await r.arrayBuffer()));
  // Ten seconds from the steadiest stretch of typing, loudness-matched, with short fades so the loop doesn't click.
  execFileSync('ffmpeg',['-y','-loglevel','error','-ss',String(s.start),'-t','10','-i',src,
    '-af',`highpass=f=35,loudnorm=I=${s.loudness}:TP=-2:LRA=11,afade=t=in:d=0.03,afade=t=out:st=9.94:d=0.06`,
    '-ac','1','-ar','44100','-c:a','libmp3lame','-b:a','96k',path.join(out,s.key+'.mp3')]);
  credits.push(`- **${s.label}** (\`${s.key}.mp3\`): "${s.title}" by ${s.user}, https://freesound.org/s/${s.freesound}/ (${s.license}). ${s.note}. Trimmed to 10 s from ${s.start} s and loudness-matched.`);
}
await writeFile(path.join(out,'CREDITS.md'),`# Sound example credits\n\nThe quiz's sound examples are cut from these Freesound recordings. Each is released under the license shown.\n\n${credits.join('\n')}\n`);
console.log(`Wrote ${sources.length} clips`);

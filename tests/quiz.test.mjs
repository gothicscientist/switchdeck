import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const step=key=>{const s=html.indexOf(`{key:'${key}'`);return html.slice(s,html.indexOf(']}',s))};

test('the feel step talks about feel only',()=>{
  const feel=step('feel');
  assert.doesNotMatch(feel,/snd:|clip:/,'no sound previews');
  assert.doesNotMatch(feel.replace(/Sound is the next step/,''),/sound|quiet|loud|click\b|clack|thock|hear|recording/i);
});
test('every sound option plays a credited clip that ships with the site',async()=>{
  const sound=step('sound');
  const clips=[...sound.matchAll(/clip:'(\w+)'/g)].map(m=>m[1]);
  assert.deepEqual(clips,['thock','creamy','clack','quiet']);
  assert.doesNotMatch(sound,/snd:/,'no YouTube player');
  const sources=JSON.parse(await readFile(new URL('../scripts/sound-sources.json',import.meta.url),'utf8'));
  const credits=await readFile(new URL('../assets/sounds/CREDITS.md',import.meta.url),'utf8');
  for(const k of clips){
    const s=sources.find(x=>x.key===k);
    assert.ok(s&&/^(CC0|CC BY)/.test(s.license),k+' license');
    assert.ok((await stat(new URL(`../assets/sounds/${k}.mp3`,import.meta.url))).size>20000,k+' clip');
    assert.ok(credits.includes(`freesound.org/s/${s.freesound}/`),k+' credit');
  }
});
test('questions run feel, sound, look, layout, use, wireless, solder, budget',()=>{
  const s=html.indexOf('const QUESTIONS = [');
  const block=html.slice(s,html.indexOf('\n];',s));
  assert.deepEqual([...block.matchAll(/\{key:'(\w+)'/g)].map(m=>m[1]),['feel','sound','look','layout','use','wireless','solder','budget']);
  assert.doesNotMatch(step('feel'),/feel-graph/);
});

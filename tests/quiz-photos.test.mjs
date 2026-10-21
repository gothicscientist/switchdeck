import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';

const read=f=>readFile(new URL('../'+f,import.meta.url),'utf8');

test('every quiz photo is credited with an open licence and used by the page',async()=>{
  const html=await read('index.html'), credits=await read('assets/quiz/CREDITS.md');
  const files=(await readdir(new URL('../assets/quiz/',import.meta.url))).filter(f=>f.endsWith('.webp'));
  assert.ok(files.length>=4);
  for(const f of files){
    const row=credits.split('\n').find(l=>l.startsWith('| `'+f+'`'));
    assert.ok(row,f+' has a credits row');
    assert.match(row,/commons\.wikimedia\.org\/wiki\/File:/,f+' links its source');
    assert.match(row,/\[(CC0 1\.0|CC BY 4\.0|CC BY-SA 4\.0)\]/,f+' names an open licence');
    assert.ok(html.includes(`['${f.replace('.webp','')}',`),f+' is listed in QUIZ_PHOTOS');
  }
  assert.match(html,/Photos from <a href="assets\/quiz\/CREDITS.md"/,'cards with photos link the credits');
});

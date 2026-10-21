import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';

const read=f=>readFile(new URL('../'+f,import.meta.url),'utf8');

test('every quiz photo has a recorded source and is used by the page',async()=>{
  const html=await read('index.html'), credits=await read('assets/quiz/CREDITS.md');
  const files=(await readdir(new URL('../assets/quiz/',import.meta.url))).filter(f=>f.endsWith('.webp'));
  assert.ok(files.length>=4);
  for(const f of files){
    const row=credits.split('\n').find(l=>l.startsWith('| `'+f+'`'));
    assert.ok(row,f+' has a credits row');
    // Either an openly licensed Commons photo with its licence, or a photo the site owner supplied.
    assert.ok(/Supplied by the site owner/.test(row)||(/commons\.wikimedia\.org\/wiki\/File:/.test(row)&&/\[(CC0 1\.0|CC BY 4\.0|CC BY-SA 4\.0)\]/.test(row)),f+' names its source and licence');
    assert.ok(html.includes(`['${f.replace('.webp','')}',`),f+' is listed in QUIZ_PHOTOS');
  }
});

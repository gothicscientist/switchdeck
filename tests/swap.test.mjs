import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const fn=name=>{const s=html.indexOf(`function ${name}(`); assert.ok(s>0,name); return html.slice(s,html.indexOf('\n}\n',s))};

test('alternatives never include parts the compatibility check rejects',()=>{
  assert.match(fn('swapCands'),/if\(compat\(b2\)\.some\(i=>i\.level==='fail'\)\) continue;/);
});
test('"Fits" is shown only where store data confirms it',()=>{
  const f=fn('swapFit');
  // Switches and cases are only assumed MX-style when unlabelled, so they never get a positive label.
  assert.match(f,/\['pcb','plate','keycaps','stabs'\]\.includes\(slot\)&&rel\.some\(i=>i\.level==='ok'\)\) return \{level:'ok',text:'Fits'\}/);
  assert.ok(f.indexOf("return {level:'info'}")<f.indexOf("text:'Fits'"),'an open check wins over a fit');
  assert.doesNotMatch(f,/text:'Check fit'/,'unconfirmed fits carry no tag');
});
test('in-stock alternatives come before sold-out ones',()=>{
  assert.match(fn('swapCands'),/sort\(\(a,b\)=>\(!!a\.p\.soldOut-!!b\.p\.soldOut\)\|\|b\.rank-a\.rank\)/);
});
test('the results screen shares, copies and customizes the build as changed',()=>{
  const r=fn('renderRDetail');
  assert.match(r,/r0=resList\[resIdx\], r=resView\(r0\), b=r\.b/);
  assert.match(r,/shareUrl\(b\)/);
  assert.match(r,/build=\{\.\.\.b,extras:\[\.\.\.b\.extras\]/);
});
test('undo and reset keep a history instead of discarding it',()=>{
  const r=fn('renderRDetail');
  assert.match(r,/e\.b=e\.undo\.pop\(\)/);
  assert.match(r,/e\.undo\.push\(e\.b\); e\.b=r0\.b/);
});
test('swap price changes are whole dollars',()=>{
  assert.match(fn('showSwap'),/const dt=Math\.round\(x\.t-r\.t\)/);
});

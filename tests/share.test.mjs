import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const read=f=>readFile(new URL('../'+f,import.meta.url),'utf8');
const html=await read('index.html');
const ctx={};vm.createContext(ctx);
vm.runInContext(await read('assets/share-code.js'),ctx);
vm.runInContext(await read('data/builder-catalog.js').then(s=>s.replace(/^window\./m,'globalThis.')),ctx);
const S=ctx.SwitchdeckShare, CAT=ctx.SWITCHDECK_CATALOG;
const parts=['cases','pcbs','plates','switches','keycaps','stabs','extras'].flatMap(k=>CAT[k]||[]);
// The finder questions as the page defines them: keys, option values and which one is the budget.
const qsrc=html.slice(html.indexOf('const QUESTIONS = ['),html.indexOf('\n];',html.indexOf('const QUESTIONS = ['))+3);
const QUESTIONS=[...qsrc.matchAll(/\{key:'(\w+)'([\s\S]*?)(?=\{key:'|\n\];)/g)].map(([,key,body])=>
  /budget:true/.test(body)?{key,budget:true}:{key,opts:[...body.matchAll(/\{v:'([^']+)'/g)].map(m=>({v:m[1]}))});

test('the page loads the share code and links to ?b=',()=>{
  assert.match(html,/<script src="assets\/share-code.js"><\/script>/);
  assert.match(html,/const SHARE_PARAM='b';/);
});
test('every catalog part ID survives a share link unchanged',()=>{
  assert.ok(parts.length>5000);
  for(const p of parts){const t=S.packId(p.id); assert.match(t,/^[A-Za-z0-9~-]+$/,p.id); assert.equal(S.unpackId(t),p.id)}
});
test('store listing IDs are shortened',()=>{
  assert.equal(S.packId('mechanicalkeyboards-15027968311407'),'I'+(15027968311407).toString(36));
  assert.equal(S.unpackId(S.packId('cannonkeys-7039178702959~41095930019951')),'cannonkeys-7039178702959~41095930019951');
  assert.equal(S.packId('oilking'),'oilking');
});
test('finder answers keep their meaning in old links',()=>{
  // Version 1 links store each answer as its option's position. Reordering options needs a new link version.
  assert.deepEqual(QUESTIONS.map(q=>q.budget?'budget':q.key+':'+q.opts.map(o=>o.v).join(',')),[
    'layout:60,65,75,tkl,full,any','feel:Linear,Tactile,Clicky,Silent,any','sound:thock,creamy,clack,quiet,any',
    'look:dark,light,colorful,retro,surprise','use:gaming,work,any','wireless:wired,yes,any','solder:hotswap,either','budget']);
});
test('a build and its answers round-trip',()=>{
  const b={case:'keychron-1',color:2,pcb:null,plate:null,switches:'oilking',stabs:'durockv2',keycaps:'divinikey-123456789~987654321',extras:['tapemod','kbdfans-7777777']};
  const ans={layout:'65',feel:'Linear',sound:'thock',look:'surprise',use:'any',wireless:'yes',solder:'either',budget:300,seed:424242};
  const code=S.encode(b,ans,QUESTIONS);
  assert.ok(code.length<90,code);
  const d=S.decode(code,QUESTIONS);
  assert.deepEqual(JSON.parse(JSON.stringify(d.b)),b);
  assert.deepEqual(JSON.parse(JSON.stringify(d.ans)),ans);
  assert.deepEqual(JSON.parse(JSON.stringify(S.decode(S.encode({case:'x1'},{budget:'any'},QUESTIONS),QUESTIONS).ans)),{budget:'any'});
  assert.deepEqual(JSON.parse(JSON.stringify(S.decode('1.x1',QUESTIONS).ans)),{});
});
test('malformed links are refused, not guessed at',()=>{
  for(const bad of ['','zzz','2.x1','1.','1.Zabc','1.A0abc','1.x1.c','1.x1.0..BAD','1.x1........!!','1.'+'a'.repeat(2000),'1.A1.%E0%A4%A'])
    assert.throws(()=>S.decode(bad,QUESTIONS),bad);
});

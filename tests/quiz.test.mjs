import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import vm from 'node:vm';

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
test('questions run size, feel, sound, look, use, wireless, solder, budget',()=>{
  const s=html.indexOf('const QUESTIONS = [');
  const block=html.slice(s,html.indexOf('\n];',s));
  assert.deepEqual([...block.matchAll(/\{key:'(\w+)'/g)].map(m=>m[1]),['layout','feel','sound','look','use','wireless','solder','budget']);
  assert.doesNotMatch(step('feel'),/feel-graph/);
});

async function load(){
  const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean).join('\n');
  const ctx={URL,window:{},localStorage:{getItem:()=>null},innerWidth:1300};vm.createContext(ctx);
  for(const file of ['assets/product-links.js','data/product-links.js'])vm.runInContext(await readFile(new URL('../'+file,import.meta.url),'utf8'),ctx);
  vm.runInContext(await readFile(new URL('../data/builder-catalog.js',import.meta.url),'utf8'),ctx);
  vm.runInContext(inline.slice(0,inline.indexOf('const LAYOUTS =')),ctx);
  const cfg=inline.match(/function configsFor\(c,ans\)\{[\s\S]*?\n\}/)[0];
  const combos=inline.slice(inline.indexOf('/*COMBOS-START*/'),inline.indexOf('/*COMBOS-END*/'));
  vm.runInContext(`const B_MAX=600; ${cfg}\n${combos}`,ctx);
  return ctx;
}
const run=(ctx,code)=>vm.runInContext(code,ctx);

test('must-have rules only match boards the data positively confirms',async()=>{
  const ctx=await load();
  const has=(c,m)=>run(ctx,`boardHasMust(${JSON.stringify(c)},${JSON.stringify(m)})`);
  assert.equal(has({},null),true,'no must-have keeps everything');
  assert.equal(run(ctx,'mustOf({must:"none"})'),null);
  assert.equal(run(ctx,'mustOf({})'),null);
  // hot-swap: kit PCB flag must be exactly true; unknown (null) is excluded
  assert.equal(has({kit:{pcb:{hotswap:true}}},'hotswap'),true);
  assert.equal(has({kit:{pcb:{hotswap:false}}},'hotswap'),false);
  assert.equal(has({kit:{pcb:{hotswap:null}}},'hotswap'),false);
  assert.equal(has({kit:{pcb:{}}},'hotswap'),false);
  // knob: only an explicit true
  assert.equal(has({knob:true},'knob'),true);
  assert.equal(has({knob:false},'knob'),false);
  assert.equal(has({},'knob'),false);
  // rapid and low profile need a stated switch system; missing data never matches
  assert.equal(has({},'rapid'),false);
  assert.equal(has({switchSystem:null},'rapid'),false);
  assert.equal(has({switchSystem:'mx-mechanical'},'rapid'),false);
  assert.equal(has({switchSystem:'hall-effect'},'rapid'),true);
  assert.equal(has({},'lowprofile'),false);
  assert.equal(has({switchSystem:'low-profile'},'lowprofile'),true);
  assert.equal(has({switchSystem:'hall-effect'},'lowprofile'),false);
});

test('each must-have narrows the finder results and the combination count',async()=>{
  const ctx=await load();
  const count=a=>run(ctx,`comboCount(${JSON.stringify(a)})`);
  const base=count({});
  assert.equal(count({must:'none'}),base,'"No must-haves" is no filter');
  for(const must of ['hotswap','knob']){
    const n=count({must});
    assert.ok(n>0&&n<base,`${must}: ${n} of ${base}`);
  }
  for(const must of ['hotswap','rapid','knob','lowprofile']){
    assert.ok(count({must})<=base);
    assert.ok(count({must,layout:'75'})<=count({layout:'75'}));
  }
  // every board the counter keeps for a must-have really satisfies the rule
  const kept=run(ctx,`(()=>{const o={};for(const m of ['hotswap','rapid','knob','lowprofile'])o[m]=FINDER_CASES.filter(c=>boardHasMust(c,m)).map(c=>({kit:c.kit&&c.kit.pcb.hotswap,knob:c.knob,sys:c.switchSystem,fit:c.fit,id:c.id}));return JSON.parse(JSON.stringify(o))})()`);
  kept.hotswap.forEach(c=>assert.ok(c.kit===true||(c.kit==null&&c.fit),c.id));
  kept.knob.forEach(c=>assert.equal(c.knob,true,c.id));
  kept.rapid.forEach(c=>assert.equal(c.sys,'hall-effect',c.id));
  kept.lowprofile.forEach(c=>assert.equal(c.sys,'low-profile',c.id));
});


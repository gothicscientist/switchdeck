import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

async function load(){
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean).join('\n');
  const ctx={URL,window:{},localStorage:{getItem:()=>null},innerWidth:1300};vm.createContext(ctx);
  for(const file of ['assets/product-links.js','data/product-links.js'])vm.runInContext(await readFile(new URL('../'+file,import.meta.url),'utf8'),ctx);
  vm.runInContext(await readFile(new URL('../assets/part-names.js',import.meta.url),'utf8'),ctx);
  vm.runInContext(await readFile(new URL('../data/builder-catalog.js',import.meta.url),'utf8'),ctx);
  vm.runInContext(inline.slice(0,inline.indexOf('const LAYOUTS =')),ctx);
  // comboCount lives after the renderer; evaluate only the pieces it needs.
  const cfg=inline.match(/function configsFor\(c,ans\)\{[\s\S]*?\n\}/)[0];
  const combos=inline.slice(inline.indexOf('/*COMBOS-START*/'),inline.indexOf('/*COMBOS-END*/'));
  vm.runInContext(`const B_MAX=600; ${cfg}\n${combos}`,ctx);
  return ctx;
}
const run=(ctx,code)=>vm.runInContext(code,ctx);

test('combination counter is large, real and narrows with every answer',async()=>{
  const ctx=await load();
  const count=a=>run(ctx,`comboCount(${JSON.stringify(a)})`);
  const base=count({});
  assert.ok(base>1_000_000,`unanswered ${base}`);
  const singles=[{layout:'65'},{feel:'Linear'},{sound:'quiet'},{use:'gaming'},{wireless:'yes'},{look:'dark'},{budget:300}];
  const parts=singles.map(a=>count(a));
  parts.forEach((n,i)=>assert.ok(n<base,`${JSON.stringify(singles[i])} ${n} !< ${base}`));
  const all=count(Object.assign({},...singles));
  assert.ok(all>=0);
  parts.forEach(n=>assert.ok(all<=n));
  assert.ok(count({layout:'65',feel:'Linear'})<=Math.min(parts[0],parts[1]));
});

test('two-pointer budget count equals a brute-force nested loop for a board',async()=>{
  const ctx=await load();
  const r=run(ctx,`(()=>{
    const c=CASES.find(c=>!c.soldOut&&!c.assembled&&c.kit&&c.layout==='65'&&c.price<200);
    const out=[];
    for(const budget of [c.price+60,c.price+150,c.price+400]){
      const only=CASES.filter(x=>x!==c);
      const L=c.layout, q=switchQty({case:c.id})||70;
      let brute=0;
      // a board only takes switches of its own family (MX, magnetic, low-profile, optical)
      const b={case:c.id,extras:[]},p=effPcb(b);
      if(!stabsIncluded(b))b.stabs=p?.stabs?.includes('screw')?'durockv2':p?.stabs?.includes('clip')?'cherryclip':null;
      const base=total(b);
      for(const s of SWITCHES.filter(s=>!s.soldOut&&swSystemOf(s)===boardSystem(c))) for(const k of KEYCAPS){
        if(k.soldOut||!k.covers||!(k.covers.includes(L)||(k.addon&&k.addon[L]))) continue;
        const add=!k.covers.includes(L)&&k.addon&&k.addon[L]||0;
        if(base+switchCost(s,q)+k.price+add<=budget+1e-9) brute++;
      }
      // isolate the board: count with and without it by temporarily shrinking FINDER_CASES
      const saved=FINDER_CASES.slice(); FINDER_CASES.length=0; FINDER_CASES.push(c);
      comboCache.clear(); const fast=comboCount({layout:L,budget}); 
      FINDER_CASES.length=0; FINDER_CASES.push(...saved); comboCache.clear();
      out.push([brute,fast]);
    }
    return out})()`);
  for(const [brute,fast] of r) assert.equal(fast,brute);
  assert.ok(r.some(([b])=>b>0));
});


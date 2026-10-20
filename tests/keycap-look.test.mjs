import test from 'node:test';
import assert from 'node:assert/strict';
import {analyze,judge,photoRecord} from '../scripts/image-check.mjs';
import {keycapMood,keycapPalette} from '../scripts/keycap-look.mjs';

function canvas(W,H,rects,bg=[255,255,255]){
  const data=new Uint8ClampedArray(W*H*4);
  for(let i=0;i<W*H;i++){data.set(bg,i*4);data[i*4+3]=255}
  for(const [x,y,w,h,c] of rects) for(let j=y;j<y+h;j++) for(let i=x;i<x+w;i++) data.set(c,(j*W+i)*4);
  return {data,width:W,height:H,channels:4};
}
const toneOf=rects=>analyze(canvas(160,100,rects)).tone;

test('tone of an all-black set reads dark',()=>{
  const t=toneOf([[10,20,140,60,[18,18,20]]]);
  assert.ok(t.dark>=95&&t.lum<15&&t.light===0&&t.colorful===0,JSON.stringify(t));
  assert.deepEqual(keycapMood('Plain set',t),['dark']);
  assert.equal(t.swatches.length,1);
  assert.equal(t.swatches[0].share,100);assert.match(t.swatches[0].hex,/^#[0-9a-f]{6}$/);
});
test('tone of a cream set reads retro and light',()=>{
  const t=toneOf([[10,20,140,60,[214,204,184]]]);
  assert.ok(t.beige>=95&&t.light>=95&&t.colorful===0,JSON.stringify(t));
  assert.deepEqual(keycapMood('Plain set',t),['light','retro']);
});
test('tone of a multi-colour set reads colorful and lists swatches by share',()=>{
  const t=toneOf([[10,20,50,60,[220,40,40]],[60,20,50,60,[40,90,220]],[110,20,40,60,[240,200,30]]]);
  assert.ok(t.colorful>=95&&t.sat>=70,JSON.stringify(t));
  assert.ok(keycapMood('Plain set',t).includes('colorful'));
  assert.equal(t.swatches.length,3);
  assert.deepEqual(t.swatches.map(s=>s.share),[...t.swatches.map(s=>s.share)].sort((a,b)=>b-a));
});
test('close colours merge into one swatch and an empty image has no tone',()=>{
  const t=toneOf([[10,20,70,60,[100,100,100]],[80,20,70,60,[108,104,98]]]);
  assert.equal(t.swatches.length,1);
  assert.equal(analyze(canvas(40,40,[])).tone,undefined);
});
test('only keycap photo records carry tone',()=>{
  const f=analyze(canvas(160,100,[[10,20,140,60,[18,18,20]]]));
  assert.ok(photoRecord('https://x/a.jpg',f,'keycaps').tone);
  for(const c of ['case','switches','stabs','extras']) assert.equal('tone' in photoRecord('https://x/a.jpg',f,c),false,c);
  assert.ok(judge(f,'keycaps')>0);
});

test('keycapMood reads retailer name keywords on their own',()=>{
  assert.deepEqual(keycapMood('GMK Midnight WoB'),['dark']);
  assert.deepEqual(keycapMood('GMK Blackberry'),['dark']);
  assert.deepEqual(keycapMood('PBTfans Milk BoW'),['light']);
  assert.deepEqual(keycapMood('GMK Black on White'),['dark','light']);
  assert.deepEqual(keycapMood('GMK 9009'),['retro']);
  assert.deepEqual(keycapMood('SA Classic Beige'),['retro']);
  assert.deepEqual(keycapMood('Rainbow Neon'),['colorful']);
  assert.deepEqual(keycapMood('GMK Lilac Pink'),['colorful']);
  assert.deepEqual(keycapMood('Redshift Mintaka'),[],'no colour word on its own');
  assert.deepEqual(keycapMood('Plain Set'),[]);
  assert.deepEqual(keycapMood(null),[]);
});
test('keycapMood applies the photo thresholds and de-duplicates',()=>{
  const base={lum:50,dark:0,light:0,sat:10,colorful:0,beige:0,swatches:[]};
  assert.deepEqual(keycapMood('Set',base),[]);
  assert.deepEqual(keycapMood('Set',{...base,dark:45}),['dark']);
  assert.deepEqual(keycapMood('Set',{...base,lum:29}),['dark']);
  assert.deepEqual(keycapMood('Set',{...base,light:45}),['light']);
  assert.deepEqual(keycapMood('Set',{...base,lum:73}),['light']);
  assert.deepEqual(keycapMood('Set',{...base,colorful:22}),['colorful']);
  assert.deepEqual(keycapMood('Set',{...base,sat:35,colorful:12}),['colorful']);
  assert.deepEqual(keycapMood('Set',{...base,sat:34,colorful:12}),[]);
  assert.deepEqual(keycapMood('Set',{...base,beige:30}),['retro']);
  assert.deepEqual(keycapMood('Black Set',{...base,dark:80,lum:20}),['dark'],'name and photo agree once');
  assert.deepEqual(keycapMood('Dark Rainbow',{...base,colorful:40,beige:35}),['dark','colorful','retro']);
});
test('keycapPalette has the documented shape',()=>{
  assert.equal(keycapPalette(null),null);
  assert.equal(keycapPalette({swatches:[]}),null);
  const p=keycapPalette({swatches:[{hex:'#202022',share:60},{hex:'#e8e4d8',share:25},{hex:'#d02828',share:10}]});
  assert.deepEqual(Object.keys(p),['alpha','mod','accent','leg','modleg','accleg']);
  assert.equal(p.alpha,'#202022');assert.equal(p.mod,'#e8e4d8');assert.equal(p.accent,'#d02828');
  assert.equal(p.leg,'#ECECEA');assert.equal(p.modleg,'#202124');
  for(const v of Object.values(p)) assert.match(v,/^#[0-9a-fA-F]{6}$/);
});
test('keycapPalette falls back when swatches are alike or grey',()=>{
  const p=keycapPalette({swatches:[{hex:'#808080',share:70},{hex:'#8a8a8a',share:20}]});
  assert.equal(p.mod,p.alpha);assert.equal(p.accent,p.mod);
  const q=keycapPalette({swatches:[{hex:'#f4f4f0',share:90}]});
  assert.equal(q.leg,'#202124');
});

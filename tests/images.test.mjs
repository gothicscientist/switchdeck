import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {analyze,judge,photoRecord} from '../scripts/image-check.mjs';

// Draws filled rectangles on a white canvas: [x,y,w,h,[r,g,b]].
function canvas(W,H,rects,bg=[255,255,255]){
  const data=new Uint8ClampedArray(W*H*4);
  for(let i=0;i<W*H;i++){data.set(bg,i*4);data[i*4+3]=255}
  for(const [x,y,w,h,c] of rects) for(let j=y;j<y+h;j++) for(let i=x;i<x+w;i++) data.set(c,(j*W+i)*4);
  return {data,width:W,height:H,channels:4};
}
const dark=[40,40,44];

test('a clean top-down keyboard photo passes and is framed to the board',()=>{
  const f=analyze(canvas(160,100,[[15,35,130,48,dark]]));
  assert.ok(judge(f,'case','65')>0);
  const r=photoRecord('https://cdn.shopify.com/a.jpg',f,'case');
  assert.deepEqual(r.box,[9.4,35,81.3,48]);assert.equal(r.bg,'#ffffff');assert.ok(Math.abs(r.ar-130/48)<0.01);
});
test('a stray switch or icon row beside the board is cropped out',()=>{
  const f=analyze(canvas(160,100,[[15,30,130,48,dark],[2,2,10,10,[200,30,30]],[60,86,40,6,dark]]));
  assert.ok(judge(f,'case','65')>0);
  assert.deepEqual(photoRecord('https://x/a.jpg',f,'case').box,[9.4,30,81.3,48]);
});
test('exploded views, angled shots, cropped edges and busy scenes fall back to an icon',()=>{
  // Square-ish bundle of parts: wrong outline for a 60% board.
  assert.equal(judge(analyze(canvas(160,160,[[20,30,120,100,dark]])),'case','60'),0);
  // Perspective: the back of the board is much narrower than the front.
  const rows=[];for(let y=0;y<50;y++){const inset=Math.round(20*(1-y/50));rows.push([10+inset,25+y,140-2*inset,1,dark])}
  assert.equal(judge(analyze(canvas(160,100,rows)),'case','75'),0);
  // Product runs off the edge of the photo.
  assert.equal(judge(analyze(canvas(160,100,[[0,30,150,48,dark]])),'case','65'),0);
  // Busy background: the border isn't one colour.
  const busy=canvas(160,100,[[15,35,130,48,dark]]);for(let i=0;i<busy.data.length;i+=4) if((i/4)%3===0) busy.data.set([90,140,60],i);
  assert.equal(judge(analyze(busy),'case','65'),0);
});
test('a single switch photo passes',()=>{
  assert.ok(judge(analyze(canvas(160,160,[[50,40,60,70,[230,200,60]]])),'switches')>0);
});

// Pulls the site's real framedPhoto helper out of index.html.
async function siteHelpers(){
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const fn=html.slice(html.indexOf('let pfSeq=0;'),html.indexOf('function buildBoard('));
  const ctx={URL};vm.createContext(ctx);
  vm.runInContext(`function esc(s){return String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';')}\n`+fn,ctx);
  return {html,ctx};
}
test('the site shows only checked photos, inside a clipped frame, with an icon fallback',async()=>{
  const {html,ctx}=await siteHelpers();
  const icon='<svg class="icon"></svg>';
  ctx.icon=icon;
  assert.equal(vm.runInContext(`framedPhoto({img:'https://cdn.shopify.com/a.jpg'},'A',icon)`,ctx),icon,'unchecked photo');
  assert.equal(vm.runInContext(`framedPhoto(null,'A',icon)`,ctx),icon);
  const out=vm.runInContext(`framedPhoto({img:'https://cdn.shopify.com/a.jpg',box:[10,20,80,50],ar:2.8,bg:'#ffffff'},'A',icon)`,ctx);
  assert.match(out,/<svg class="pf-photo" viewBox="[^"]+" preserveAspectRatio="xMidYMid meet"/);
  assert.match(out,/clip-path="url\(#pf\d+\)"/);
  assert.ok(out.includes(icon),'icon kept for load failures');
  // No raw <img> anywhere in the builder: every product picture goes through framedPhoto.
  assert.equal((html.match(/<img\b/g)||[]).length,0);
});
test('directory photos are letterboxed inside fixed frames',async()=>{
  const js=await readFile(new URL('../assets/directory.js',import.meta.url),'utf8');
  const css=await readFile(new URL('../assets/directory.css',import.meta.url),'utf8');
  assert.equal((js.match(/<img\b/g)||[]).length,1,'one image helper');
  for(const cls of ['directory-photo','directory-main-photo']){
    const rule=css.match(new RegExp('\\.'+cls+'\\{([^}]*)\\}'))?.[1]||'';
    assert.match(rule,/object-fit:contain/,cls);assert.match(rule,/height:\d+px/,cls);
  }
});

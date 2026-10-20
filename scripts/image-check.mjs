// Decides whether a product photo is clear enough to show, and where the product sits in it.
// Works on raw RGBA pixels so the same rules run in the catalog refresh and in tests.

const dist=(d,i,c)=>Math.max(Math.abs(d[i]-c[0]),Math.abs(d[i+1]-c[1]),Math.abs(d[i+2]-c[2]));

// Feature summary of one downscaled image: background, product bounding box and how solid it is.
export function analyze({data,width:W,height:H,channels:ch=4}){
  const at=(x,y)=>(y*W+x)*ch;
  const border=[];
  for(let x=0;x<W;x++){border.push(at(x,0),at(x,H-1))}
  for(let y=1;y<H-1;y++){border.push(at(0,y),at(W-1,y))}
  const med=k=>{const v=border.map(i=>data[i+k]).sort((a,b)=>a-b);return v[v.length>>1]};
  const bg=[med(0),med(1),med(2)];
  const transparent=ch===4&&border.filter(i=>data[i+3]<16).length/border.length>0.6;
  const isFg=i=>transparent?data[i+3]>=40:dist(data,i,bg)>28;
  const uniform=transparent?1:border.filter(i=>dist(data,i,bg)<=18).length/border.length;
  const mask=new Uint8Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++) if(isFg(at(x,y))) mask[y*W+x]=1;
  const all=region(mask,W,H,()=>true);
  if(!all) return {bg,uniform,transparent,empty:true};
  // Largest connected shape: a keyboard photo often carries a stray switch, badge or icon row beside it.
  const lab=new Int32Array(W*H); let best=0,bestN=0,total=0;
  for(let i=0,n=0;i<W*H;i++) if(mask[i]&&!lab[i]){
    n++; let size=0; const st=[i]; lab[i]=n;
    while(st.length){const j=st.pop(); size++; const x=j%W,y=(j/W)|0;
      for(const k of [x>0?j-1:-1,x<W-1?j+1:-1,y>0?j-W:-1,y<H-1?j+W:-1]) if(k>=0&&mask[k]&&!lab[k]){lab[k]=n;st.push(k)}}
    total+=size; if(size>bestN){bestN=size;best=n}
  }
  const main=region(mask,W,H,i=>lab[i]===best);
  return {bg,uniform,transparent,empty:false,...all,main:{...main,share:bestN/total}};
}

// Bounding box of the selected product pixels, ignoring thin specks and shadows at the edges.
function region(mask,W,H,keep){
  const cols=new Array(W).fill(0), rows=new Array(H).fill(0);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x; if(mask[i]&&keep(i)){cols[x]++;rows[y]++}}
  const span=(a,n)=>{const min=Math.max(1,n*0.02);let s=0,e=a.length-1;while(s<a.length&&a[s]<min)s++;while(e>s&&a[e]<min)e--;return s<=e?[s,e+1]:null};
  const xs=span(cols,H), ys=span(rows,W); if(!xs||!ys) return null;
  const [x0,x1]=xs,[y0,y1]=ys, bw=x1-x0, bh=y1-y0;
  let inBox=0; for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=y*W+x; if(mask[i]&&keep(i)) inBox++}
  // Width near the top against near the bottom: a board shot at an angle narrows toward the back.
  const rowW=y=>{let n=0;for(let x=x0;x<x1;x++){const i=y*W+x; if(mask[i]&&keep(i)) n++}return n};
  const a=rowW(y0+Math.floor(bh*0.2)), b=rowW(y0+Math.floor(bh*0.8));
  return {aspect:bw/bh,fill:inBox/(bw*bh),taper:Math.min(a,b)/Math.max(a,b,1),box:[x0/W,y0/H,bw/W,bh/H].map(v=>Math.round(v*1000)/10),touches:x0===0||y0===0||x1===W||y1===H};
}

// Expected outline of a keyboard seen from straight above, by layout.
const BOARD_ASPECT={'60':[2.3,3.5],'65':[2.3,3.6],'75':[2.0,3.2],tkl:[2.3,3.4],full:[2.45,4.3]};

// Returns a score above zero when the photo can be shown for this kind of part, else 0.
export function judge(f,cat,layout){
  if(!f||f.empty) return 0;
  // Busy backgrounds (desk scenes, lifestyle shots) can't be framed reliably.
  if(f.uniform<0.88) return 0;
  if(cat==='case'){
    const m=f.main, [lo,hi]=BOARD_ASPECT[layout]||[2.0,4.3];
    if(m.touches||m.share<0.6||m.aspect<lo||m.aspect>hi||m.fill<0.6||m.taper<0.85) return 0;
    const mid=(lo+hi)/2;
    return 1+m.fill-Math.abs(m.aspect-mid)/mid;
  }
  if(f.touches) return 0;
  if(cat==='switches'){ if(f.aspect<0.5||f.aspect>2||f.fill<0.35) return 0; return 1+f.fill }
  if(cat==='keycaps'){ if(f.aspect<0.8||f.aspect>4.5||f.fill<0.3) return 0; return 1+f.fill }
  if(f.aspect<0.3||f.aspect>6||f.fill<0.15) return 0;
  return 1+f.fill;
}

// Compact record the site uses to frame a photo tightly around the product.
export function photoRecord(img,f,cat){
  const r=cat==='case'?f.main:f;
  return {img,box:r.box,ar:Math.round(r.aspect*1000)/1000,bg:f.transparent?null:'#'+f.bg.map(v=>v.toString(16).padStart(2,'0')).join('')};
}

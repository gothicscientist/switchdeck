import {cp,mkdir,rm,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {FAQ} from './seo-content.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const dist=path.join(root,'dist');
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
// Publish only browser assets. Importer caches, tooling, dependencies and tests stay off the public site.
for(const file of ['index.html','CNAME','assets','data','robots.txt','manifest.webmanifest'])await cp(path.join(root,file),path.join(dist,file),{recursive:true});
const manifest=JSON.parse(await readFile(path.join(dist,'data/catalog-manifest.json'),'utf8'));
let html=await readFile(path.join(dist,'index.html'),'utf8');
// Every deploy gets content-addressed browser assets, avoiding mixed old/new scripts in a warm browser cache.
const refs=[...html.matchAll(/(?:src|href)=["']((?:assets|data)\/[^"'?]+\.(?:js|css|svg))["']/g)].map(m=>m[1]);
for(const file of new Set(refs)){
  const hash=createHash('sha256').update(await readFile(path.join(dist,file))).digest('hex').slice(0,12);
  html=html.replaceAll('"'+file+'"','"'+file+'?v='+hash+'"').replaceAll("'"+file+"'","'"+file+'?v='+hash+"'");
}
html=html.replace('<meta charset="utf-8">','<meta charset="utf-8">\n<meta name="thock-catalog-version" content="'+manifest.fingerprint+'">');
// Search and link-preview copy. Catalog figures come from the manifest, so the about page and llms.txt stay true
// after every daily refresh.
const fmt=n=>n.toLocaleString('en-US');
const updated=new Date(manifest.generatedAt);
const stores=manifest.sources.map(s=>s.name);
const vars={
  listings:fmt(manifest.listingCount), inStock:fmt(manifest.inStockCount), storeCount:String(stores.length),
  parts:fmt(['Switch','Extra','Case','Keycap','Stab','Pcb','Plate'].reduce((t,k)=>t+manifest['builder'+k+'Count'],0)),
  switches:fmt(manifest.builderSwitchCount), keycaps:fmt(manifest.builderKeycapCount), cases:fmt(manifest.builderCaseCount),
  pcbs:fmt(manifest.builderPcbCount), plates:fmt(manifest.builderPlateCount), stabs:fmt(manifest.builderStabCount), extras:fmt(manifest.builderExtraCount),
  stores:stores.slice(0,-1).join(', ')+' and '+stores.at(-1),
  updated:updated.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}), updatedIso:updated.toISOString(),
};
const fill=t=>t.replace(/\{\{(\w+)\}\}/g,(m,k)=>{if(!(k in vars))throw Error('No value for '+m);return vars[k]});
const faq=FAQ.map(([q,a])=>[fill(q),fill(a)]);
const escHtml=t=>t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
vars.faqHtml=faq.map(([q,a])=>`    <details><summary>${escHtml(q)}</summary><p>${escHtml(a)}</p></details>`).join('\n');
vars.faqJson=JSON.stringify(faq.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))).replace(/</g,'\\u003c');
vars.faqText=faq.map(([q,a])=>`### ${q}\n\n${a}`).join('\n\n');
await writeFile(path.join(dist,'about.html'),fill(await readFile(path.join(root,'about.html'),'utf8')));
await writeFile(path.join(dist,'llms.txt'),fill(await readFile(path.join(root,'llms.txt'),'utf8')));
const lastmod=manifest.generatedAt.slice(0,10);
await writeFile(path.join(dist,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${[['',1,true],['directory',.9],['build',.8],['about',.7]].map(([p,pri,img])=>`<url><loc>https://thock.cc/${p}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>${pri}</priority>${img?'<image:image><image:loc>https://thock.cc/assets/og.png</image:loc></image:image>':''}</url>`).join('\n')}
</urlset>
`);

// Each view's head says what that view is: title, description, canonical and preview text. Saved builds live in one
// browser, so that page stays out of search results.
const {THOCK_VIEW_META:META}=await import(new URL('../assets/view-meta.js',import.meta.url)).then(()=>globalThis);
const attr=(h,re,val)=>{if(!re.test(h))throw Error('Missing head tag '+re);return h.replace(re,(m,a,b)=>a+escHtml(val)+b)};
function headFor(v){
  const m=META[v], url='https://thock.cc/'+m.path;
  let h=html.replace(/<title>[^<]*<\/title>/,'<title>'+escHtml(m.title)+'</title>');
  h=attr(h,/(<meta name="description" content=")[^"]*(">)/,m.description);
  h=attr(h,/(<link rel="canonical" href=")[^"]*(">)/,url);
  h=attr(h,/(<meta property="og:url" content=")[^"]*(">)/,url);
  h=attr(h,/(<meta property="og:title" content=")[^"]*(">)/,m.title);
  h=attr(h,/(<meta name="twitter:title" content=")[^"]*(">)/,m.title);
  h=attr(h,/(<meta property="og:description" content=")[^"]*(">)/,m.description);
  h=attr(h,/(<meta name="twitter:description" content=")[^"]*(">)/,m.description);
  if(m.noindex)h=attr(h,/(<meta name="robots" content=")[^"]*(">)/,'noindex,follow');
  return h;
}
// Crawlers that don't run scripts still get a plain description of the directory; the directory replaces it on open.
const directoryIntro=`<header class="directory-head"><h1>Parts directory</h1></header><p>Every mechanical keyboard part Thock knows about, from ${vars.storeCount} stores: ${vars.stores}. Search ${vars.listings} listings of keyboards and kits, cases, PCBs, plates, switches, keycaps, stabilizers, mods, tools, cables and deskmats by name, brand, spec, store, switch system and price. Prices and stock are refreshed daily.</p><p><a href="about">How Thock works</a></p>`;

// Clean view URLs: GitHub Pages serves /build from build.html, so each view gets a copy of the page and a direct link
// or reload opens it with a 200. Any other path falls back to 404.html, which sends it to the nearest real page.
html=headFor('finder');
await writeFile(path.join(dist,'index.html'),html);
for(const view of ['build','saved','directory']){
  let h=headFor(view);
  if(view==='directory')h=h.replace('<div class="wrap" id="directory-root"></div>','<div class="wrap" id="directory-root">'+directoryIntro+'</div>');
  await writeFile(path.join(dist,view+'.html'),h);
}
await writeFile(path.join(dist,'404.html'),`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Thock</title>
<script>
(()=>{
  // The site is at / on thock.cc and at /<repo>/ on a github.io address.
  const parts=location.pathname.split('/').filter(Boolean);
  const root=location.hostname.endsWith('.github.io')&&parts.length?'/'+parts.shift()+'/':'/';
  const view=(parts[0]||'').replace(/\\.html$/,'');
  location.replace(root+(['build','saved','directory','about'].includes(view)?view:'')+location.search+location.hash);
})();
</script></head><body></body></html>
`);
await writeFile(path.join(dist,'.nojekyll'),'');
console.log('Staged Thock browser assets in dist/');

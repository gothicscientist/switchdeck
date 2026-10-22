import {cp,mkdir,rm,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const dist=path.join(root,'dist');
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
// Publish only browser assets. Importer caches, tooling, dependencies and tests stay off the public site.
for(const file of ['index.html','CNAME','assets','data','robots.txt','sitemap.xml'])await cp(path.join(root,file),path.join(dist,file),{recursive:true});
const manifest=JSON.parse(await readFile(path.join(dist,'data/catalog-manifest.json'),'utf8'));
let html=await readFile(path.join(dist,'index.html'),'utf8');
// Every deploy gets content-addressed browser assets, avoiding mixed old/new scripts in a warm browser cache.
const refs=[...html.matchAll(/(?:src|href)=["']((?:assets|data)\/[^"'?]+\.(?:js|css|svg))["']/g)].map(m=>m[1]);
for(const file of new Set(refs)){
  const hash=createHash('sha256').update(await readFile(path.join(dist,file))).digest('hex').slice(0,12);
  html=html.replaceAll('"'+file+'"','"'+file+'?v='+hash+'"').replaceAll("'"+file+"'","'"+file+'?v='+hash+"'");
}
html=html.replace('<meta charset="utf-8">','<meta charset="utf-8">\n<meta name="thock-catalog-version" content="'+manifest.fingerprint+'">');
await writeFile(path.join(dist,'index.html'),html);
// Clean view URLs: GitHub Pages serves /build from build.html, so each view gets a copy of the page and a direct link
// or reload opens it with a 200. Any other path falls back to 404.html, which sends it to the nearest real page.
for(const view of ['build','saved','directory'])await writeFile(path.join(dist,view+'.html'),html);
await writeFile(path.join(dist,'404.html'),`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Thock</title>
<script>
(()=>{
  // The site is at / on thock.cc and at /<repo>/ on a github.io address.
  const parts=location.pathname.split('/').filter(Boolean);
  const root=location.hostname.endsWith('.github.io')&&parts.length?'/'+parts.shift()+'/':'/';
  const view=(parts[0]||'').replace(/\\.html$/,'');
  location.replace(root+(['build','saved','directory'].includes(view)?view:'')+location.search+location.hash);
})();
</script></head><body></body></html>
`);
await writeFile(path.join(dist,'.nojekyll'),'');
console.log('Staged Thock browser assets in dist/');

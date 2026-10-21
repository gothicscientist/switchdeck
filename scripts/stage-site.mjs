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
await writeFile(path.join(dist,'.nojekyll'),'');
console.log('Staged Thock browser assets in dist/');

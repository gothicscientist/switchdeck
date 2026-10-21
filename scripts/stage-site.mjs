import {cp,mkdir,rm,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const dist=path.join(root,'dist');
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
// Publish only browser assets. Importer caches, tooling, dependencies and tests stay off the public site.
for(const file of ['index.html','CNAME','assets','data','robots.txt','sitemap.xml'])await cp(path.join(root,file),path.join(dist,file),{recursive:true});
await writeFile(path.join(dist,'.nojekyll'),'');
console.log('Staged Thock browser assets in dist/');

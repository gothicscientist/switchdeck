import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
export async function loadEngine(){
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const code=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean).join('\n');
 const ctx={URL,window:{},localStorage:{getItem:()=>null},innerWidth:1300,console}; vm.createContext(ctx);
 for(const f of ['assets/part-names.js','assets/product-links.js','data/product-links.js','data/builder-catalog.js','assets/build-engine.js']){
   try{vm.runInContext(await readFile(new URL('../'+f,import.meta.url),'utf8'),ctx)}catch(e){if(e.code!=='ENOENT')throw e}
 }
 vm.runInContext(code.slice(0,code.indexOf('const LAYOUTS =')),ctx);
 vm.runInContext(`const partName=p=>p.brand+' '+p.name; const storeOf=p=>p.retailers?.[0]?.name||'the retailer';`,ctx);
 vm.runInContext(code.slice(code.indexOf('const B_MIN='),code.indexOf('/* Counter display:')),ctx);
 return {ctx,run:code=>vm.runInContext(code,ctx)};
}
export async function audit(){
 const {run}=await loadEngine();
 const report=run(`(()=>{const counts=Object.fromEntries([['case',CASES],['switches',SWITCHES],['keycaps',KEYCAPS],['pcb',PCBS],['plate',PLATES],['stabs',STABS],['extras',EXTRAS]].map(([k,a])=>[k,a.length]));
 const budgets=[100,150,200,300,500], matrix=[],examples={},crossMatrix=[];
 for(const budget of budgets){const a={budget},res=evalAns(a).list; examples[budget]=res.slice(0,5).map(r=>({board:BYID[r.b.case].name,build:r.b,total:r.t,issues:compat(r.b),parts:lineItems(r.b).map(i=>({name:i.part.name,price:i.price,url:i.part.retailers?.[0]?.url}))}));
 for(const [dimension,values] of Object.entries({layout:['60','65','75','tkl','full'],wireless:['wired','yes'],feel:['Linear','Tactile','Silent'],must:['none','rapid','lowprofile']}))for(const value of values){const ans={budget,[dimension]:value},list=evalAns(ans).list;matrix.push({budget,dimension,value,boards:list.length,custom:list.filter(r=>!BYID[r.b.case].assembled).length,count:comboCount(ans)})}}
 const purchaseExamples={};for(const budget of budgets){const list=evalAns({budget}).list;const picks=[list.find(r=>!BYID[r.b.case].assembled),list.find(r=>BYID[r.b.case].assembled),list.find(r=>BYID[r.b.case].switchSystem==='hall-effect'),list.find(r=>BYID[r.b.case].switchSystem==='low-profile')].filter(Boolean);purchaseExamples[budget]=picks.map(r=>({board:BYID[r.b.case].brand+' '+BYID[r.b.case].name,kind:BYID[r.b.case].assembled?'assembled':'custom',total:r.t,build:r.b,parts:lineItems(r.b).map(i=>({name:i.part.brand+' '+i.part.name,quantity:i.qty,price:i.price,url:i.part.retailers?.[0]?.url})),ready:PURCHASE.evaluate(r.b,{budget}).ready}));}
 for(const budget of budgets)for(const layout of ['60','65','75','tkl','full'])for(const wireless of ['wired','yes'])for(const feel of ['Linear','Tactile','Silent'])for(const system of ['mx-mechanical','hall-effect','low-profile']){
   const ans={budget,layout,wireless,feel,system},list=evalAns(ans).list,n=comboCount(ans);crossMatrix.push({...ans,boards:list.length,custom:list.filter(r=>!BYID[r.b.case].assembled).length,count:n,agreement:(n>0)===(list.length>0),unresolved:list.filter(r=>!PURCHASE.evaluate(r.b,ans).ready||Math.abs(total(r.b)-r.t)>.001||r.t>budget).length,uniqueTopBoards:new Set(list.slice(0,20).map(r=>SwitchdeckBuild.identity(BYID[r.b.case]))).size,uniqueTopSwitches:new Set(list.slice(0,20).map(r=>r.b.switches).filter(Boolean)).size,uniqueTopKeycaps:new Set(list.slice(0,20).map(r=>r.b.keycaps).filter(Boolean)).size});
 }
 const standalone=FINDER_CASES.filter(c=>['standalone-case','case'].includes(c.classification)&&!c.soldOut);
 return {counts,availableCases:FINDER_CASES.filter(c=>!c.soldOut).length,unknownCaps:KEYCAPS.filter(k=>!k.covers).length,confirmedCaps:KEYCAPS.filter(k=>k.keycapFit?.status==='confirmed').length,standalone:{retained:standalone.length,confirmedPairs:standalone.filter(c=>configsFor(c,{}).length).length,provisionalModelCandidates:standalone.filter(c=>c.fitEvidence?.status==='provisional').length,unresolved:standalone.filter(c=>!configsFor(c,{}).length).length},purchaseReadyByBudget:Object.fromEntries(budgets.map(b=>[b,evalAns({budget:b}).list.length])),customByBudget:Object.fromEntries(budgets.map(b=>[b,evalAns({budget:b}).list.filter(r=>!BYID[r.b.case].assembled&&!BYID[r.b.case].soldOut).length])),examples,purchaseExamples,matrix,crossMatrix};})()`);
 if(report.crossMatrix.some(r=>r.unresolved||!r.agreement))throw Error('Coverage audit found an incomplete result or counter/generator disagreement');
 return JSON.parse(JSON.stringify(report));
}
if(process.argv[1]?.endsWith('audit-builds.mjs')){const report=await audit();const dest=process.argv[2];if(dest)await writeFile(dest,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({counts:report.counts,customByBudget:report.customByBudget,purchaseReadyByBudget:report.purchaseReadyByBudget,confirmedCaps:report.confirmedCaps,standalone:report.standalone,crossMatrixCells:report.crossMatrix.length,unresolved:report.crossMatrix.reduce((s,r)=>s+r.unresolved,0)}));}

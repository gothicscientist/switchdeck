import test from 'node:test';
import assert from 'node:assert/strict';
import '../assets/build-engine.js';
import {loadEngine} from '../scripts/audit-builds.mjs';

test('counter equals independently enumerable purchases with tools, separate parts and pack rounding',()=>{
 const offer=(id,price)=>({id,name:id,brand:id,price,availability:'in-stock',pricing:{status:'complete'},retailers:[{url:'https://example.com/products/'+id+'?variant=1',available:true}]});
 const fit='model-v2',proof={status:'confirmed'};
 const c={...offer('case',31),cat:'case',layout:'65',keys:68,switchSystem:'mx-mechanical',conn:'Wired',fit,fitEvidence:proof,includes:{case:true,stabs:true},requiredTools:['tool'],kit:null};
 const pcb={...offer('pcb',17),cat:'pcb',fit,fitEvidence:proof,layout:'65',hotswap:true,pins:5,conn:'Wired'};
 const plate={...offer('plate',9),cat:'plate',fit,fitEvidence:proof,layout:'65'};
 const sws=[{...offer('s1',.2),type:'Linear',switchSystem:'mx-mechanical',packQuantity:35,packPrice:7},{...offer('s2',.5),type:'Tactile',switchSystem:'mx-mechanical',packQuantity:30,packPrice:15},{...offer('s3',.5),type:'Linear',switchSystem:'mx-mechanical',packQuantity:35,packPrice:17.5,availability:'sold-out'}];
 const kcs=[{...offer('k1',19),covers:['65'],keycapFit:{status:'confirmed',stem:'mx-cross',sizes:[]}},{...offer('k2',29),covers:['65'],keycapFit:{status:'confirmed',stem:'mx-cross',sizes:[]}},{...offer('k3',1),covers:null,keycapFit:{status:'unknown'}}];
 const engine=SwitchdeckBuild.create({cases:[c],pcbs:[pcb],plates:[plate],switches:sws,keycaps:kcs,extras:[{...offer('tool',4),cat:'extras'}]});
 for(const budget of [74,94,94.99,95,105,135,150]){
  let expected=0;for(const s of sws.slice(0,2))for(const k of kcs.slice(0,2))if(31+17+9+4+Math.ceil(68/s.packQuantity)*s.packPrice+k.price<=budget)expected++;
  assert.equal(engine.count({budget}),expected,'two-pointer count at '+budget);
  const built=[...engine.enumerate({budget})];assert.equal(built.length,expected,'generator at '+budget);assert.ok(built.every(r=>engine.evaluate(r.b,{budget}).ready));
 }
});
test('real counter and recommendations agree on existence; every build is complete and within budget',async()=>{
 const {run}=await loadEngine();
 const r=run(`(()=>{const out=[];for(const budget of [100,150,200,300,500])for(const extra of [{},{layout:'60'},{layout:'full'},{feel:'Silent'},{must:'rapid'},{must:'lowprofile'}]){const a={budget,...extra},list=evalAns(a).list,n=comboCount(a);out.push({a,n,size:list.length,ready:list.every(r=>PURCHASE.evaluate(r.b,a).ready&&Math.abs(total(r.b)-r.t)<.001&&r.t<=budget)});}return out})()`);
 for(const x of r){assert.equal(x.n>0,x.size>0,JSON.stringify(x.a));assert.ok(x.ready,JSON.stringify(x.a));}
});

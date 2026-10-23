import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const layout=html.slice(html.indexOf('function layoutField(){'),html.indexOf('let introOn=false'));

test('featured keyboards remain visible and separated above the card across viewport sizes',()=>{
  for(const [W,H,cardHeight] of [[1280,631,197],[1280,631,230],[1366,650,225],[1440,900,259],[1920,1080,259],[1024,600,240],[768,600,245],[760,800,400],[390,844,478],[390,667,360]]){
    const mobile=W<=760, topBar=mobile?60:72, cardTop=H-cardHeight-(mobile?0:22), placed=[];
    const rect={width:W,height:H,top:0};
    const card={getBoundingClientRect:()=>({top:cardTop,left:20,right:W-20})};
    const boards={a:{layout:'65',photo:{ar:2.8}},b:{layout:'75',photo:{ar:3}},c:{layout:'tkl',photo:{ar:2.6}}};
    const ctx={view:'finder',initField(){},introDone:true,shownCombos:null,fieldReady:()=>true,fieldRes:()=>({list:[],byCase:new Map()}),quizAns:{},
      document:{getElementById:id=>id==='qwrap'?card:{getBoundingClientRect:()=>rect,classList:{add(){},remove(){}},offsetWidth:W},querySelector:s=>s==='.top .bar'?{getBoundingClientRect:()=>({bottom:topBar})}:null},
      FEAT_SCALE:1,MFEAT_SCALE:2.2,LW:{'65':.72,'75':.78,tkl:.9},BYID:boards,FEAT_BOOST:{},FEATURED_IDS:['a','b','c'],
      cutoutIds:()=>new Set(['a','b','c']),MAX_BG:12,MAX_BG_MOBILE:6,MSLOTS:[],FIELD_SLOTS:[],bgSeed:0,fieldEls:{},lastBg:'',featHold:null,performance,
      place:(id,p)=>placed.push({id,...p})};
    vm.createContext(ctx);vm.runInContext(layout+';layoutField()',ctx);
    assert.equal(placed.length,3);
    const boxes=placed.map(p=>{const w=Math.min(p.w*ctx.LW[boards[p.id].layout],p.max),h=w*1.1/(boards[p.id].photo.ar+.1)+36;return {l:p.x-w/2,r:p.x+w/2,t:p.y-h/2,b:p.y+h/2,w}});
    for(const b of boxes){assert.ok(b.w>70,`${W}x${H}: visible board width ${b.w}`);assert.ok(b.t>=topBar-1,`${W}x${H}: clear header`);assert.ok(b.b<=cardTop-8,`${W}x${H}: clear card`);assert.ok(b.l>=0&&b.r<=W,`${W}x${H}: inside viewport`)}
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(a.r<=b.l||b.r<=a.l||a.b<=b.t||b.b<=a.t,`${W}x${H}: no overlap`)}
  }
});
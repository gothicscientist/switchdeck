/* Shared purchase eligibility, compatibility and complete parts-subtotal model. No DOM dependencies. */
(function(g){
 const EPS=1e-7, layouts={'60':61,'65':68,'75':84,tkl:87,full:104};
 const money=n=>Math.round((n+Number.EPSILON)*100)/100;
 const identity=p=>p.productKey||((p.brand||'')+' '+(p.model||p.name||'')).toLowerCase().replace(/\b(switches?|keycaps?|keyboard|barebones?|kit|set)\b|[^a-z0-9]/g,'')+(p.cat==='case'?':'+p.layout:'');
 const system=p=>p?.switchSystem||p?.system|| (p?.switchInterface==='mx-mechanical'?'mx-mechanical':null);
 const feel=(s,f)=>!f||f==='any'||(f==='Silent'?/^Silent/i.test(s||''):String(s).replace(/^Silent\s+/i,'').toLowerCase()===f.toLowerCase());
 const live=(p,a={})=>!!p&&!p.soldOut&&(p.availability==='in-stock'||a.includePreorder&&['preorder','made-to-order'].includes(p.availability))&&p.pricing?.status==='complete'&&Number.isFinite(p.price)&&p.price>0&&p.retailers?.some(r=>r.available&&/[?&]variant=\d+/.test(r.url));
 const switchPack=(s,q)=>{const packs=(s.purchasePacks?.length?s.purchasePacks:[{variantId:s.variantId,quantity:s.packQuantity,price:s.packPrice,url:s.retailers?.[0]?.url,available:!s.soldOut}]).filter(p=>p.available&&p.quantity>0&&p.price>0);return packs.sort((x,y)=>Math.ceil(q/x.quantity)*x.price-Math.ceil(q/y.quantity)*y.price||Math.ceil(q/x.quantity)*x.quantity-Math.ceil(q/y.quantity)*y.quantity)[0]||null};
 const swCost=(s,q)=>{const p=switchPack(s,q);return p?money(Math.ceil(q/p.quantity)*p.price):Infinity};
 const capCost=(k,c)=>{const a=k.addon?.[c.layout];return money(k.price+(k.covers?.includes(c.layout)?0:typeof a==='number'?a:a?.price||0))};
 const extension=(k,c)=>!k.covers?.includes(c.layout)?k.addon?.[c.layout]:null;
 function switchFits(c,s){
  const sys=system(c),ss=system(s);if(!sys||sys!==ss)return false;
  if(sys!=='mx-mechanical')return !!c.switchInterface&&!!s.switchInterface&&c.switchInterface===s.switchInterface;
  return !(c.kit?.pcb?.pins===3&&s.pins===5);
 }
 function capsFit(c,k){
  if(k.keycapFit?.status!=='confirmed'||k.keycapFit.addon)return false;
  if(c.layoutVariant==='compact-full'&&!k.keycapFit.compactFull)return false;
  if(!k.covers?.includes(c.layout)&&!k.addon?.[c.layout]?.verified)return false;
  const stem=c.keycapStem||((system(c)==='mx-mechanical')?'mx-cross':null);
  if(!stem||k.keycapFit.stem!==stem)return false;
  return !c.requiredKeySizes?.some(s=>!k.keycapFit.sizes.includes(s));
 }
 function exactFit(c,p,pl){if(!c||!p||!pl||[c,p,pl].some(x=>['ISO','JIS'].includes(x.layoutStandard)))return false;
  if(p.layout&&p.layout!==c.layout||pl.layout&&pl.layout!==c.layout)return false;
  if(c.confirmedFits?.some(x=>x.pcb===p.id&&x.plate===pl.id&&x.url))return true;
  return !!c.fit&&c.fit===p.fit&&c.fit===pl.fit&&[c,p,pl].every(x=>x.fitEvidence?.status==='confirmed');}
 function create({cases=[],switches=[],keycaps=[],pcbs=[],plates=[],stabs=[],extras=[]}){
  const all=[...cases,...switches,...keycaps,...pcbs,...plates,...stabs,...extras],byId=Object.fromEntries(all.map(p=>[p.id,p]));
  const dedup=(a,cost=p=>p.price)=>{const out=new Map();for(const p of a){const k=identity(p);const prev=out.get(k);if(!prev||cost(p)<cost(prev))out.set(k,p)}return [...out.values()]};
  function configurations(c,a={}){
   if(c.assembled)return [{pcb:null,plate:null}];
   if(c.includes?.pcb&&c.includes?.plate&&c.kit)return [{pcb:null,plate:null}];
   const out=[];
   for(const p of pcbs)if(live(p,a)&&(p.fit===c.fit||c.confirmedFits?.some(x=>x.pcb===p.id))&&(!['hotswap'].includes(a.solder)&&a.must!=='hotswap'||p.hotswap===true))for(const pl of plates)if(live(pl,a)&&exactFit(c,p,pl))out.push({pcb:p.id,plate:pl.id});
   return out;
  }
  function boardOK(c,a={}){
   if(!live(c,a)||!layouts[c.layout]||a.layout&&a.layout!=='any'&&a.layout!==c.layout)return false;
   if(c.unsupportedPhysicalLayout||['ISO','JIS'].includes(c.layoutStandard)||a.system&&system(c)!==a.system)return false;
   if(c.classification==='deposit'||c.classification==='plate'||c.classification==='pcb')return false;
   if(!c.assembled&&(!c.includes||!system(c)))return false;
   if(c.assembled&&(!c.includes?.switches||!c.includes?.keycaps||!feel(c.includedFeel,a.feel)))return false;
   if(a.must==='knob'&&c.knob!==true)return false;
   if(a.must==='rapid'&&(system(c)!=='hall-effect'||c.rapidTrigger!==true))return false;
   if(a.must==='lowprofile'&&system(c)!=='low-profile')return false;
   if((a.solder==='hotswap'||a.must==='hotswap')&&c.kit&&c.kit.pcb.hotswap!==true)return false;
   return true;
  }
  function connectionOK(c,cf,a){
   const conn=cf.pcb?byId[cf.pcb]?.conn:c.conn;
   const wl=/tri|blue|2\.4|wireless/i.test(conn||'');const wired=/wired|usb|tri|blue|2\.4/i.test(conn||'');
   if(a.wireless==='yes'&&!wl)return false;
   if(a.wireless==='wired'&&(!wired||wl))return false;
   return true;
  }
  function baseBuild(c,cf,a={}){
   const b={case:c.id,color:0,pcb:cf.pcb,plate:cf.plate,switches:null,keycaps:null,stabs:null,extras:[]};
   if(c.assembled)return b;
   const pcb=cf.pcb?byId[cf.pcb]:c.kit?.pcb;
   if(!pcb||pcb.hotswap!==true)return null; // Solder tools/supplies are not yet evidenced; manual builds remain inspectable.
   if(!c.includes?.stabs){
    const supported=pcb.stabs||[];
    const cost=s=>c.layout==='full'?(s.fullPrice||s.price):s.price;
    const fits=stabs.filter(s=>live(s,a)&&supported.includes(s.mount)&&s.stabCoverage?.includes(c.layout)).sort((x,y)=>cost(x)-cost(y));
    if(!fits.length)return null;b.stabs=fits[0].id;
   }
   for(const id of c.requiredTools||[]){if(!live(byId[id],a))return null;b.extras.push(id)}
   return b;
  }
  function items(b){
   const c=byId[b.case];if(!c)return [];
   const out=[{slot:'case',part:c,price:c.price}];
   for(const slot of ['pcb','plate','stabs','keycaps','switches']){
    const p=byId[b[slot]];if(!p)continue;
    if(c.includes?.[slot]&&(!c.assembled||slot==='stabs'))continue;
    const q=c.keys||layouts[c.layout];
    const ext=slot==='keycaps'?extension(p,c):null,pack=slot==='switches'?switchPack(p,q):null;
    const shown=pack?{...p,variantId:pack.variantId,packPrice:pack.price,packQuantity:pack.quantity,price:pack.price/pack.quantity,retailers:[{name:p.retailers?.[0]?.name,url:pack.url,available:pack.available}]}:p;
    out.push({slot,part:shown,price:slot==='switches'?swCost(p,q):slot==='keycaps'&&typeof ext==='number'?p.price+ext:slot==='stabs'&&c.layout==='full'?(p.fullPrice||p.price):p.price,...(slot==='switches'?{qty:pack?Math.ceil(q/pack.quantity)*pack.quantity:0}:{}),...(slot==='keycaps'?{addon:capCost(p,c)-p.price}:{})});
    if(ext&&typeof ext==='object')out.push({slot:'keycaps',part:ext,price:ext.price,extension:true});
   }
   for(const id of b.extras||[]){const p=byId[id];if(p)out.push({slot:'extras',part:p,price:p.price})}
   return out;
  }
  function evaluate(b,a={}){
   const issues=[],c=byId[b.case],add=(slot,msg,level='info')=>issues.push({level,slot,msg});
   if(!c)return {ready:false,subtotal:0,issues:[{level:'info',slot:'build',msg:'Choose a board'}]};
   if(!live(c,a))add('case',c.pricing?.reason||'Price or in-stock purchase status is unverified');
   if(['ISO','JIS'].includes(c.layoutStandard))add('case','This layout is available for inspection; the current renderer and automatic keycap matching support ANSI','info');
   if(!c.assembled){
    for(const slot of ['pcb','plate','stabs','switches','keycaps'])if(!c.includes?.[slot]&&!byId[b[slot]])add(slot,'Required '+slot+' missing');
    if(!c.kit&&!exactFit(c,byId[b.pcb],byId[b.plate]))add('pcb','Case, PCB and plate fit is unverified or incompatible');
    if(b.stabs&&!c.includes?.stabs){const p=b.pcb?byId[b.pcb]:c.kit?.pcb,s=byId[b.stabs];if(!s?.stabCoverage?.includes(c.layout)||!p?.stabs?.includes(s.mount))add('stabs','Stabilizer mount or set coverage is unverified');}
   }
   if(byId[b.switches]&&!switchFits(c,byId[b.switches]))add('switches','Exact switch system compatibility is unverified or incompatible',system(c)&&system(byId[b.switches])&&system(c)!==system(byId[b.switches])?'fail':'info');
   if(byId[b.keycaps]&&!capsFit(c,byId[b.keycaps]))add('keycaps','Keycap layout, stem or key-size coverage is unverified or incompatible');
   if(c.assembled&&!boardOK(c,a))add('case','Included switch feel or required hardware is unverified');
   for(const id of c.requiredTools||[])if(!(b.extras||[]).includes(id))add('extras','Required tool missing');
   for(const i of items(b))if(!live(i.part,a))add(i.slot,'Selected variant is unavailable, deferred, or incompletely priced');
   const subtotal=money(items(b).reduce((s,i)=>s+i.price,0));
   if(Number.isFinite(a.budget)&&subtotal>a.budget+EPS)add('build','Parts subtotal exceeds budget','fail');
   return {ready:!issues.length,subtotal,issues,label:'Parts subtotal',shippingTax:'Shipping and tax excluded'};
  }
  function pools(c,cf,a={}){
   if(!boardOK(c,a)||!connectionOK(c,cf,a))return null;
   const b=baseBuild(c,cf,a);if(!b)return null;
   const base=money(items(b).reduce((s,i)=>s+i.price,0));
   if(c.assembled)return (!Number.isFinite(a.budget)||base<=a.budget+EPS)?{b,base,switches:[],keycaps:[]}:null;
   const quantity=c.keys||layouts[c.layout];
   let sw=dedup(switches.filter(s=>live(s,a)&&(!a.feel||a.feel==='any'||s.typeStatus!=='unverified')&&feel(s.type,a.feel)&&switchFits(c,s)&&swCost(s,quantity)<Infinity),s=>swCost(s,quantity));
   let kc=dedup(keycaps.filter(k=>live(k,a)&&capsFit(c,k)&&(!extension(k,c)||live(extension(k,c),a))&&(!a.look||['any','surprise'].includes(a.look)||(k.mood||[]).includes(a.look))),k=>capCost(k,c));
   if(!sw.length||!kc.length)return null;
   if(Number.isFinite(a.budget)){
    const minK=Math.min(...kc.map(k=>capCost(k,c)));sw=sw.filter(s=>base+minK+swCost(s,quantity)<=a.budget+EPS);if(!sw.length)return null;
    const minS=Math.min(...sw.map(s=>swCost(s,quantity)));kc=kc.filter(k=>base+minS+capCost(k,c)<=a.budget+EPS);
   }
   return kc.length?{b,base,quantity,switches:sw,keycaps:kc}:null;
  }
  function domains(a={}){
   // Cosmetic/retailer duplicates choose the cheapest eligible offer, after configuration and price checks.
   const groups=new Map();
   for(const c of cases){if(!boardOK(c,a))continue;const ds=configurations(c,a).map(cf=>pools(c,cf,a)).filter(Boolean);if(!ds.length)continue;
    const id=identity(c),best=Math.min(...ds.map(d=>d.base));const old=groups.get(id);if(!old||best<old.best)groups.set(id,{c,ds,best});}
   return [...groups.values()];
  }
  function count(a={}){
   let n=0;
   for(const {c,ds} of domains(a))for(const d of ds){if(c.assembled){n++;continue;}
    const kp=d.keycaps.map(k=>capCost(k,c)).sort((x,y)=>x-y),sp=d.switches.map(s=>swCost(s,d.quantity)).sort((x,y)=>x-y);let j=kp.length;
    for(const s of sp){while(j&&Number.isFinite(a.budget)&&d.base+s+kp[j-1]>a.budget+EPS)j--;n+=j;}
   }return n;
  }
  function* enumerate(a={}){for(const {c,ds} of domains(a))for(const d of ds){if(c.assembled){yield {b:d.b,t:d.base};continue;}for(const s of d.switches)for(const k of d.keycaps){const t=money(d.base+swCost(s,d.quantity)+capCost(k,c));if(!Number.isFinite(a.budget)||t<=a.budget+EPS)yield {b:{...d.b,switches:s.id,keycaps:k.id},t};}}}
  return {byId,configurations,boardOK,baseBuild,pools,domains,items,evaluate,count,enumerate};
 }
 g.SwitchdeckBuild={create,identity,live,switchFits,capsFit,exactFit,swCost,switchPack,capCost,system};
})(globalThis);

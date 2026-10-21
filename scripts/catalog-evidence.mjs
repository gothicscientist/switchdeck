// Evidence is carried through normalization so later syncs cannot revert to title-only guesses.
import {readFile} from 'node:fs/promises';
const switchTypes=JSON.parse(await readFile(new URL('./switch-type-evidence.json',import.meta.url),'utf8'));
const textOf=p=>p.sourceText||Object.entries(p.publishedSpecs||{}).map(([k,v])=>k+': '+v).join('\n');
export function selectedSwitchType(p,v){
 if(p.reviewedFacts?.type&&(!p.reviewedFacts.variantIds||p.reviewedFacts.variantIds.includes(v.id)))return /\bSilent\b/i.test(v.name)?'Silent '+p.reviewedFacts.type.toLowerCase():p.reviewedFacts.type;
 const explicit=v.name.match(/silent[ -]?(?:linear|tactile)|\b(?:linear|tactile|clicky)\b/i)?.[0];if(explicit)return explicit.replace(/\b\w/g,c=>c.toUpperCase());
 const text=textOf(p),tail=v.name.split('/').at(-1).trim();
 const color=tail.match(/\b(Red|Brown|Banana|Blue)\b/i)?.[1];
 if(color){const row=text.match(new RegExp('(?:^|\\n)'+color+':\\s*(Linear|Tactile|Clicky)','i'));if(row)return row[1];}
 for(const e of switchTypes){const family=e.family.toLowerCase();if((p.name+' '+v.name+' '+text).toLowerCase().includes(family)){
  for(const [name,type] of Object.entries(e.types))if(new RegExp('\\b'+name+'\\b','i').test(tail))return type;
 }}return null;
}
export function variantKind(name){
 const n=String(name);
 if(/deposit|balance payment|reservation|down payment/i.test(n))return 'deposit';
 if(/\bpcb\s*only|\bonly\s*pcb|^PCB\s*[-:]/i.test(n))return 'pcb';
 if(/\bplate\s*only|\bonly\s*plate|^Plate\s*[-:]/i.test(n))return 'plate';
 if(/\bcase\s*only|\bonly\s*case/i.test(n))return 'case';
 if(/^(?:extra |accessory |foam |badge |weight |gasket )/i.test(n))return 'accessory';
 return null;
}
const linesFor=(text,re)=>text.split('\n').filter(l=>re.test(l)&&!/(?:not|no|without|exclud|separately|optional|required|select|choose)\b/i.test(l));
export function boardEvidence(p,v){
 const text=textOf(p),n=p.name+' '+v.name, opts=(p.options||[]).map(o=>o.name).join(' ');
 const explicitAssembled=/fully assembled|pre-?built|\bassembled\b/i.test(v.name);
 const bare=!explicitAssembled&&(/bare\s?bones?|no switches|without switches|\bdiy\b/i.test(v.name)||/bare\s?bones?|\bkit\b|\bdiy\b/i.test(p.name));
 let assembled=!bare&&(/fully assembled|pre-?built|fully built/i.test(v.name+' '+p.name+' '+text.slice(0,600))||/\bSwitches\s*:\s*[^\n]+/i.test(text)&&/\bKeycaps\s*:\s*[^\n]+/i.test(text));
 let section=text.match(/(?:what.s in the box|package contents|kit contents|includes?)\s*:?\s*\n([\s\S]*)/i)?.[1]||'';
 // Descriptions of the assembled version do not prove inclusion in the selected barebone.
 if(bare&&/fully assembled version/i.test(section)){
  // "Barebone does not include keycaps and switches" explicitly retains the same housing/PCB/plate.
  if(/barebones? version does not include (?:the )?keycaps and switches/i.test(section))section=section.replace(/.*(?:keycaps|switches).*\n?/gi,'');
  else section=section.split(/barebones?\s*(?:version)?\s*(?:includes)?\s*:?/i)[1]||'';
 }
 section=section.split(/\n(?:Product details|Disclaimer|Specifications|Notes)\b/i)[0];
 const configurable=/configurator/i.test(p.url)||/optional switches|if you don.t buy switches|configurator will[^\n]*price|select the exact same options/i.test(text)||/must (?:include|select|choose)|required (?:selection|configuration)|only be purchased as a full kit|select (?:a |your )?(?:pcb|plate)|PCB and plate (?:are )?(?:sold|purchased) separately/i.test(text)||
   (/^(?:qwertykeys|mode)$/.test(p.sourceId)||p.sourceId==='divinikey'&&/qwertykeys|\bneo\d+|\bqk\d+/i.test(p.name))&&!/pre-?built|fully assembled|fully built/i.test(n+' '+text.slice(0,700))&&!/(?:pcb|plate)/i.test(opts);
 const has=(re)=>linesFor(section,re).length>0;
 if(!/bare\s?bones?|no switches|without switches/i.test(v.name)&&has(/\b(?:keycap set|set (?:of )?keycaps)\b/i)&&has(/\bset (?:of )?switches\b/i))assembled=true;
 if(configurable)assembled=false;
 const includes={case:true,pcb:assembled||has(/\bPCB\b(?!\s*foam)/i),plate:assembled||has(/\bplate\b(?!\s*(?:foam|fork))/i),stabs:assembled||has(/stabiliz|stabilis|stabliz|NeoStab|\bstabs\b/i),switches:assembled,keycaps:assembled};
 if(configurable){includes.pcb=false;includes.plate=false;}
 const partial=variantKind(v.name);
 if(partial)for(const k of Object.keys(includes))includes[k]=k===partial;
 const required=['pcb','plate','stabs','switches','keycaps'].filter(k=>!includes[k]);
 let reason=null;
 if(partial&&partial!=='case')reason='Selected variant is '+partial+' only';
 if(!assembled&&!bare&&!section&&!configurable)reason='Included components are not established for this variant';
 if(!assembled&&!configurable&&(!includes.pcb||!includes.plate)&&partial!=='case')reason='PCB/plate inclusion or mandatory selection price is unresolved';
 if(configurable)reason='Mandatory configurator selections must be priced separately';
 if(/deposit|balance payment|reservation|down payment/i.test(n))reason='Deposit or partial payment';
 const selectedType=(v.name.match(/silent[ -]?(?:linear|tactile)|\b(?:linear|tactile|clicky)\b/i)||[])[0];
 const selectedColor=v.name.match(/\b(Red|Brown|Banana|Blue)\b(?!.*\/)/i)?.[1];
 const tableFeel=selectedColor?text.match(new RegExp('(?:^|\\n)'+selectedColor+':\\s*(Linear|Tactile|Clicky)','i'))?.[1]:null;
 const includedFeel=assembled?(selectedSwitchType(p,v)||selectedType||tableFeel||text.match(/Switch (?:type|feel)\s*:\s*(silent[ -]?(?:linear|tactile)|linear|tactile|clicky)/i)?.[1]||null):null;
 return {assembled,classification:partial|| (assembled?'assembled':configurable?'configurable-kit':bare?'barebones-kit':'unverified-kit'),includes,required,
   pricing:{status:reason?'incomplete':'complete',reason,variantId:v.id,url:v.url},includedFeel:includedFeel?.replace(/\b\w/g,c=>c.toUpperCase())||null,configurable,
   mandatorySelections:configurable&&/must include a PCB and (?:a )?Plate/i.test(text)?['pcb','plate']:null,
   evidence:{url:v.url,checkedAt:p.checkedAt,method:'selected variant and included-component text',includes:section.slice(0,3000)}};
}
export function keycapEvidence(p,v){
 const text=textOf(p), selected=v.name, all=p.name+'\n'+text;
 const addon=/^(?:alphas?|numpad|modifiers?|spacebars?|novelties|extension|accent|international)(?:\b|\s*\/)/i.test(selected);
 const sizes=[...all.matchAll(/\b(\d(?:\.\d+)?)\s*[uU]\b/g)].map(m=>+m[1]);
 const covers=new Set();
 // Only affirmative compatibility statements establish layout coverage. Key count/profile/material never do.
 const evidence=text.split('\n').filter(l=>/compatib|supports?|fits?|designed for|layouts?\s*:/i.test(l)&&!/not compatible|does not support|incompatible|excludes/i.test(l));
 for(const line of evidence){
  for(const [layout,re] of [['60',/\b60\s*%/],['65',/\b65\s*%/],['75',/\b75\s*%/],['tkl',/\btkl\b|\b80\s*%|\b87[- ]key/i],['full',/full[- ]size|\b100\s*%|\b(?:104|108)[- ]key/i]])if(re.test(line))covers.add(layout);
 }
 const stem=/cherry\s*mx|\bmx[- ](?:style|stem|compatible)|\bcross[- ](?:stem|shaped)/i.test(all)?'mx-cross':/choc\s*v?1|kailh choc(?! v?2)/i.test(all)?'choc-v1':null;
 const requiredNumpad=/base[^\n]*(?:excludes?|without|no)[^\n]*numpad|full[- ]size[^\n]*requires?[^\n]*numpad|numpad (?:kit )?(?:is )?(?:required|sold separately)/i.test(text);
 const extensions={};
 if(requiredNumpad&&covers.has('full')){
  covers.delete('full');const choices=(p.variants||[]).filter(x=>/\bnumpad\b/i.test(x.name)&&x.price>0).sort((x,y)=>Number(y.available)-Number(x.available)||x.price-y.price);const x=choices[0];
  if(x)extensions.full={id:p.id+'~extension-'+x.id,cat:'keycaps',brand:p.brand,name:x.name,variantId:x.id,price:x.price,verified:true,availability:availability(p,x),pricing:{status:'complete'},retailers:[{name:p.retailer,url:x.url,available:x.available}],evidence:{url:x.url,reason:'Retailer states full-size requires separate numpad kit'}};
 }
 return {covers:!addon&&covers.size?[...covers]:null,...(Object.keys(extensions).length?{addon:extensions}:{}),keyCount:Number(v.name.match(/(\d{2,3})\s*(?:keys|keycaps)/i)?.[1])||p.specs.keyCount||null,keycapFit:{status:!addon&&(covers.size||Object.keys(extensions).length)&&stem?'confirmed':'unknown',stem,sizes:[...new Set(sizes)],compactFull:evidence.some(l=>/\b(?:96|98)\s*%|1800/.test(l)),addon,variantId:v.id,evidence:evidence.slice(0,16),url:v.url},classification:addon?'keycap-addon':'keycap-set'};
}
export function availability(p,v){
 const text=textOf(p),n=p.name+' '+v.name;
 if(!v.available)return 'sold-out';
 if(/made[- ]to[- ]order|kitted to order|\d+ weeks after ordering/i.test(n+'\n'+text))return 'made-to-order';
 if(/pre[- ]?order|group buy|\[GB\]/i.test(n)||/estimated ship (?:date|time)|pre[- ]?order (?:items? )?will ship|this (?:is a |item is (?:a )?)pre[- ]?order/i.test(text))return 'preorder';
 return 'in-stock';
}
export function enrichPart(part,p,v){
 const text=textOf(p);part.variantId=v.id;part.availability=availability(p,v);
 part.layoutStandard=/\bJIS\b/i.test(v.name)?'JIS':/\bISO\b/i.test(v.name)&&!/\bANSI\b/i.test(v.name)?'ISO':/\bANSI\b/i.test(v.name)?'ANSI':null;
 part.pricing={status:'complete',variantId:v.id,url:v.url};
 if(part.cat==='case'){
  part.rapidTrigger=text.split('\n').some(l=>/rapid trigger/i.test(l)&&!/not support|no rapid trigger|without rapid trigger/i.test(l));
  part.knob=/\bknob\b/i.test(v.name)||/with (?:a )?knob|rotary encoder/i.test(text)&&!/(?:no|without) knob/i.test(v.name);
  const e=boardEvidence(p,v);Object.assign(part,e);
  if(/^Stabs\s*:\s*(?:Screw-in|Clip-in|Plate-mount)/im.test(text))part.includes.stabs=true;
  if(part.kit&&!e.assembled&&(!e.includes.pcb||!e.includes.plate))part.kit=null;
  if(part.kit){part.kit.stabs=e.includes.stabs?'Included':null;part.kit.pcb.hotswap=/solder/i.test(v.name)?false:/hot[- ]?swap/i.test(v.name)?true:part.kit.pcb.hotswap;}
  if(e.classification==='case'){part.kit=null;part.assembled=false;part.pricing={status:'complete',variantId:v.id,url:v.url};}
  if((p.category==='cases'||/\bkeyboard case\b|\bcase only\b/i.test(p.name))&&!e.assembled&&!e.configurable&&!e.includes.pcb){part.classification='standalone-case';part.pricing={status:'complete',variantId:v.id,url:v.url};part.kit=null;}
 }
 if(part.cat==='keycaps')Object.assign(part,keycapEvidence(p,v));
 if(part.cat==='keycaps'&&p.sourceId==='keychron'&&/^Cherry Profile Double-Shot PBT Full Set Keycaps/i.test(p.name))part.productKey='keychron:cherry-doubleshot-full-set:'+part.keyCount;
 if(part.cat==='stabs'){
  const n=p.name+' '+v.name+'\n'+text;
  const sizes=[...n.matchAll(/(\d+)\s*(?:x|\*)\s*2\s*u|2\s*u\s*(?:x|\*)\s*(\d+)/gi)].map(m=>+(m[1]||m[2]));
  const count=Math.max(0,...sizes),bar=/6\.25\s*u|7\s*u/i.test(n);
  part.stabCoverage=bar&&count>=4?['60','65','75','tkl',...(count>=7?['full']:[])]:null;
 }
 const sys=part.switchSystem||p.specs.system;
 if(sys==='hall-effect'||sys==='low-profile'||sys==='optical'){
  const s=p.name+' '+v.name;
  part.switchInterface=/double[- ]rail/i.test(s)?'gateron-double-rail':/KS[- ]?33/i.test(s)?'gateron-ks33':/KS[- ]?27/i.test(s)?'gateron-ks27':/choc\s*(?:v(?:ersion)?\s*)?2/i.test(s)?'choc-v2':/choc/i.test(s)?'choc-v1':null;
 }else if(part.cat==='switches'&&(p.specs.pins===3||p.specs.pins===5||/\bmx\b|[35][- ]?pin/i.test(p.name+' '+text)))part.switchInterface='mx-mechanical';
 if(part.cat==='case'&&!part.switchSystem&&/\bmx\b|[35][- ]?pin|mechanical switches/i.test(text)){part.switchInterface='mx-mechanical';part.switchSystem='mx-mechanical';}
 if(part.cat==='case'){
  if(/\b70\s*%|\b(?:Q7|K14 Pro)\b/i.test(p.name))part.unsupportedPhysicalLayout=true;
  part.layoutVariant=/\b1800\b|\b(?:96|98)\s*%/i.test(p.name+' '+text.split('\n').find(l=>/^layout:/i.test(l)))?'compact-full':null;
  const count=text.match(/(?:number of keys|key count|total keys)\s*:\s*(\d{2,3})/i)?.[1];if(count)part.keys=+count;
  if(part.kit){const sm=text.match(/(screw[- ]?in|clip[- ]?in|plate[- ]?mount)\s+(?:PCB\s+)?stab/i)?.[1];if(sm)part.kit.pcb.stabs=[/screw/i.test(sm)?'screw':/clip/i.test(sm)?'clip':'plate'];}
 }
 if(part.cat==='switches')part.stem=/choc/i.test(p.name)&&!/v2/i.test(p.name)?'choc-v1':/\bmx\b|cross[- ]stem|[35][- ]?pin/i.test(p.name+' '+text)?'mx-cross':null;
 part.fitEvidence=null;
 // Reviewed manufacturer facts supplement sparse feeds; prices and availability still come
 // from the selected live variant, never from a hand-entered price.
 const f=!p.reviewedVariantIds||p.reviewedVariantIds.includes(v.id)?p.reviewedFacts:null;
 if(f&&part.cat==='case'&&!part.configurable&&!variantKind(v.name)){
  Object.assign(part,f);part.required=['pcb','plate','stabs','switches','keycaps'].filter(k=>!part.includes?.[k]);
  part.pricing={status:'complete',variantId:v.id,url:v.url};
  if(part.includes?.pcb&&part.includes?.plate)part.kit={pcb:{hotswap:true,pins:5,stabs:['plate'],led:null,rgb:null},plate:'Aluminum',stabs:part.includes.stabs?'Included':null};
 }
 if(f&&part.cat==='switches'){Object.assign(part,{switchSystem:f.switchSystem,switchInterface:f.switchInterface,stem:f.stem});}
 if(part.packPricingReason)part.pricing={...part.pricing,status:'incomplete',reason:part.packPricingReason};
 if(part.typeStatus==='unverified')part.type='Unknown';
 return part;
}

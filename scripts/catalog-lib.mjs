import {createHash} from 'node:crypto';

export const SOURCES = [
  {id:'cannonkeys',name:'CannonKeys',url:'https://cannonkeys.com',currency:'USD'},
  {id:'divinikey',name:'Divinikey',url:'https://divinikey.com',currency:'USD'},
  {id:'novelkeys',name:'NovelKeys',url:'https://novelkeys.com',currency:'USD'},
  {id:'kbdfans',name:'KBDfans',url:'https://kbdfans.com',currency:'USD'},
  {id:'keychron',name:'Keychron',url:'https://www.keychron.com',currency:'USD'},
  {id:'keebsforall',name:'KeebsForAll',url:'https://keebsforall.com',currency:'USD'},
  {id:'mode',name:'Mode Designs',url:'https://modedesigns.com',currency:'USD'},
];
export const CATEGORIES = {keyboards:'Keyboards & kits',cases:'Cases',pcb:'PCBs',plate:'Plates',switches:'Switches',keycaps:'Keycaps',stabs:'Stabilizers',extras:'Mods, tools & cables',deskmats:'Deskmats'};
export function plain(value='') {
  return String(value).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<\/(?:td|th)>\s*<(?:td|th)[^>]*>/gi,': ').replace(/<\/(?:li|p|tr|div|h[1-6])>|<br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(+n,0x10ffff))).split('\n').map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
}
export function https(value) {try {const u=new URL(value.startsWith('//')?'https:'+value:value); return u.protocol==='https:'?u.href:null;}catch{return null}}
export function category(p) {
  const title=plain(p.title), type=p.product_type||'', tags=(p.tags||[]).join(' '), t=title.toLowerCase();
  if(/gift card|gift certificate|route protection|shipping protection|test product|fedex test|fee placeholder|balance payment|build service|\bdeposit\b|\binterest check\b|redeem your points|\bapparel\b|t-shirt|hoodie|sticker|poster|\bmouse\b|trackpad|wrist rest|carrying case|travel case|keyboard bag|keycap tray|display stand|switch tester|sample pack|sampler|switch container|keycap storage|mystery box|mystery switches|replacement keycaps/i.test(title+' '+type)) return null;
  if(/desk\s*(?:mat|pad)|mouse\s*pad/i.test(title+' '+type)) return 'deskmats';
  if(/foam|dampener|lubricant|\blube\b|krytox|tribosys|opener|puller|switch film|switch spring|switch pad|switch sticker|usb.*cable|coiled.*cable|brush|tweezer|stabilizer wire|replacement.*(?:knob|feet)|daughterboard|gasket|silicone sock|o-ring|o ring|carrying case/i.test(title)) return 'extras';
  if(/stabiliz|stabilis/i.test(title+' '+type)) return 'stabs';
  if(/\bpcb\b|printed circuit board/i.test(title+' '+type)) return 'pcb';
  if(/\bplate\b|\bplates\b/i.test(title+' '+type)&&!/keyboard|keycap/i.test(title)) return 'plate';
  if(/\bcase\b/i.test(type+' '+title)&&!/keycap|carrying|travel|storage|foam/i.test(title)) return 'cases';
  if(/\baccessories\b|\badd-ons\b|\bcomponents\b|\bweights?\b|\bknobs?\b|\bfeet\b|\bbumpons?\b|\bscrews?\b/i.test(title)) return 'extras';
  // Complete keyboards bundled with a named keycap set are still keyboards.
  if(/keyboard|diy kit/i.test(type)&&(!/keycaps?(?: set)?$/i.test(title)||/with keycaps$/i.test(title))) return 'keyboards';
  if(/keycap/i.test(type)||/keycaps?|\b(?:GMK|PBTfans|DSS|DCS|KAT|KAM|MT3|MW|DCX)\b/i.test(title)) return 'keycaps';
  if(/switch/i.test(type)&&!/keyboard|macro pad/i.test(title)) return 'switches';
  if(/switch(?:es)?\b/i.test(title)&&!/keyboard|macro pad|tester|spring|stem|housing|puller|film|opener|lube|pad|socket/i.test(title)) return 'switches';
  if(/keyboard|diy kit/i.test(type+' '+title)&&!/accessor|keycap|stand|clean|protector|cover/i.test(title)) return 'keyboards';
  if(/cable|accessor|lubricant|supplies/i.test(type)&&/keyboard|switch|stabilizer|usb|cable|keycap|solder|lube/i.test(title)) return 'extras';
  if(/(?:^|\s)(?:linear|tactile|clicky|keyswitch)(?:\s|$)/i.test(tags)&&!/keycap|keyboard/i.test(title)) return 'switches';
  return null;
}
const first=(s,r)=>s.match(r)?.[1]?.trim()||null;
const number=(s,r)=>{const v=first(s,r);return v===null?null:Number(v)};
export function extractSpecs(p,cat) {
  const title=plain(p.title), text=plain(p.body_html), tags=(p.tags||[]).join(' '), all=title+'\n'+text+'\n'+tags;
  const result={}; const set=(k,v)=>{if(v!==null&&v!==undefined&&v!=='') result[k]=v;};
  if(cat==='switches') {
    const kind=first(title+' '+tags,/\b(linear|tactile|clicky)\b/i)||first(text,/\b(linear|tactile|clicky)\b/i);
    set('type',kind?(/silent/i.test(title+' '+tags)?'Silent ':'')+kind.toLowerCase():null);
    const system=/hall.effect|magnetic|\bHE\b/i.test(title)?'hall-effect':/optical/i.test(title)?'optical':/choc\b|low.profile|KS-33|KS-27/i.test(title)?'low-profile':/MX (?:structure|style|compatible|mechanical)|MX-compatible|MX Switch|cherry.mx style/i.test(all)?'mx-mechanical':null;
    set('system',system);
    set('pins',number(all,/\b([35])\s*[- ]?pins?\b/i));
    set('actuationForceG',number(text,/(?:actuation(?: force)?|operating force|operation force)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:[±+\-]\s*\d+)?\s*g(?:f)?\b/i)??number(text,/(\d+(?:\.\d+)?)\s*(?:[±+\-]\s*\d+)?\s*g(?:f)?\s*(?:operating|actuation) force/i));
    set('bottomOutForceG',number(text,/bottom[ -]?out(?: force)?\s*:?\s*(\d+(?:\.\d+)?)\s*(?:[±+\-]\s*\d+)?\s*g(?:f)?\b/i));
    set('totalTravelMm',number(text,/(?:total travel|travel distance|total distance|distance travel)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:[±+\-]\s*[\d.]+)?\s*mm/i)??number(text,/(\d+(?:\.\d+)?)\s*(?:[±+\-]\s*[\d.]+)?\s*mm\s*(?:total travel|distance travel)/i));
    set('preTravelMm',number(text,/(?:pre[ -]?travel|actuation travel)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:[±+\-]\s*[\d.]+)?\s*mm/i));
    set('topHousing',first(text,/(?:top housing(?: material)?)\s*:\s*([^\n;]{2,55})/i));
    set('bottomHousing',first(text,/(?:bottom housing(?: material)?)\s*:\s*([^\n;]{2,55})/i));
    set('stemMaterial',first(text,/stem(?: material)?\s*:\s*([^\n;]{2,55})/i));
    if(/(?:unlubed|un-lubed|factory lube\s*:\s*no|not (?:factory )?lubed)/i.test(all)) result.factoryLubed=false;
    else if(/(?:pre-lubed|prelubed|factory.lubed|factory lube\s*:\s*yes|^lubed$)/im.test(all)) result.factoryLubed=true;
  }
  if(cat==='keycaps') {
    set('profile',first(all,/\b(Cherry|OEM|XDA|DSA|SA|MT3|KAT|KAM|DSS|DCS|DCX|ASA|OSA|MDA|MOA)\s*(?:[- ]profile|profile)/i));
    set('material',first(all,/\b(PBT|ABS|PBT\s*\+\s*ABS)\b/i));
    set('legends',/double[ -]?shot|doubleshot/i.test(all)?'Doubleshot':/dye[ -]?sub/i.test(all)?'Dye-sub':/\bblank\b/i.test(title)?'Blank':null);
    set('keyCount',number(text,/\b(\d{2,3})\s*(?:keys|keycaps)\b/i));
  }
  if(['keyboards','cases','pcb','plate'].includes(cat)) {
    set('layout',first(title+' '+text,/\b(40|60|65|70|75|80|85|90|95|96|98|100)\s*(?:%|percent)/i)||(/\bTKL\b/i.test(title)?'80':null));
    set('material',first(text,/(?:case material|plate material|material)\s*:\s*([^\n;]{2,65})/i));
    set('mount',first(text,/(?:mounting style|mounting type|mounting method|mount)\s*:\s*([^\n;]{2,65})/i));
    if(/hot[ -]?swap/i.test(all)) result.hotswap=true;
    if(/\bsolder(?:ed)? (?:pcb|version)|solder only/i.test(all)) result.hotswap=false;
    set('connection',/tri[ -]?mode/i.test(all)?'Tri-mode':/bluetooth/i.test(all)?'Bluetooth':/wired/i.test(title)?'Wired':null);
    set('switchSystem',/hall.effect|magnetic|\bHE\b/i.test(title)?'hall-effect':/low.profile/i.test(title)?'low-profile':null);
  }
  if(cat==='stabs') set('mount',/screw[ -]?in/i.test(all)?'screw':/clip[ -]?in/i.test(all)?'clip':/plate[ -]?mount/i.test(all)?'plate':null);
  if(result.totalTravelMm!==undefined&&(result.totalTravelMm<1||result.totalTravelMm>6))delete result.totalTravelMm;
  return result;
}
export function packQuantity(p,v,cat) {
  if(cat!=='switches') return null;
  const variant=plain(v.title||'');
  const vn=variant.match(/^(\d{1,3})\s*(?:set|pcs|pieces|switches|pack|count)(?:\s*\/|$)/i)||((p.options||[]).some(o=>/quantity|pack|count|switches/i.test(o.name))?variant.match(/^(\d{1,3})$/):null);
  if(vn&&+vn[1]>=1&&+vn[1]<=200) return +vn[1];
  const text=plain(p.body_html)+'\n'+(p.tags||[]).join('\n')+'\n'+plain(p.title);
  const patterns=[/(\d{1,3})\s+(?:switches?\s+per\s+(?:pack|quantity)|included in each pack|pcs? per (?:package|pack)|pieces? per (?:pack|quantity))/i,/(?:sold|selling) in (?:packs|quantities|sets) of\s*(\d{1,3})/i,/(?:each|one) (?:pack|quantity|unit) (?:contains|includes)\s*(\d{1,3})/i,/\b(\d{1,3})\s*switches?\s*\/\s*pack/i];
  for(const r of patterns){const m=text.match(r);if(m&&+m[1]>=1&&+m[1]<=200)return +m[1]}
  return null;
}
export function publishedSpecs(p) {
  const out={};
  const keys=/switch|force|travel|housing|stem|spring|lube|mount|material|profile|legend|key count|keys|layout|connection|connectivity|bluetooth|battery|polling|rgb|backlight|firmware|socket|pin|thickness|dimension|weight|compatib|pcb|plate|interface|stabiliz|stabilis|quantity|per pack|manufacturer|color/i;
  for(const line of plain(p.body_html).split('\n')) {
    const m=line.match(/^([^:]{2,45})\s*:\s*(.{1,180})$/);
    if(m&&keys.test(m[1])&&!/https?|shipping|price|sound profile/i.test(m[1]))out[m[1].trim()]=m[2].trim();
    if(Object.keys(out).length>=32)break;
  }
  return out;
}
export function normalize(p,source,checkedAt) {
  const cat=category(p); if(!cat||!p.id||!p.handle||!p.title) return null;
  // Remote mirrors are excluded, including patterns disallowed in some Shopify robots files.
  if(/-[a-f0-9]{8}-remote$/i.test(p.handle)) return null;
  const url=https(source.url+'/products/'+encodeURIComponent(p.handle));
  const variants=(p.variants||[]).filter(v=>Number.isFinite(Number(v.price))&&Number(v.price)>0).map(v=>{
    const quantity=packQuantity(p,v,cat), price=Number(v.price);
    return {id:String(v.id),name:plain(v.title),sku:v.sku||null,price,currency:source.currency,available:v.available===true,quantity,unitPrice:quantity?Math.round(price/quantity*100000)/100000:null,url:url+'?variant='+v.id,image:https(v.featured_image?.src||'')};
  });
  if(!variants.length)return null;
  const images=[...new Set((p.images||[]).map(i=>https(i.src||'')).filter(Boolean))].slice(0,8);
  if(!images.length) return null;
  const options=(p.options||[]).map(o=>({name:plain(o.name),values:(o.values||[]).map(plain)}));
  const available=variants.some(v=>v.available), active=available?variants.filter(v=>v.available):variants;
  const priceMin=Math.min(...active.map(v=>v.price)),priceMax=Math.max(...active.map(v=>v.price));
  const specs=extractSpecs(p,cat);
  // Keep retailer listings separate: identical names can denote different revisions, packs, or kits.
  const maker=first(plain(p.body_html),/^Manufacturer\s*:\s*([^\n]{2,40})/im);
  const titleBrand=first(plain(p.title),/^(Keychron|Gateron|Everfree|Cherry|Kailh|Akko|Monsgeek|KBDfans|PBTfans|GMK|HMX|Huano|Haimu|Durock|JWK|TTC|Tecsee|TX|Geon|Wuque|WS|Owlab|Glorious|SP-Star|Mode|NovelKeys|NK|CannonKeys|CannonCaps|NicePBT|EnjoyPBT|ePBT|Domikey|Gazzew|KFA|Meletrix|QwertyKeys)\b/i);
  const vendor=plain(p.vendor);
  const brand=titleBrand||maker||(!/^(?:Stocked|Group Buy|Hidden|Accessories|Keycaps|Keyboard|Switches?|Various|Invis Addon)$/i.test(vendor)&&vendor)||source.name;
  return {id:source.id+'-'+p.id,name:plain(p.title),brand,category:cat,sourceId:source.id,retailer:source.name,url,images,priceMin,priceMax,currency:source.currency,available,options,variants,specs,publishedSpecs:publishedSpecs(p),checkedAt,sourceUpdatedAt:p.updated_at||null,provenance:{url,method:'public-shopify-product-feed',specs:'retailer-published; not independently measured'},missingFields:requiredFields(cat).filter(k=>specs[k]===undefined)};
}
export function requiredFields(cat) {return {switches:['type','system','pins','actuationForceG','totalTravelMm'],keycaps:['profile','material','legends'],keyboards:['layout','material','mount','connection'],cases:['layout','material','mount'],pcb:['layout','hotswap'],plate:['layout','material'],stabs:['mount']}[cat]||[]}
export function builderPart(p) {
  const s=p.specs;
  if(p.category==='extras'&&p.available) {
    const kind=/opener|puller|brush|tweezer/i.test(p.name)?'Tool':/lubricant|\blube\b|krytox|tribosys/i.test(p.name)&&!/station|brush/i.test(p.name)?'Lube':/usb|coiled|aviator/i.test(p.name)&&/cable/i.test(p.name)?'Cable':null;
    if(!kind)return null;
    const v=p.variants.filter(v=>v.available).sort((a,b)=>a.price-b.price)[0];if(!v)return null;
    return {id:p.id,cat:'extras',brand:p.brand,name:p.name+(v.name==='Default Title'?'':' · '+v.name),kind,price:v.price,fx:{},photo:{img:v.image||p.images[0],page:v.url},retailers:[{name:p.retailer,url:v.url,available:true}],catalogId:p.id,checkedAt:p.checkedAt,blurb:'Retailer listing for the named variant. No sound effect is assumed.'};
  }
  if(p.category!=='switches'||!p.available||p.missingFields.length||s.system!=='mx-mechanical'||!s.actuationForceG||!s.totalTravelMm)return null;
  // A listing with multiple spring weights/types cannot be flattened into one builder switch.
  const variants=p.variants.filter(v=>v.available);
  if(variants.length!==1||!variants[0].quantity||!variants[0].unitPrice) return null;
  const v=variants[0];
  return {id:p.id,cat:'switches',brand:p.brand,name:p.name,type:s.type.replace(/\b\w/g,c=>c.toUpperCase()).replace('Linear','linear').replace('Tactile','tactile').replace('Clicky','clicky').replace(/^(linear|tactile|clicky)/,c=>c[0].toUpperCase()+c.slice(1)),force:s.actuationForceG,travel:s.totalTravelMm,pins:s.pins,price:v.unitPrice,packPrice:v.price,packQuantity:v.quantity,retailers:[{name:p.retailer,url:v.url,available:v.available}],photo:{img:p.images[0],page:v.url},factory:s.factoryLubed??null,sound:null,vol:50,col:{top:'#D6D3D1',bot:'#A8A29E',stem:'#78716C'},blurb:'Published retailer specs. '+v.quantity+' per pack. Sound and preview colors are illustrative.',catalogId:p.id,checkedAt:p.checkedAt};
}
export const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

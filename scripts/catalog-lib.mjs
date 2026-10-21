import '../assets/part-names.js';
import {createHash} from 'node:crypto';
import '../assets/product-links.js';

export const SOURCES = [
  {id:'cannonkeys',name:'CannonKeys',url:'https://cannonkeys.com',currency:'USD'},
  {id:'divinikey',name:'Divinikey',url:'https://divinikey.com',currency:'USD'},
  {id:'novelkeys',name:'NovelKeys',url:'https://novelkeys.com',currency:'USD'},
  {id:'kbdfans',name:'KBDfans',url:'https://kbdfans.com',currency:'USD'},
  {id:'keychron',name:'Keychron',url:'https://www.keychron.com',currency:'USD'},
  {id:'keebsforall',name:'KeebsForAll',url:'https://keebsforall.com',currency:'USD'},
  {id:'mode',name:'Mode Designs',url:'https://modedesigns.com',currency:'USD'},
  // Optional sources are skipped (not fatal) when unreachable, disallowed, or not priced in USD.
  {id:'mechanicalkeyboards',name:'MechanicalKeyboards.com',url:'https://mechanicalkeyboards.com',currency:'USD',optional:true},
  {id:'kprepublic',name:'KPrepublic',url:'https://kprepublic.com',currency:'USD',optional:true},
  {id:'meletrix',name:'Meletrix',url:'https://meletrix.com',currency:'USD',optional:true},
  {id:'qwertykeys',name:'QwertyKeys',url:'https://qwertykeys.com',currency:'USD',optional:true},
  {id:'wobkey',name:'Wobkey',url:'https://www.wobkey.com',currency:'USD',optional:true},
  {id:'epomaker',name:'Epomaker',url:'https://epomaker.com',currency:'USD',optional:true},
  {id:'kineticlabs',name:'Kinetic Labs',url:'https://kineticlabs.com',currency:'USD',optional:true},
  {id:'dangkeebs',name:'Dangkeebs',url:'https://dangkeebs.com',currency:'USD',optional:true},
  {id:'milktooth',name:'Milktooth',url:'https://milktooth.com',currency:'USD',optional:true},
];
export const CATEGORIES = {keyboards:'Keyboards & kits',cases:'Cases',pcb:'PCBs',plate:'Plates',switches:'Switches',keycaps:'Keycaps',stabs:'Stabilizers',extras:'Mods, tools & cables',deskmats:'Deskmats'};
export function plain(value='') {
  return String(value).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<\/(?:td|th)>\s*<(?:td|th)[^>]*>/gi,': ').replace(/<\/(?:li|p|tr|div|h[1-6])>|<br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(+n,0x10ffff))).split('\n').map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
}
export function https(value) {try {const u=new URL(value.startsWith('//')?'https:'+value:value); return u.protocol==='https:'?u.href:null;}catch{return null}}
const PART_FOR_A_BOARD=/\b(?:for|such as)\s+(?:custom\s+|gaming\s+)?mech\w*\s+keyboards?\b|\bbadges?\b|\bfilm\b|\bbulbs?\b|hardware pack|grip sheet|expansion kit|\bkit add[- ]?ons?\b/i;
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
  // Store titles like "Linear Switch 5pin RGB for Mechanical Keyboard" describe switches, not keyboards.
  if(/\bswitch(?:es)?\b/i.test(title)&&/(?:for|of)\s+(?:gaming\s+)?mechanical\s+keyboards?|mx[- ]?stem|\b[345]\s?-?pins?\b/i.test(title)&&!/keyboard/i.test(title.replace(/(?:for|of)\s+(?:gaming\s+)?mechanical\s+keyboards?/ig,''))&&!/keycaps?\b|tester|\bpcb\b|\bplate\b|puller|opener|\blubes?\b|film|spring kit/i.test(title)) return 'switches';
  // "LED bulbs for mechanical keyboard" or "Badge" titles are parts for a board, not a board.
  if(PART_FOR_A_BOARD.test(title)) return /\bswitch(?:es)?\b/i.test(title)?'switches':'extras';
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
  // Out-of-range forces are parsing mistakes (a pack count or a spring length), not specs.
  for(const k of ['actuationForceG','bottomOutForceG']) if(result[k]!==undefined&&(result[k]<10||result[k]>150)) delete result[k];
  return result;
}
// Pack sizes. Only a count the listing states counts: "10 Switches", "x10", "*35", "70pcs", "Pack of 35", "35 in 1", "62gx35",
// or a bare number under an option called Quantity/Qty/Amount/Size. "1 pack" or "3 packs" is a number of packs of unknown size,
// so a pack count only qualifies from 10 up ("10-pack"). A spring weight such as "45" or "45g" is never a count.
const QTY_OPTION=/qty|quantity|amount|count|pack|^size$|pieces|pcs|number of|switch(?:es)?\s*[*x×]\s*\d/i;
const COUNT_PATTERNS=[
  /(?:(?<![A-Za-z])|(?<=\b[SP])|(?<=\dg\s?))[x×*]\s?(\d{1,3})(?![\d.]|\s?(?:mm|gf?\b|pins?\b|%))(?:\s*(?:switch(?:es)?|pcs?|pieces?)\b)?(?:\s*\/?\s*pa?c(?:k)?\b)?/i,
  /(?<![\w.])(\d{1,3})\s?in\s?1\b/i,
  /pack of\s*(\d{1,3})\b/i,
  /(?<![\w.])(\d{1,3})\s*(?:pcs?|pieces?|switch(?:es)?|sets?|count|ct)\b/i,
  /(?<![\w.])(\d{2,3})\s*-?\s*(?:packs?|pk|pac)\b/i,
];
const sane=n=>n>=1&&n<=200;
export function countInSegment(seg,optName) {
  const s=String(seg).trim();
  for(const r of COUNT_PATTERNS) {const m=r.exec(s); if(m&&sane(+m[1])) return {n:+m[1],rest:(s.slice(0,m.index)+' '+s.slice(m.index+m[0].length)).replace(/\s+/g,' ').trim()}}
  if(optName&&QTY_OPTION.test(optName)) {const m=s.match(/^(\d{1,3})$/); if(m&&sane(+m[1])) return {n:+m[1],rest:''}}
  return null;
}
// Variant names are the option values joined with " / ", so a segment lines up with the option of the same position.
export function variantPack(variant,optNames=[]) {
  const segs=String(variant).split(/\s*\/\s*/), qtyNames=optNames.filter(n=>QTY_OPTION.test(n));
  const bare=segs.filter(x=>/^\d{1,3}$/.test(x.trim())).length;
  for(let i=0;i<segs.length;i++) {
    const optName=segs.length===optNames.length?optNames[i]:(qtyNames.length===1&&bare===1?qtyNames[0]:undefined);
    const r=countInSegment(segs[i],optName);
    if(r) return {n:r.n,label:[...segs.slice(0,i),r.rest,...segs.slice(i+1)].filter(Boolean).join(' / ')};
  }
  return null;
}
// A count in the listing title ("(35Pcs)", "(36 Pack)", "Switches x 70", "Pack of 100") or an option called "Switch*70".
export function listingPack(title,optNames=[]) {
  for(const n of optNames) {const m=n.match(/switch(?:es)?\s*[*x×]\s*(\d{1,3})$/i); if(m&&sane(+m[1])) return +m[1]}
  const t=String(title);
  for(const r of [...COUNT_PATTERNS,/\((\d{2,3})\)\s*$/,/[x×]\s?(\d{2,3})\s*$/]) {const m=r.exec(t); if(m&&sane(+m[1])) return +m[1]}
  return null;
}
export function packQuantity(p,v,cat) {
  if(cat!=='switches') return null;
  const optNames=(p.options||[]).map(o=>plain(o.name||'')), variant=plain(v.title||'');
  const vp=variantPack(variant,optNames); if(vp) return vp.n;
  // "3 packs" of a listing that states its pack size (35 per pack) is three times that size.
  const mult=variant.split(/\s*\/\s*/).map(x=>x.match(/^(\d)\s*-?\s*packs?$/i)).find(Boolean)?.[1]||1;
  const lp=listingPack(plain(p.title),optNames); if(lp) return lp*mult;
  const text=plain(p.body_html)+'\n'+(p.tags||[]).join('\n')+'\n'+plain(p.title);
  const patterns=[/(\d{1,3})\s+(?:switches?\s+per\s+(?:pack|quantity)|included in each pack|pcs? per (?:package|pack)|pieces? per (?:pack|quantity))/i,/(?:sold|selling) in (?:packs|quantities|sets) of\s*(\d{1,3})/i,/(?:each|one) (?:pack|quantity|unit) (?:contains|includes)\s*(\d{1,3})/i,/\b(\d{1,3})\s*switches?\s*\/\s*pack/i,
    /\b(?:quantity|qty|amount|per pack|pack size|package includes?|pack contains?)\s*:\s*(\d{1,3})\s*(?:pcs?|pieces?|switch(?:es)?)?\b/i,/\b(\d{1,3})\s*(?:pcs?|pieces?)\s*\/\s*(?:pack|set|bag|box)\b/i];
  for(const r of patterns){const m=text.match(r);if(m&&sane(+m[1]*mult))return +m[1]*mult}
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
  if(!globalThis.SwitchdeckLinks.productURL(url))return null;
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
  return {id:source.id+'-'+p.id,name:plain(p.title),displayName:SwitchdeckNames.name(plain(p.title),cat,brand),brand,category:cat,sourceId:source.id,retailer:source.name,url,images,priceMin,priceMax,currency:source.currency,available,options,variants,specs,publishedSpecs:publishedSpecs(p),checkedAt,sourceUpdatedAt:p.updated_at||null,provenance:{url,method:'public-shopify-product-feed',specs:'retailer-published; not independently measured'},missingFields:requiredFields(cat).filter(k=>specs[k]===undefined)};
}
export function requiredFields(cat) {return {switches:['type','system','pins','actuationForceG','totalTravelMm'],keycaps:['profile','material','legends'],keyboards:['layout','material','mount','connection'],cases:['layout','material','mount'],pcb:['layout','hotswap'],plate:['layout','material'],stabs:['mount']}[cat]||[]}
const titleCase=t=>t.replace(/\b\w/g,c=>c.toUpperCase());
// Sound character from the published housing and stem materials, following the usual rule of thumb: nylon, POM and
// polyethylene housings sound deeper and more muted, polycarbonate and POK brighter and clackier, and long-pole stems
// clack. The bottom housing counts most because it takes the bottom-out. Returns 'deep', 'bright', or null when the
// materials are mixed or not published.
export function soundFromMaterials(top,bottom,stem){
  const tone=m=>{const x=String(m||'').toLowerCase(); if(!x) return 0;
    if(/\bpc\b|polycarbonate|\bpok\b/.test(x)) return -1;
    if(/nylon|\bpa\s?\d*\b|pa66|pa12|\bpom\b|\bu?h?m?w?pe\b|upe|uhmwpe|\bhpe\b|milky/.test(x)) return 1;
    return 0};
  const st=String(stem||'').toLowerCase();
  const stemTone=/\bpok\b|extended|long[- ]?pole/.test(st)?-1:/upe|uhmwpe|umpe|\bhpe\b|\bpe\b/.test(st)?1:0;
  if(!top&&!bottom&&!stem) return null;
  const score=tone(top)+1.5*tone(bottom)+stemTone;
  return score>=1.5?'deep':score<=-1.5?'bright':null;
}
const switchType=t=>{const x=String(t||'').toLowerCase(); return /silent/.test(x)?(/tactile/.test(x)?'Silent tactile':'Silent linear'):/clicky/.test(x)?'Clicky':/tactile/.test(x)?'Tactile':/linear/.test(x)?'Linear':null};
const live=p=>p.variants.filter(v=>v.available);
// Keychron's low-profile and slim lines take low-profile switches; their names don't always say so.
const LOW_PROFILE_MODELS=/\bKeychron (?:K1|K3|K5|K7|K9|K11|K13|K15|K17|B\d|S1)\b/i;
const NOT_A_BOARD=/\bbadges?\b|\bfilm\b|\bbulbs?\b|hardware pack|grip sheet|expansion kit|\b(?:for|such as)\s+(?:custom\s+|gaming\s+)?mech\w*\s+keyboards?\b|\bbag\b|add[- ]?ons?\b|\bconfigurator\b|\bfeet\b|accessor|\bcover\b|sleeve|\bknob\b|weight|replacement|\bparts?\b|\bcable\b|\bfoam\b|wrist|palm|\bstand\b|dust|\bskin\b|protector|upgrade kit|\bplate\b|\bpcb\b/i;
// Variants sold alongside a board on the same listing, such as a foam kit. Option combos
// like "Black / Logo Badge / PC Plate" are the board itself.
const ADD_ON=/^[^/]*(?:\bfoam\b|\bfilm\b|\bbadges?\b|hardware pack|add-?ons?\b)[^/]*$/i;
// Components may share a product page with full kits. Slash-separated model names do not make a plate a kit.
export const boardVariant=v=>!ADD_ON.test(v.name)&&!/(?:\b(?:pcb|plate|case|weight|foam|badge|knob|cable|battery)\s+only\b|\bonly\s+(?:pcb|plate|case)\b|\b(?:replacement|spare)\b)/i.test(v.name);
const LOCALE=/\bISO\b|\bJIS\b|\bDE\b|\bFR\b|\bUK\b|nordic|spanish|german|french|japanese|korean|arabic|hebrew|russian|swiss|belgian|italian|turkish|portug/i;
const tidy=v=>v?String(v).replace(/[.;,\s]+$/,'').slice(0,40):null;
const cleanBrand=(p)=>{const b=String(p.brand).replace(/,?\s*(?:LLC|Inc\.?|Ltd\.?)$/i,'').trim(); return /^(?:Z-|third party|default|vendor)/i.test(b)?p.retailer:b};
const shortName=(name,brand)=>{const n=String(name).replace(new RegExp('^'+brand.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s+','i'),'');return n.length>2?n:name};
// Builder boards read "<brand> <model>" in the UI, so a case name keeps only the model: the listing's
// marketing detail (switch/wireless/RGB/kit wording, layout, colours, finishes, "by <Maker>") is dropped.
// Words that end the model name; anything after the first one is detail.
const BOARD_CUT=/^(?:mechanical|keyboards?|keybaord|kits?|custom|bare-?bones?|diy|hot-?swap(?:pable|ped)?|wireless|wired|bluetooth|rgb|led|backlit|backlight(?:ed)?|qmk(?:\/via)?|via|vial|double|double-?shot|triple|pbt|abs|dye|dye-sub|quick|aluminum|aluminium|cnc|prebuilt|pre-?built|pre|assembled|fully|with|w\/|tri-?mode|dual-?mode|2\.4g(?:hz)?|2\.4|win|mac|bundle|ultra-slim|foldable|vintage|inductive|laser|polycarbonate|multi|none)$/;
// Words removed wherever they appear after the first model word: layout, edition, colour and finish words.
const BOARD_DROP=/^(?:\d{2,3}%|\d+-?keys?|tkl|tenkeyless|full|full-?size|size|compact|gaming|edition|limited|special|classic|mx|version|black|white|silver|gr[ae]y|navy|blue|pink|purple|lavender|green|olive|red|beige|cream|yellow|orange|gold|brown|teal|mint|clear|transparent|dark|light|carbon|shell|frosted|crystal|ice|border|matte|anodized|polished|brushed|sandblasted|ash|pine|jet|deep|ocean|coral|latte|pd|matcha|aura|daybreak|cosmic|pure|pudding)$/;
export function boardName(title,brand,retailer='') {
  let t=String(title).replace(/\[[^\]]*\]/g,' ');
  const ver=t.match(/\(?\bVersion\s*(\d+)\)?/i); if(ver) t=t.replace(ver[0],' ');
  t=t.replace(/\([^)]*\)/g,' ').replace(/\b(?:round|batch)\s+\d+\b/gi,' ').replace(/\b(?:side|front)[- ]print(?:ed)?\b/gi,' ').replace(/\bhot[- ]swap(?:pable)?\b/gi,'hotswap').replace(/\bpre[- ]built\b/gi,'prebuilt').replace(/\b(?:x\s+MK|MK\s+x)\b/g,' ')
    .replace(/^\s*(?:warehouse find|in[- ]stock|pre-?order|group buy)\s*:?\s*/i,'');
  const by=t.match(/\s+by\s+([A-Z][\w.'&]*)/); if(by){t=t.replace(by[0],' '); brand=by[1]}
  const parts=t.split(/\s[-–—|]\s/); t=parts[0].trim()||parts.join(' ');
  let tokens=t.split(/\s+/).filter(Boolean), b=String(brand||'').replace(/\s+(?:pre-?order)$/i,'').trim();
  // "Lemokey X series" / "L series" / "Q Pro series" are product lines, not makers.
  if(/\sseries$/i.test(b)||/^(?:collaboration|mechanical keyboards?)$/i.test(b)){
    const w=b.split(/\s+/)[0];
    b=tokens[0]&&tokens[0].toLowerCase()===w.toLowerCase()?w:/^lemokey$/i.test(tokens[0]||'')?tokens[0]:(retailer||b);
  }
  const bt=b.split(/\s+/).filter(Boolean);
  if(bt.length&&bt.length<tokens.length&&bt.every((w,i)=>w.toLowerCase()===tokens[i].toLowerCase())) tokens=tokens.slice(bt.length);
  const afterBrand=tokens.join(' ');
  if(tokens.length>1&&/^(?:inc\.?|llc|ltd\.?)$/i.test(tokens[0])) tokens.shift();
  const tkl=tokens.slice(1).some(w=>/^(?:tkl|tenkeyless)$/i.test(w));
  while(tokens.length>1&&BOARD_CUT.test(tokens[0].toLowerCase())) tokens.shift();
  const keep=[];
  for(let i=0;i<tokens.length;i++){
    const w=tokens[i].toLowerCase().replace(/[,.;:]+$/,'');
    if(i>0&&BOARD_CUT.test(w)) break;
    if(i>0&&(BOARD_DROP.test(w)||w.includes('/')&&w.split('/').every(x=>BOARD_DROP.test(x)))){ keep.push(null); continue }
    keep.push(tokens[i]);
  }
  // A "/" or "+" between dropped words ("Navy / Blue", "Win + Mac") goes with them.
  const out=keep.filter((x,i)=>x!==null&&!(/^(?:[\/+&-]|and)$/i.test(x)&&(keep[i-1]===null||keep[i+1]===null)));
  while(out.length&&/^[-–—:,.;\/+&]+$/.test(out[out.length-1])) out.pop();
  // A lone plain word ("Tofu TKL", "Freebird TKL") needs its size to stay identifiable.
  if(tkl&&out.some(w=>/^[A-Za-z]{3,}$/.test(w))&&!out.some(w=>/\d/.test(w.replace(/^R\d$/i,'')))&&out.length<=2&&!/\bTKL\b/i.test(out.join(' '))) out.push('TKL');
  let model=out.join(' ').replace(/[\s,.;:\-–—]+$/,'');
  if(ver&&model) model+=' Version '+ver[1];
  if(!model) model=afterBrand.replace(/[\s,.;:\-–—]+$/,'')||String(title).trim()||String(brand||'');
  return {brand:b||String(brand||''),name:model};
}
const cheapest=vs=>vs.slice().sort((a,b)=>a.price-b.price)[0];
// Kept compact: the site fills catalogId, photo.page and checkedAt back in when it loads the file.
const base=(p,v,extra)=>({id:p.id,brand:cleanBrand(p),name:shortName(p.name,cleanBrand(p)),price:v.price,photo:{img:v.image||p.images[0]},retailers:[{name:p.retailer,url:v.url,available:true}],...extra});
// Builder layouts are 60, 65, 75, TKL and full-size. Other published layouts stay in the directory only.
export function builderLayout(raw,name='') {
  if(/\bTKL\b|tenkeyless/i.test(name)) return {layout:'tkl',label:'TKL'};
  const n=Number(raw); if(!n) return null;
  if(n===60||n===65||n===75) return {layout:String(n),label:n+'%'};
  if(n===70) return {layout:'75',label:'70%'};
  if(n===80) return {layout:'tkl',label:'TKL'};
  if(n===96||n===98||n===100) return {layout:'full',label:n===100?'Full-size':n+'%'};
  return null;
}
const COLOR_HEX={black:'#26272B',white:'#EDEBE6',silver:'#B8BBBF',grey:'#8E9196',gray:'#8E9196',navy:'#2B3A55',blue:'#4C6FA8',pink:'#E7A9BE',purple:'#7D66B2',lavender:'#B8A6DB',green:'#5D8C6A',olive:'#7C805A',red:'#B5463F',beige:'#DDD1B8',cream:'#E8DFC9',yellow:'#E7C65A',orange:'#D9823B',gold:'#C8A75A',brown:'#7A5A40',teal:'#3E8E8A',mint:'#A6D5C2',clear:'#D9DEE2',transparent:'#D9DEE2',e:'#5F5E5A'};
const colorHex=n=>{const k=Object.keys(COLOR_HEX).find(c=>new RegExp('\\b'+c+'\\b','i').test(n));return k?COLOR_HEX[k]:null};
// Board names usually carry their size ("Zoom75", "Crush 80", "QK65", "104 keys").
// Layouts a name mentions ("QK60/QK65 Plates" mentions two); a PCB or plate sold for several sizes has no single layout.
export function layoutsInName(name) {
  const found=new Set(), t=String(name);
  if(/\btkl\b|tenkeyless/i.test(t)||/(?<=[a-z0-9])TKL(?![a-z])/.test(t)) found.add('tkl');
  if(/full[- ]?size/i.test(t)||/(?<![\d.])1800(?!\d)/.test(t)) found.add('full');
  for(const m of t.matchAll(/(?<![\d.])(60|61|64|65|66|67|68|70|75|80|81|82|83|84|87|96|98|100|104|108)(?:\s?(?:%|percent)|(?![\d.]))(?!\s?(?:g|gf|mm|hz|mah|k|keycaps?|pcs|switch|pin)\b)/gi)) found.add(layoutFromName(m[1]+'%').layout);
  return [...found];
}
export function layoutFromName(name) {
  if(/\btkl\b|tenkeyless/i.test(name)||/(?<=[a-z0-9])TKL(?![a-z])/.test(name)) return {layout:'tkl',label:'TKL'};
  if(/full[- ]?size/i.test(name)||/(?<![\d.])1800(?!\d)/.test(name)) return {layout:'full',label:'Full-size'};
  // The size can be glued to the model name ("Zoom75", "Stacked65", "Rekt1800"), so only a digit or dot may not come before it.
  const m=String(name).match(/(?<![\d.])(60|61|64|65|66|67|68|70|75|80|81|82|83|84|87|96|98|100|104|108)(?:\s?(?:%|percent)|(?![\d.]))(?!\s?(?:g|gf|mm|hz|mah|k|keycaps?|pcs|switch|pin)\b)/i);
  if(!m) return null; const n=+m[1];
  return n<=64?{layout:'60',label:'60%'}:n<=68?{layout:'65',label:'65%'}:n===70?{layout:'75',label:'70%'}:n===75||(n>=81&&n<=84)?{layout:'75',label:'75%'}:n===80||n===87?{layout:'tkl',label:'TKL'}:{layout:'full',label:n===96||n===98?n+'%':'Full-size'};
}
// ---------------------------------------------------------------------------------------------------------------------
// Admission: which directory listings become builder/finder parts. Every rule reads what the listing states (name, variant
// names, options, published specs); a spec the listing does not state stays null. Every listing that is not admitted gets a
// named reason (see admissionReport). Sold-out listings go through the same rules as in-stock ones, using all variants.
// ---------------------------------------------------------------------------------------------------------------------
const pool=p=>p.available?live(p):p.variants;
const forBoard=t=>String(t).replace(/\b(?:for|of|such as)\s+(?:[\w+-]+\s+){0,3}keyboards?\b/ig,' ');
const published=(p,keys)=>{for(const [k,v] of Object.entries(p.publishedSpecs||{})) if(keys.test(k)) return String(v)};
const num=s=>{const m=String(s??'').match(/(\d+(?:\.\d+)?)/);return m?+m[1]:null};
export const SWITCH_SYSTEMS=['hall-effect','low-profile','optical','mx-mechanical'];
export function switchSystemOf(text) {
  const t=String(text||'');
  if(/hall.?effect|magnetic|\bHE\b|\bTMR\b|rapid trigger/i.test(t)) return 'hall-effect';
  if(/optical/i.test(t)) return 'optical';
  if(/low.?profile|\bchoc\b|ks-?33|ks-?27/i.test(t)) return 'low-profile';
  return null;
}
const MX_STATED=/\bmx\b|cherry mx|mx[- ]stem|\b[35]\s?-?pins?\b/i;
const UNSUPPORTED_SYSTEM=/topre|\bEC\b|electro.?capacitive|\balps\b/i;
const NO_DRAW=/ortho|\bsplit\b|alice|\bnumpad\b|number ?pad|key ?pad|macro ?pad|\bpad\b|ergo|one[- ]handed|foldable|(?<![\d.])(?:[1-9]|[1-4]\d|5[0-5])\s?%|(?<![\d.])(?:2[0-9]|3[0-9]|4[0-9])[- ]?keys?\b|(?<![\d.])4\d(?![\d.])(?!\s?(?:g|gf|mm|hz|mah|k|m|keycaps?|pcs|switch))|\b(?:xd24|bm16\w*|bm43\w*|jj\d+\w*|cospad|planck|preonic|corne|lily58|kyria|ergodox|dactyl|sofle|ergodone)\b/i;
const drawable=(raw,name)=>builderLayout(raw,name)||layoutFromName(name);
const hotOf=t=>{t=String(t||'');const h=/hot[- ]?swap/i.test(t),s=/\bsolder(?:ed|able)?\b|soldering/i.test(t);return h&&!s?true:s&&!h?false:null};
const connOf=t=>{t=String(t||'');return /tri[- ]?mode/i.test(t)?'Tri-mode':/bluetooth/i.test(t)?'Bluetooth':/2\.4\s?g/i.test(t)?'2.4G':/wireless|dual[- ]?mode/i.test(t)?'Wireless':/\bwired\b/i.test(t)?'Wired':null};
const MATERIALS=[['Carbon fiber',/carbon|\bcf\b/i],['FR4',/fr-?4/i],['Brass',/brass/i],['Aluminum',/alumin(?:i)?um|\balu\b|\bal\b/i],['POM',/\bpom\b|delrin/i],['PC',/polycarbonate|\bpc\b/i]];
export function plateMaterial(...texts) {
  for(const t of texts) {
    let best=null;
    for(const [m,r] of MATERIALS) {const x=r.exec(String(t||'')); if(x&&(!best||x.index<best.i)) best={m,i:x.index}}
    if(best) return best.m;
  }
  return null;
}
const caseMaterial=(...texts)=>{for(const t of texts){const m=String(t||'').match(/\b(aluminum|aluminium|brass|stainless steel|steel|copper|acrylic|polycarbonate|abs|plastic|wood(?:en)?|bamboo|walnut|resin)\b/i);if(m)return titleCase(m[1].toLowerCase())}return null};
const colorsOf=(p,v)=>{
  const opt=p.options.find(o=>/colou?r|finish/i.test(o.name));
  let colors=opt?[...new Set(opt.values)].map(n=>[n,colorHex(n)]).filter(c=>c[1]).slice(0,6):[];
  if(!colors.length){const h=colorHex(p.name+' '+v.name);colors=[['As pictured',h||'#57534E']]}
  return colors;
};
// Two types listed side by side ("Linear Tactile", "linear/tactile") mean the listing sells both: the type is not one value.
const typesListed=n=>/\b(?:linear|tactile|clicky)\b[\s,/&+-]+(?:and\s+)?(?:linear|tactile|clicky)\b/i.test(forBoard(n));

// ---- what a listing really is ----
const BOARDISH=/\bkeyboards?\s*(?:kit|with|\(|-|$)|\bbarebone|\d{2,3}\s?%|\bmacro ?pad|\bnumpad|\bkeypad|\bpad\b|\bboard\b/i;
const SWITCHLIKE_NOT=/\bkits?\b|\bcase\b|keycaps?|cable|opener|puller|\blube\b|lubricant|film|spring|stabili|\bstems?\b(?!\s+switch)|housing|tray|storage|tester|\bstand\b|badge|knob|\b(?:display|collection)\s+box|switch(?:es)?\s+box(?:es)?\s*$|container|tool|brush|tripod|baggie|socket|holder|\bpcb\b|\bplate\b/i;
const KEYCAP_NOT=/puller|remover|tray|storage|\bstand\b|clean|display|holder|retainer|lube|tool|\bbag\b|\bbox\b|case\b/i;
// The category a listing's rules should follow. Store categories are rough: switches sit under keyboards or PCBs ("PCB Mount Switch"),
// keycap sets under extras, and so on.
function route(p) {
  const c=p.category, n=forBoard(p.name), nMount=n.replace(/\b(?:pcb|plate)[ -]mount(?:ed)?\b/ig,' ').replace(/\b(?:mx|cross)[ -]stems?\b/ig,' ');
  if(['keyboards','pcb','plate','cases'].includes(c)&&/\bswitch(?:es)?\b/i.test(nMount)&&!SWITCHLIKE_NOT.test(nMount)&&!BOARDISH.test(nMount)) return 'switches';
  if(c==='extras'&&/\bswitch(?:es)?\b/i.test(nMount)&&/\b(?:linear|tactile|clicky)\b/i.test(nMount)&&!SWITCHLIKE_NOT.test(nMount)&&!BOARDISH.test(nMount)) return 'switches';
  if(['extras','deskmats','keyboards'].includes(c)&&/\bkeycaps?\b/i.test(n)&&/\bsets?\b|\bkits?\b|keycaps\b|bundle/i.test(n)&&!KEYCAP_NOT.test(n)&&!/keyboard/i.test(n)) return 'keycaps';
  if(c==='extras'&&/\bkeycaps?\b/i.test(n)&&!KEYCAP_NOT.test(n)&&!/keyboard|\bswitch/i.test(n)) return 'keycaps';
  if(c==='extras'&&/\bkeyboards?\b/i.test(n)&&/\d{2,3}\s?%|\btkl\b|hot-?swap|wireless|bluetooth|qmk|full[- ]size/i.test(n)&&!/cable|cover|foam|wrist|stand|bag|\bmat\b|carry|travel|storage|protective|badge|film|plate\b|pcb\b/i.test(n.replace(/\bw\/\s*knob\b/i,'').replace(/(?:hot[- ]?swap(?:pable)?|with|and|\+|&)\s+pcb\b/ig,' '))) return 'keyboards';
  if(c==='extras'&&/\bcase\b/i.test(n)&&(layoutFromName(n)||NO_DRAW.test(n))&&!/foam|weights?|badge|feet|bumpon|screw|cover|sleeve|\bbag\b|pouch|carry|travel|storage|protective|\bparts?\b/i.test(n)) return 'cases';
  if(c==='extras'&&/\bpcbs?\b/i.test(n)&&!/foam|screw|stand-?off|gasket|spacer|plates?\b|\bcase\b|cable|dampen|film|\bmat\b|socket|diode|keycaps?|switch(?:es)?\b|stabili/i.test(n)) return 'pcb';
  if(c==='keycaps'&&/\bkeyboard\b/i.test(n)&&/\bswitch|hot-?swap|wireless|bluetooth|qmk/i.test(n)&&!/\bkeycaps? sets?\b|\bkeycaps? for\b/i.test(n)) return 'keyboards';
  if(c==='pcb'&&/\bplates?\b/i.test(n)&&!/\bpcb\b/i.test(n)) return 'plate';
  if(c==='pcb'&&/\bkits?\b/i.test(n)&&/\bcase\b/i.test(n)) return 'keyboards';
  if(c==='pcb'&&p.variants.some(v=>/\bswitch\b|keycap/i.test(v.name))&&/\bkeyboard\b/i.test(n)) return 'keyboards';
  if(c==='deskmats'&&/\bkeycaps?\b/i.test(n)) return 'keycaps';
  if(c==='switches'&&/\bkeycaps?\b/i.test(n)&&!/\b(?:linear|tactile|clicky)\b/i.test(n)) return 'keycaps';
  return c;
}
const JUNK=/\bservice\b|card sleeves?|capacitor|keychain|lanyard|t-?shirt|hoodie|plush|\bmug\b|poster|sticker|gift|dragon shield|mystery|sample pack/i;

// ---- extras ----
const TOOL=/opener|puller|\bbrush(?:es)?\b|tweezers?|screw ?drivers?|multi-?tool|tool ?kit|\btools?\b|\bstation\b|\bshims?\b|tuning|tester|twister|\bforks?\b|holder|pusher|slider|retriever|spudger|bit set|bender|desolder|soldering/i;
const KINDS=[
  ['Lube',/lubricant|\blube\b|krytox|tribosys|xht-?bdz|\bgrease\b/i],
  ['Cable',/\bcables?\b|premicord|aviator|usb[- ]?c?\b.*(?:extension|extender|adapter)/i],
  ['Switch films',/\bfilms?\b/i],
  ['Springs',/\bsprings?\b/i],
  ['Foam',/foam|dampen|damper|sorbothane|poron|\bEPT\b|silicone sock/i],
  ['Knob',/\bknobs?\b|rotary|encoder/i],
  ['Feet',/\bfeet\b|\bbumpons?\b|\bfoot\b/i],
  ['Weight',/\bweights?\b|weight bar|blockers?/i],
  ['Badge',/\bbadges?\b/i],
  ['Gaskets',/gaskets?/i],
];
export const EXTRA_KINDS=['Tool','Lube','Cable','Switch films','Springs','Foam','Deskmat','Knob','Feet','Weight','Badge','Gaskets','Accessory'];
// Every kind a text names, in the order it names them.
function kindsIn(n) {
  n=String(n);
  if(/desk\s*(?:mat|pad)|mouse\s*pad/i.test(n)) return ['Deskmat'];
  if(/lubricant|krytox|tribosys|xht-?bdz|\bgrease\b/i.test(n)&&!/station|brush|holder/i.test(n)) return ['Lube'];
  if(TOOL.test(n)) return ['Tool'];
  const hits=[];
  for(const [k,r] of KINDS) {const m=r.exec(n); if(m) hits.push({k,i:m.index})}
  return hits.sort((a,b)=>a.i-b.i).map(h=>h.k);
}
// Kind comes from the listing name. When the name lists several ("Knobs and Weights"), the variant shown decides; a generic name
// ("... Accessories") falls back to the variant alone. A film or spring named beside a gasket ("Gasket Switch Films") is the film.
export function extraKind(name,variant='') {
  const ks=kindsIn(name), vk=kindsIn(variant)[0];
  if(!ks.length) return vk||'Accessory';
  if(ks.length>1&&vk&&ks.includes(vk)) return vk;
  for(const k of ['Switch films','Springs']) if(ks.includes(k)) return k;
  return ks[0];
}

// ---- switches ----
const SWITCH_TESTER=/tester|sampler|sample pack|test box|switch test|mystery/i;
// A listing with no stated count whose cheapest variant costs at most this much is priced per switch (USD).
export const PER_SWITCH_MAX=1.5;
const switchPart=name=>{
  const n=forBoard(name).replace(/\b(?:mx|cross)[ -]stems?\b/ig,' ');
  return /tripod|baggie|\bbags?\b|\bfilms?\b|lube station|\btray\b|storage|container|\bswitch (?:top|bottom) case\b|\bhousing (?:tops?|bottoms?)\b|\b(?:top|bottom) housings?\b|stem holder|\bswitch stems?\b|\bstems?\s*(?:\(|$)|opener|puller|lubricant|switch (?:pusher|slider|holder|stand)|\bswitch\s+box\b|\bswitch springs?\b|(?:^|\s)springs\b(?!.*\bswitch\b)/i.test(n);
};
const sizeLabel=(v,optNames,q)=>{
  const vp=variantPack(v.name,optNames);
  const raw=vp?vp.label:v.name.replace(String(q),'');
  return raw.replace(/\b\d{1,3}\s*-?\s*packs?\b/gi,'').replace(/\b(?:sets?|pcs|pieces|switches|packs?|pac|count)\b/gi,'').replace(/[\s/|,()-]+/g,' ').trim();
};
// A count in the variant name wins; else the pack size the listing states (stored at refresh time, or read from its title and published specs).
const quantityOf=(p,v)=>{
  const optNames=(p.options||[]).map(o=>o.name), vp=variantPack(v.name,optNames);
  if(vp) return vp.n;
  if(v.quantity) return v.quantity;
  const body=Object.entries(p.publishedSpecs||{}).map(([k,x])=>`<p>${k}: ${x}</p>`).join('');
  return packQuantity({title:p.name,options:p.options,body_html:body,tags:[]},{title:v.name},'switches');
};
function switchesRule(p) {
  const s=p.specs, optNames=(p.options||[]).map(o=>o.name);
  if(SWITCH_TESTER.test(p.name)) return {reason:'switch tester or sample pack'};
  if(switchPart(p.name)) return {accessory:true};
  if(UNSUPPORTED_SYSTEM.test(forBoard(p.name))) return {reason:'unsupported switch system (Topre/EC/Alps)'};
  const switchSystem=switchSystemOf(forBoard(p.name))||s.system||(MX_STATED.test(p.name)?'mx-mechanical':null);
  let vs=pool(p).map(v=>({...v,quantity:quantityOf(p,v)})).map(v=>({...v,unitPrice:v.quantity?Math.round(v.price/v.quantity*100000)/100000:null}));
  // No count stated anywhere: a cheapest price of PER_SWITCH_MAX or less is a price no multi-switch pack could have, so it is the price of one switch.
  let perSwitch=false;
  if(!vs.some(v=>v.quantity)&&vs.length&&cheapest(vs).price<=PER_SWITCH_MAX) {
    if(!(typesListed(p.name)?null:switchType(s.type??published(p,/switch type|typing style|^type$|tactility/i)??p.name))) return {reason:'no switch type'};
    const c=cheapest(vs); vs=[{...c,quantity:1,unitPrice:c.price}]; perSwitch=true;
  }
  // Variants that differ only by pack size are one switch; anything else (spring weight, color, type)
  // is a separate switch sold under one listing, so each becomes its own part.
  const groups=new Map();
  for(const v of vs) {if(!v.quantity||!v.unitPrice) continue; const k=sizeLabel(v,optNames,v.quantity).toLowerCase(); if(!groups.has(k)||v.unitPrice<groups.get(k).unitPrice) groups.set(k,v)}
  if(!groups.size) return {reason:'no pack size'};
  if(groups.size>24) return {reason:'too many variants (more than 24 switches in one listing)'};
  const type0=typesListed(p.name)?null:switchType(s.type??published(p,/switch type|typing style|^type$|tactility/i)??p.name);
  const part=(v,split)=>{
    const label=sizeLabel(v,optNames,v.quantity), type=switchType(split?label:'')||type0; if(!type) return null;
    const w=split&&label.match(/(\d{2,3}(?:\.\d+)?)\s?gf?\b/i);
    const force0=s.actuationForceG??num(published(p,/^(?:actuation|operating|operation)(?: force)?$/i));
    let force=force0??null, bottom=s.bottomOutForceG??num(published(p,/bottom[ -]?out/i))??null;
    if(split){force=w&&/actuat|operat/i.test(optNames.join(' '))?+w[1]:null; bottom=w&&/bottom/i.test(optNames.join(' '))?+w[1]:null}
    const verified=!split&&s.system==='mx-mechanical'&&!p.missingFields.length;
    const pins=s.pins??num((published(p,/pin/i)||'').match(/([35])\s*-?\s*pin/i)?.[1])??num((p.name.match(/\b([35])\s?-?pins?\b/i)||[])[1]);
    const lube=published(p,/lube|lubed/i);
    return {...base(p,v),id:split?p.id+'~'+v.id:p.id,name:shortName(p.name,cleanBrand(p))+(split?' · '+label:''),cat:'switches',type,force,bottom,travel:s.totalTravelMm??num((published(p,/total travel/i)||'').match(/\d+(?:\.\d+)?/)?.[0])??null,pins:pins??null,price:v.unitPrice,packPrice:v.price,packQuantity:v.quantity,
      factory:s.factoryLubed??(lube&&/^yes|factory|pre/i.test(lube)?true:lube&&/^no|un/i.test(lube)?false:null),sound:soundFromMaterials(s.topHousing,s.bottomHousing,s.stemMaterial),switchSystem,vol:/Silent/.test(type)?15:type==='Clicky'?85:50,verified,
      blurb:'Published retailer specs. '+(perSwitch?'Priced per switch.':v.quantity+' per pack.')+(verified?'':' Some specs are not listed by the store.')+(s.topHousing||s.bottomHousing||s.stemMaterial?' Sound estimated from the housing and stem materials.':'')+' Preview colors are illustrative.'};
  };
  if(groups.size===1) {const r=part([...groups.values()][0],false); return r?{parts:r}:{reason:'no switch type'}}
  const parts=[...groups.values()].map(v=>part(v,true)).filter(Boolean);
  return parts.length?{parts}:{reason:'no switch type'};
}

// ---- keycaps ----
const NOT_A_SET=/\bsingles?\b(?!\s+chip)|artisan|novelt|novlty|spacebar|accent|add-?on|extension|\b1u\b|numpad|40'?s\b|forties|ortho|international|iso kit|kit collection|\bextras?\b|deskmat|desk mat|mouse ?pad|\bsamples?\b|configurator|cable clip|keychain|\bresin\b|\bmeme\b|(?<![\d.])\d(?:\.\d+)?u\b|\b(?:zxcv|wasd|qwer\w*|backspace)\b/i;
const KC_ADDON=/numpad|novel|spacebar|extension|international|\buk\b|\biso\b|deskmat|desk mat|\bmods?\b|accent|alt colou?r|relegendable|\bicons?\b|led indicator|add-?on|artisan|40'?s\b|forties|macros?|\brow \d|\bsingle\b|keyboard|\bswitch|mouse|wrist|\besfr\b|\bnorde\b|modifiers?|cable|cap clip/i;
// A "base kit" is named Base/Core/Standard/Keyset...; "Alphas", "Bundle", "All-in-one" or a bare listing only stand in for it when no base is named.
const KC_BASE=/\b(?:base|core|standard|full (?:set|kit)|keycap set|key ?set|main|essentials?)\b/i;
const KC_BASE_LOOSE=/\b(?:alphas?|default title|ansi|87|tkl|104|108|bundle|all[- ]in[- ]one|complete)\b/i;
const keyCountOf=p=>p.specs.keyCount??num((published(p,/key count|number of keys|^keys$|^amount$/i)||'').match(/\d+(?=\s*(?:keys|keycaps|pcs)?)/)?.[0])??num((p.name.match(/(?<![\w.])(\d{1,3})[- ]?(?:keys?|keycaps|pcs)\b/i)||[])[1]);
// The variant that is the full set: one named as a base kit (cheapest wins); else a loosely named one (alphas, bundle, all-in-one);
// else the cheapest variant whose name does not look like an add-on.
export function keycapBase(variants) {
  const addOn=v=>KC_ADDON.test(v.name)&&!/\b(?:base|core)\b/i.test(v.name);
  const cand=variants.filter(v=>!addOn(v));
  if(!cand.length) return null;
  const tier1=cand.filter(v=>KC_BASE.test(v.name)), tier2=cand.filter(v=>KC_BASE_LOOSE.test(v.name)&&!/\balt(?:ernate)?\b/i.test(v.name));
  return {v:cheapest(tier1.length?tier1:tier2.length?tier2:cand),tier:tier1.length?1:tier2.length?2:3};
}
const KEYCAP_ACCESSORY=/display frame|\bframe\b|puller|remover|\btray\b|storage|\bonly box\b|\bbox only\b|clean|\bstand\b|holder|retainer|cable clip|\bcharm\b/i;
const PROFILES=/\b(Cherry|OEM|XDA|DSA|SA|MT3|KAT|KAM|DSS|DCS|DCX|ASA|OSA|MDA|MOA)\b/;
const ISO_KEYCAPS=/\bISO\b|spanish|german|nordic|french|azerty|qwertz|\b(?:DE|FR|ES)\b/i;
function keycapsRule(p) {
  const s=p.specs, n=p.name;
  if(KEYCAP_ACCESSORY.test(n)) return {accessory:true};
  if(NOT_A_SET.test(n)) return {reason:'not a full set'};
  const k=keyCountOf(p); if(k!=null&&k<50) return {reason:'not a full set'};
  // ISO and national layouts (Spanish, German, Nordic, AZERTY...) don't fit the ANSI boards the builder draws.
  // Sublegend sets (Japanese, Korean, Hebrew) are ANSI sets with extra legends, so they stay.
  const isoOnly=t=>ISO_KEYCAPS.test(t)&&!/\bANSI\b|\bUS\b/i.test(t);
  if(isoOnly(n)) return {reason:'non-ANSI layout'};
  const pooled=pool(p), vs=pooled.filter(v=>!isoOnly(v.name)); if(!vs.length) return {reason:pooled.length?'non-ANSI layout':'not a full set'};
  // A title that says "keycap" (not keycaps/set/kit), with one cheap variant, is a single key.
  if(/\bkeycap\b/i.test(n)&&!/keycaps|key ?sets?|\bsets?\b|\bkits?\b/i.test(n)&&vs.length===1&&vs[0].price<20) return {reason:'not a full set'};
  // The full set is picked among all variants when the listing is in stock only through add-ons: a sold-out Base kit beats an in-stock alphas kit.
  let pick=keycapBase(vs); const all=p.available?keycapBase(p.variants):null;
  if(all&&(!pick||all.tier<pick.tier)) pick=all;
  if(!pick) return {reason:'not a full set'};
  const v=pick.v;
  // GMK only produces Cherry-height sets (now sold as CYL), so a GMK title with no profile is Cherry. A profile the listing does not state stays null.
  const profile=s.profile||(n.match(PROFILES)||[])[1]||(published(p,/profile/i)||'').match(PROFILES)?.[1]||(/^GMK\b/i.test(n)?'Cherry':null);
  const material=s.material??(published(p,/material/i)||'').match(/\b(PBT|ABS)\b/i)?.[1]??null;
  const legends=s.legends??(/double[ -]?shot/i.test(published(p,/legend/i)||'')?'Doubleshot':/dye[ -]?sub/i.test(published(p,/legend/i)||'')?'Dye-sub':null);
  const covers=k>=104?['60','65','75','tkl','full']:k>=87?['60','65','75','tkl']:k>=84?['60','65','75']:k>=68?['60','65']:k>=61?['60']:null;
  return {soldOut:!v.available,parts:{...base(p,v),cat:'keycaps',name:shortName(n,cleanBrand(p))+(p.variants.length>1&&v.name!=='Default Title'?' · '+v.name:''),profile:profile?titleCase(profile.toLowerCase()).replace(/^(Oem|Xda|Dsa|Sa|Mt3|Kat|Kam|Dss|Dcs|Dcx|Asa|Osa|Mda|Moa)$/,x=>x.toUpperCase()):null,material:material?material.toUpperCase().replace(/\s/g,''):null,legends:legends??null,keyCount:k??null,covers,mood:[],
    blurb:'Published retailer specs.'+(covers?' Coverage from the listed key count.':' Check that the kit covers your layout.')}};
}

// ---- stabilizers ----
function stabsRule(p) {
  if(/tuning|tester|twister|\bshims?\b|\bforks?\b|\btool|holder|clipper|stabilizer (?:wire|lube)|\bwires? (?:set|only|kit)|\bwires only|lube/i.test(p.name)) return {accessory:true};
  const mount=/plate[- ]?mount/i.test(p.name)?'plate':/screw[- ]?in/i.test(p.name)?'screw':/clip[- ]?in|snap[- ]?in/i.test(p.name)?'clip':p.specs.mount;
  if(!mount) return {reason:'no mount type'};
  const vs=pool(p); if(!vs.length) return {reason:'no mount type'};
  const v=cheapest(vs), full=vs.find(v=>/\b(7|full|100%|104|108)\b/i.test(v.name));
  return {parts:{...base(p,v),cat:'stabs',mount,fullPrice:full?full.price:v.price,blurb:'Published retailer listing.'+(full?'':' Check the set has enough stabilizers for a full-size board.')}};
}

// ---- extras: sound mods ----
// The mod type comes from the listing name. Its effect is the usual community result for that kind of mod
// (sources in docs/mod-sounds.md), on the builder's sound-estimate scale: pitch and vol move the meters, rattle
// marks stabilizer fixes, poppy marks the marbly PE sound. Anything else is not a sound mod and has no effect.
export const MOD_TYPES={
  'case-foam':{label:'Case foam',fx:{pitch:-5,vol:-8},why:'Fills the empty case. Less hollow echo, quieter and deeper.'},
  'plate-foam':{label:'Plate foam',fx:{pitch:-3,vol:-4},why:'Sits between plate and PCB. Softens the ring of the plate.'},
  'switch-pad':{label:'PE switch pads',fx:{pitch:5,vol:-1,poppy:true},why:'Thin PE under the switches. A higher, poppier, marbly sound.'},
  'o-ring':{label:'O-rings',fx:{pitch:-2,vol:-6},why:'Cushion each key at the bottom. Much quieter, with a softer landing.'},
  'switch-film':{label:'Switch films',fx:{pitch:-1,vol:-1},why:'Tighten loose switch housings. Less wobble and rattle, slightly fuller.'},
  'switch-lube':{label:'Switch lube',fx:{pitch:-3,vol:-3},why:'Smooths each stroke. Less scratch, a deeper, more muted sound.'},
  'spring-oil':{label:'Spring oil',fx:{vol:-1},why:'For the springs. Removes spring ping.'},
  'stab-lube':{label:'Stabilizer lube',fx:{vol:-1,rattle:true},why:'For the stabilizer wires. Stops the rattle on the long keys.'},
};
export function modOf(kind,name){
  const n=String(name||'');
  if(kind==='Lube'){
    if(/stabili[sz]er|dielectric|xht-?bdz/i.test(n)) return 'stab-lube';
    if(/205\s?g0|g205|206\s?g|320[34]|tribosys/i.test(n)) return 'switch-lube';
    if(/gpl\s?10[0-7]|\boil\b/i.test(n)) return 'spring-oil';
    if(/krytox/i.test(n)) return 'switch-lube';
    return null;
  }
  if(kind==='Switch films') return /\bPE\b|pe-white|0\.5\s?mm|ixpe/i.test(n)?'switch-pad':'switch-film';
  if(kind==='Foam'){
    if(/o-?rings?|pro rings|dampening rings?/i.test(n)) return 'o-ring';
    if(/switch pads?|tripods?|ixpe|\bPE\b(?! film)|pe foam|switch film/i.test(n)) return 'switch-pad';
    if(/spacebar|stabili[sz]er|stem foam|rubber strip/i.test(n)) return null; // no published sound effect found
    if(/plate foam|pcb.?plate|plate.?pcb|between (?:the )?plate/i.test(n)) return 'plate-foam';
    if(/gasket|mount dampener|\bno foam\b/i.test(n)) return null;
    if(/pcb foam/i.test(n)) return 'plate-foam';
    if(/case foam|bottom (?:pad|foam)|\bEPT\b|sound dampening|noise absorption|silicone (?:dampener|bottom)|dampener|foam kit|foams?\b/i.test(n)) return 'case-foam';
  }
  return null;
}

// ---- extras: listing rule ----
function extrasRule(p) {
  if(JUNK.test(p.name)) return {reason:'not a keyboard part'};
  const vs=pool(p); if(!vs.length) return {reason:'not a keyboard part'};
  const v=cheapest(vs), kind=extraKind(p.name,v.name), name=p.name+(v.name==='Default Title'?'':' · '+v.name), mod=modOf(kind,name);
  return {parts:{...base(p,v),cat:'extras',name,kind,...(mod?{mod}:{}),fx:mod?{...MOD_TYPES[mod].fx}:{},blurb:mod?MOD_TYPES[mod].why:'Retailer listing for the named variant. No sound effect is assumed.'}};
}

// ---- keyboards (assembled boards and kits) ----
const ACCESSORY_WORDS=/socket|layout bars?|grease|screw ?driver|multi-?tool|tool ?kit|keychain|spacer|\bbrush\b|\bpuller\b|\bopener\b|tester|\bsandbox\b|\bcloth\b|lubricant|\bmat\b|\bpin\b/i;
function keyboardsRule(p) {
  const s=p.specs, n=p.name;
  if(+s.layout===70||/\b70\s*(?:%|percent)/i.test(n))return {reason:"layout the builder can't draw"};
  if(JUNK.test(n)) return {reason:'not a keyboard part'};
  if(NOT_A_BOARD.test(n.replace(/(?:hot[- ]?swap(?:pable)?|with|and|\+|&)\s+(?:pcb|plate)\b/ig,' '))||ACCESSORY_WORDS.test(n)) return {accessory:true};
  if(UNSUPPORTED_SYSTEM.test(n)) return {reason:'unsupported switch system (Topre/EC/Alps)'};
  if(NO_DRAW.test(n)) return {reason:"layout the builder can't draw"};
  if(LOCALE.test(n)) return {reason:'non-ANSI layout'};
  const L=drawable(s.layout,n)||layoutFromName(published(p,/layout|^size$/i)||'');
  if(!L) return {reason:[40,85,90,95].includes(+s.layout)?"layout the builder can't draw":'no layout'};
  const vs0=pool(p); if(!vs0.length) return {reason:'no board variant'};
  const vs=vs0.filter(v=>!LOCALE.test(v.name)).length?vs0.filter(v=>!LOCALE.test(v.name)):vs0;
  const bare=cheapest(vs.filter(v=>boardVariant(v)&&/bare ?bones?|barebone|\bkit\b|no switch|without switch|\bdiy\b/i.test(v.name)));
  const assembled=!bare&&!/bare ?bones?|barebone|\bkit\b|diy/i.test(n);
  const boards=vs.filter(boardVariant); if(!boards.length) return {reason:'no board variant'};
  const v=bare||cheapest(boards);
  const board=boardName(n,cleanBrand(p),p.retailer), switchSystem=switchSystemOf(n)||s.switchSystem||(LOW_PROFILE_MODELS.test(n)?'low-profile':null);
  return {parts:{...base(p,v),cat:'case',brand:board.brand,name:board.name,layout:L.layout,layoutLabel:L.label,keys:null,knob:/\bknob\b/i.test(n),mount:tidy(s.mount??published(p,/mount/i)),material:tidy(s.material??published(p,/case material|^material$/i)),conn:s.connection||connOf(n)||connOf(v.name)||'Not listed',colors:colorsOf(p,v),assembled,...(switchSystem?{switchSystem}:{}),
    kit:{pcb:{hotswap:s.hotswap??hotOf(n+' '+v.name),pins:null,led:null,rgb:null,stabs:[]},plate:null,stabs:null},
    blurb:assembled?'Sold assembled. Switches and keycaps you pick here are swaps or upgrades.':'Kit listing. Check the store for exactly what is included.'}};
}

// ---- bare cases, PCBs and plates ----
const CASE_PART=/case parts?|\b(?:top|bottom|upper|lower)\s+case\b|\bcase\s+(?:top|bottom|lid)\b|badge case|\bextras?\b|\bweights?\b|\blid\b|bezel/i;
const CASE_BOTH=/(?:top|upper)\s*(?:and|&|\+|,|\/)\s*(?:bottom|lower)|(?:bottom|lower)\s*(?:and|&|\+|,|\/)\s*(?:top|upper)/i;
const CASE_ACCESSORY=/folio|sleeve|carrying|travel|\bbag\b|pouch|protective|dust|storage/i;
function casesRule(p) {
  const s=p.specs, n=p.name;
  if(+s.layout===70||/\b70\s*(?:%|percent)/i.test(n))return {reason:"layout the builder can't draw"};
  if(CASE_ACCESSORY.test(n)||(CASE_PART.test(n)&&!CASE_BOTH.test(n))) return {accessory:true};
  if(pool(p).some(v=>/\bswitch|cherry mx|gateron|kailh|keyboard\b/i.test(v.name))) return {reason:'not a bare case (sold as a keyboard)'};
  if(NO_DRAW.test(n)) return {reason:"layout the builder can't draw"};
  if(LOCALE.test(n)) return {reason:'non-ANSI layout'};
  const L=drawable(s.layout,n);
  if(!L) return {reason:[40,85,90,95].includes(+s.layout)?"layout the builder can't draw":'no layout'};
  const vs0=pool(p); if(!vs0.length) return {reason:'no case variant'};
  const vs=vs0.filter(v=>!LOCALE.test(v.name)).length?vs0.filter(v=>!LOCALE.test(v.name)):vs0;
  const v=cheapest(vs), switchSystem=switchSystemOf(n)||s.switchSystem||null;
  return {parts:{...base(p,v),cat:'case',layout:L.layout,layoutLabel:L.label,keys:null,knob:/\bknob\b/i.test(n),mount:tidy(s.mount??published(p,/mount/i)),material:tidy(s.material??published(p,/case material|^material$/i))??caseMaterial(n,v.name),conn:'Depends on PCB',colors:colorsOf(p,v),assembled:false,kit:null,...(switchSystem?{switchSystem}:{}),fit:null,
    blurb:'Case only. Check the store for what is included.'}};
}
const PCB_ACCESSORY=/socket|diode|light control|diffuser|\bhalo\b|spoof|controller|converter|adapter|connector|\busb\b|mcu|programm?er|capacitor|keycaps?\b/i;
// Variants in a PCB or plate listing often differ by hot-swap/solder or by material, and a finder needs each: one part per distinct value.
function splitBy(vs,keyOf,max=6) {
  const groups=new Map();
  for(const v of vs) {const k=keyOf(v); if(!groups.has(k)||v.price<groups.get(k).price) groups.set(k,v)}
  const stated=[...groups].filter(([k])=>k!==null);
  return (stated.length?stated:[...groups]).slice(0,max).map(([k,v])=>({key:k,v}));
}
function pcbRule(p) {
  const s=p.specs, n=p.name;
  if(JUNK.test(n)) return {reason:'not a keyboard part'};
  if(PCB_ACCESSORY.test(n)&&!/\bpcb\b.*\bdaughterboard/i.test(n)) return {accessory:true};
  if(/\bcases?\b/i.test(n)&&!/\bpcb\b.*\bcase\b|case\b.*\bpcb\b.*(?:and|&|\+)/i.test(n.replace(/for.*$/i,''))) return {reroute:'cases'};
  if(UNSUPPORTED_SYSTEM.test(n)) return {reason:'unsupported switch system (Topre/EC/Alps)'};
  if(NO_DRAW.test(n)) return {reason:"layout the builder can't draw"};
  const vs0=pool(p); if(!vs0.length) return {reason:'no PCB variant'};
  const vs1=vs0.filter(v=>!LOCALE.test(v.name)).length?vs0.filter(v=>!LOCALE.test(v.name)):vs0;
  // A daughterboard, cable or converter sold beside the PCB is not the PCB.
  const isPcb=v=>/\bpcb\b/i.test(v.name)||!/daughterboard|\bdb\b|\bjst\b|\bcable\b|converter|\bhub\b/i.test(v.name);
  let vs=vs1.filter(isPcb), soldOut=false;
  // Only the daughterboard is in stock: the PCB itself is sold out.
  if(!vs.length&&p.available) {vs=p.variants.filter(isPcb); soldOut=vs.length>0}
  if(!vs.length) return {accessory:true};
  const L=layoutsInName(n).length>1?null:layoutFromName(n)||builderLayout(s.layout,n), switchSystem=switchSystemOf(n)||s.switchSystem||null;
  const hot=v=>hotOf(v.name)??hotOf(n)??s.hotswap??null;
  const groups=splitBy(vs,hot);
  const parts=groups.map(({key,v})=>({...base(p,v),id:groups.length>1?p.id+'~'+v.id:p.id,name:shortName(n,cleanBrand(p))+(vs.length>1&&v.name!=='Default Title'?' · '+v.name:''),cat:'pcb',layout:L?L.layout:null,hotswap:key,pins:null,led:null,rgb:null,stabs:null,conn:connOf(v.name)||s.connection||connOf(n)||'Not listed',fit:null,...(switchSystem?{switchSystem}:{}),
    blurb:'Published retailer listing. Check the store for the exact layout and firmware.'}));
  return {soldOut,parts:parts.length===1?parts[0]:parts};
}
function plateRule(p) {
  const s=p.specs, n=p.name;
  if(/\bforks?\b/i.test(n)) return {accessory:true};
  if(/back\s*plate|badge plate|plate (?:support|holder)/i.test(n)) return {accessory:true};
  if(NO_DRAW.test(n)) return {reason:"layout the builder can't draw"};
  const vs0=pool(p); if(!vs0.length) return {reason:'no plate variant'};
  const vs=vs0.filter(v=>!LOCALE.test(v.name)).length?vs0.filter(v=>!LOCALE.test(v.name)):vs0;
  const L=layoutsInName(n).length>1?null:layoutFromName(n)||builderLayout(s.layout,n), switchSystem=switchSystemOf(n)||s.switchSystem||(/magnetic/i.test(vs.map(v=>v.name).join(' '))?'hall-effect':null);
  const mat=v=>plateMaterial(v.name,n,s.material,published(p,/plate material|^material$/i));
  const groups=splitBy(vs,mat);
  const parts=groups.map(({key,v})=>({...base(p,v),id:groups.length>1?p.id+'~'+v.id:p.id,name:shortName(n,cleanBrand(p))+(vs.length>1&&v.name!=='Default Title'?' · '+v.name:''),cat:'plate',layout:L?L.layout:null,material:key,plateStabs:null,fit:null,...(switchSystem?{switchSystem}:{}),
    blurb:'Published retailer listing. Check the store for the exact cutout and stabilizer fit.'}));
  return {parts:parts.length===1?parts[0]:parts};
}

const RULES={switches:switchesRule,keycaps:keycapsRule,stabs:stabsRule,extras:extrasRule,deskmats:extrasRule,keyboards:keyboardsRule,cases:casesRule,pcb:pcbRule,plate:plateRule};
// admit(p) → {parts:[...]} (with soldOut marked) or {reason}. Parts are plain records; nothing is invented.
function admitOnce(p) {
  let cat=route(p), r=RULES[cat]?RULES[cat](p):{reason:'no builder slot'};
  if(r.reroute) {cat=r.reroute; r=RULES[cat](p)}
  if(r.accessory) r=extrasRule(p);
  if(!r.parts) return {reason:r.reason||'not a keyboard part',cat};
  const many=Array.isArray(r.parts);
  const parts=[].concat(r.parts).map(x=>p.available&&!r.soldOut?x:{...x,soldOut:true,retailers:x.retailers.map(y=>({...y,available:false}))});
  return {parts,many,cat};
}
export function admit(p) {
  const r=admitOnce(p);
  // A listing that is in stock only through other variants (the base kit or the pack is sold out) is admitted from all its variants, marked sold out.
  if(!r.parts&&p.available&&p.variants.some(v=>!v.available)) {const again=admitOnce({...p,available:false}); if(again.parts) return again}
  return r;
}
// One listing → its builder part (or an array of parts when the listing sells several distinct switches/PCBs/plates), else null.
export function builderPart(p) {
  const r=admit(p); if(!r.parts) return null;
  r.parts=r.parts.map(part=>SwitchdeckNames.part(part));
  return r.many?r.parts:r.parts[0];
}

// ---- families: a case, a PCB and a plate sold for the same board ----
const FAMILY_GENERIC=/^(?:cases?|pcbs?|plates?|top|bottom|upper|lower|extras?|keyboards?|kits?|and|the|for|with|w|hot-?swap(?:pable)?|solder(?:ed|able)?|wired|wireless|tri-?mode|dual-?mode|aluminum|aluminium|brass|fr-?4|pc|polycarbonate|carbon|fiber|pom|full|half|ansi|iso|flex|cut|flex-?cut|non|non-flex|mount|layout|custom|mechanical|only|accessories|components|bare|set|standard|new|daughterboards?|jst|cable|rgb|qmk|via|stainless|steel|acrylic|plastic|abs|anodized|e-?white|pvd|mm|\d+(?:\.\d+)?(?:mm|u|%)?)$/i;
const FAMILY_REV=/^(?:v\d+(?:\.\d+)?|mk\s?[ivx\d]+|mkii+|r\d+|rev\.?\d*|\d+\.\d+|redux|lite|pro|max|mini|se|le|ee)$/i;
// "Savage65 Case", "Savage65 PCB" and "Savage65 Plates" share the family token "savage65". A revision word (V2, Redux, 3.0) must match too,
// so a Redux case is not paired with a 3.0 PCB.
export function familyOf(p) {
  const brand=cleanBrand(p).toLowerCase().split(/\s+/);
  let words=String(p.name).replace(/\[[^\]]*\]|\([^)]*\)/g,' ').replace(/[,:;|&+/]/g,' ').split(/\s+/).filter(Boolean);
  while(words.length>1&&brand.includes(words[0].toLowerCase())) words.shift();
  const sig=words.filter(w=>!FAMILY_GENERIC.test(w));
  const rev=sig.filter(w=>FAMILY_REV.test(w)).map(w=>w.toLowerCase()), model=sig.filter(w=>!FAMILY_REV.test(w));
  const token=model.find(w=>/\d/.test(w)&&/[a-z]/i.test(w))||model.find(w=>w.length>=3&&/^[A-Za-z]/.test(w))||model.find(w=>/\d/.test(w));
  if(!token) return null;
  return {token:token.toLowerCase(),rev:[...new Set(rev)].sort()};
}
// All parts for a set of listings, with `fit` filled in for every case/PCB/plate family that has all three members at one store.
// fit is `${sourceId}:${token}`; a revision word (V2, Redux) is appended only when two full families at one store share the token.
export function catalogParts(products) {
  const out=[], fam=new Map();
  for(const p of products) {
    const r=admit(p); if(!r.parts) continue;
    const f=['cases','pcb','plate'].includes(r.cat)?familyOf(p):null;
    for(const part of r.parts) {
      Object.assign(part,SwitchdeckNames.part(part));
      // Sound effects must always match the authoritative mod type after every catalog transform.
      if(part.cat==='extras') {
        if(part.mod&&MOD_TYPES[part.mod]) part.fx={...MOD_TYPES[part.mod].fx};
        else {delete part.mod;part.fx={}}
      }
      out.push(part);
      if(f&&((part.cat==='case'&&!part.kit)||part.cat==='pcb'||part.cat==='plate')) {
        const k=`${p.sourceId}:${f.token}${f.rev.length?'-'+f.rev.join('-'):''}`; if(!fam.has(k)) fam.set(k,{base:`${p.sourceId}:${f.token}`,case:[],pcb:[],plate:[]});
        fam.get(k)[part.cat==='case'?'case':part.cat].push(part);
      }
    }
  }
  const full=[...fam].filter(([,g])=>g.case.length&&g.pcb.length&&g.plate.length);
  const clash=new Map(); for(const [,g] of full) clash.set(g.base,(clash.get(g.base)||0)+1);
  for(const [k,g] of full) for(const part of [...g.case,...g.pcb,...g.plate]) part.fit=clash.get(g.base)>1?k:g.base;
  return out;
}
// Per directory category: how many listings, how many are admitted in stock / sold out, and why the rest are not.
export function admissionReport(products) {
  const rep={};
  for(const p of products) {
    const r=rep[p.category]??={total:0,admitted:0,soldOutAdmitted:0,excluded:{}};
    r.total++;
    const a=admit(p);
    if(a.parts) r[a.parts.every(x=>x.soldOut)?'soldOutAdmitted':'admitted']++;
    else r.excluded[a.reason]=(r.excluded[a.reason]||0)+1;
  }
  return rep;
}

export const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');


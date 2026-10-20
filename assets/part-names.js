/* Shared by the browser and catalog importer. Retailer titles remain source data. */
(() => {
  const tidy=s=>String(s??'').replace(/<[^>]*>/g,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
  const edge=s=>tidy(s).replace(/^[\s·|,;:–—/&-]+|[\s·|,;:–—/&-]+$/g,'');
  const status=/\b(?:group buy|pre[- ]?order|in[- ]?stock|extras|sale|restock|warehouse find|limited stock|coming soon|sold out)\b/i;
  const catOf=c=>({case:'keyboards',cases:'keyboards',plate:'plates',pcb:'pcbs'}[c]||c);
  const cut=(s,re)=>{const m=re.exec(s);return m&&m.index>0?edge(s.slice(0,m.index)):s};
  const compact=(s,max)=>{if(s.length<=max)return s;const words=s.split(' '),out=[];for(const w of words){if(out.length&&[...out,w].join(' ').length>max)break;out.push(w)}return edge(out.join(' '))};
  function core(value,category) {
    let s=tidy(value).replace(/\[([^\]]+)\]|\(([^)]+)\)/g,(all,a,b)=>status.test(a||b)?' ':all);
    const revisions=['switches','keyboards'].includes(category)?s.match(/\b(?:V\d+(?:\.\d+)?|Rev\.?\s*\d+|Version\s+\d+)\b/gi)||[]:[];
    s=s.replace(/^(?:(?:group buy|pre[- ]?order|in[- ]?stock|warehouse find|sale)\s*[:–—-]?\s*)+/i,'');
    s=cut(s,/\s+(?:for|compatible with|designed for|suitable for|fits|with light diffuser)\b/i);
    if(category==='keycaps') {
      s=s.replace(/^(?:(?:ISO|ANSI|[QKV]\d+(?:\s+(?:Pro|Max|HE))?)\s*(?:&\s*)?)+/i,'');
      // Many stores put the actual colourway after the generic specification block.
      const chunks=s.split(/\s+[–—|-]\s+/);
      const names=chunks.map(x=>edge(x.replace(/\b(?:double[ -]?shot|dye[ -]?sub(?:limated)?|shine[- ]?through|side[- ]?print(?:ed)?|thick)\b/gi,' ').replace(/\b(?:Cherry|OEM|Cubic OEM|XDA|DSA|SA|MT3|KAT|KAM|DSS|DCS|DCX|ASA|OSA|MDA|MOA)\s+profile\b/gi,' ').replace(/\b(?:PBT|ABS|plastic|full|\d{2,3}[- ]?keys?)\b/gi,' ')));
      s=names.map(x=>cut(x,/\s+keycaps?(?:\s+set)?\b|\s+colorway\b|\s+(?:mechanical|gaming)\s+keyboard\b|\s+keyboard\b/i)).filter(Boolean).join(' ');
      // A compatibility list is not a keycap set's model name.
      s=s.replace(/^Set\s+|\s+Set(?=\s*\/|$)/gi,'');
    } else if(category==='switches') {
      s=cut(s,/\s+\d+\s*[- ]?pins?\b|\s+(?:SMD|RGB)\b/i);
      s=cut(s,/\s+(?:linear|tactile|clicky)?\s*switch(?:es)?\b/i);
    } else if(category==='keyboards') {
      s=cut(s,/\s+(?:QMK(?:\/VIA)?|VIA|wired|wireless|tri[- ]mode|hot[- ]?swap(?:pable)?|barebones?|mechanical|gaming|custom|keyboard|diy\s+kit)\b/i);
    } else if(category==='stabs') {
      s=cut(s,/\s+stabili[sz]ers?\b/i);
      s=cut(s,/\s+(?:gold\s+plated|PCB\s+screw|plate\s+mount)/i);
    } else {
      s=cut(s,/\s+(?:custom\s+)?(?:mechanical|gaming)\s+keyboard\b/i);
      s=cut(s,/\s+\d+(?:\.\d+)?g\s+\d+(?:\.\d+)?g\b/i);
    }
    s=s.replace(/\s+\(?\d+\s*(?:pcs|pieces|pack|in\s+1)\)?\s*$/i,'');
    for(const rev of revisions)if(!s.toLowerCase().includes(rev.toLowerCase()))s+=' '+rev;
    return edge(s);
  }
  function name(value,category='',brand='') {
    const raw=tidy(value),cat=catOf(category);
    const b=tidy(brand),stripBrand=s=>b&&s.toLowerCase().startsWith(b.toLowerCase()+' ')?s.slice(b.length).trim():s;
    const segments=raw.split(/\s+[·–—]\s+/), first=core(stripBrand(segments.shift()),cat);
    let main=first||edge(raw.split(/\s+[·–—]\s+/)[0]);
    // Brand is rendered separately in cards. Match whole prefix words, never substrings.
    main=stripBrand(main);
    main=compact(main,48);
    const variants=segments.map(v=>core(v,cat)).map(v=>edge(v.replace(/\b(?:Default Title)\b/gi,''))).filter(Boolean);
    const unique=[];
    for(let v of variants){if(v.toLowerCase().startsWith(main.toLowerCase()+' '))v=edge(v.slice(main.length));v=compact(v,28);if(v&&v.toLowerCase()!==main.toLowerCase()&&!unique.some(x=>x.toLowerCase()===v.toLowerCase()))unique.push(v)}
    return main+(unique.length?' · '+unique.join(' / '):'');
  }
  function part(p) {return {...p,sourceName:p.sourceName||p.name,name:name(p.sourceName||p.name,p.cat||p.category,p.brand)}}
  globalThis.SwitchdeckNames=Object.freeze({name,part});
})();

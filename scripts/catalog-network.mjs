export const CATALOG_AGENT='ThockCatalog/1.0 (+https://thock.cc)';

export async function getJSON(url,{request=fetch,pause=ms=>new Promise(r=>setTimeout(r,ms)),attempts=4}={}) {
  let last;
  for(let i=0;i<attempts;i++) {
    let retry=true, delay=1000*(i+1);
    try {
      const r=await request(url,{headers:{'User-Agent':CATALOG_AGENT},signal:AbortSignal.timeout(45000)});
      if(r.ok) return await r.json();
      retry=r.status===429||r.status>=500;
      const after=r.headers.get('retry-after');
      const seconds=Number(after);
      if(after) delay=Number.isFinite(seconds)?seconds*1000:Math.max(0,Date.parse(after)-Date.now());
      last=Error(url+': HTTP '+r.status);
    } catch(e) {last=e}
    if(!retry||i===attempts-1) throw last;
    await pause(Math.min(15000,Math.max(0,delay)||1000));
  }
}

export function feedAllowed(text,agent=CATALOG_AGENT,target='/products.json') {
  const groups=[];let group=null;
  for(const raw of text.split('\n')) {
    const m=raw.replace(/#.*/,'').trim().match(/^(user-agent|disallow|allow)\s*:\s*(.*)$/i);if(!m)continue;
    if(m[1].toLowerCase()==='user-agent') {
      if(!group||group.rules.length){group={agents:[],rules:[]};groups.push(group)}
      group.agents.push(m[2].toLowerCase());
    } else if(group&&m[2]) group.rules.push({allow:m[1].toLowerCase()==='allow',pattern:m[2]});
  }
  const matches=groups.map(g=>({...g,specificity:Math.max(-1,...g.agents.map(a=>a==='*'?0:agent.toLowerCase().includes(a)?a.length:-1))}));
  const specificity=Math.max(-1,...matches.map(g=>g.specificity));
  const rules=matches.filter(g=>g.specificity===specificity&&specificity>=0).flatMap(g=>g.rules);
  const escape=s=>s.replace(/[.+?^${}()|[\]\\]/g,'\\$&');
  const matching=rules.filter(r=>{
    const end=r.pattern.endsWith('$'),p=end?r.pattern.slice(0,-1):r.pattern;
    return new RegExp('^'+p.split('*').map(escape).join('.*')+(end?'$':'')).test(target);
  }).sort((a,b)=>b.pattern.replace(/[*$]/g,'').length-a.pattern.replace(/[*$]/g,'').length||Number(b.allow)-Number(a.allow));
  return !matching.length||matching[0].allow;
}

export async function allowed(source) {
  const r=await fetch(source.url+'/robots.txt',{headers:{'User-Agent':CATALOG_AGENT},signal:AbortSignal.timeout(20000)});
  if(r.status===404)return;
  if(!r.ok)throw Error('Cannot verify robots.txt: '+r.status);
  const text=await r.text();
  if(!feedAllowed(text)||!feedAllowed(text,CATALOG_AGENT,'/products.json?limit=250&page=1'))throw Error('Product feed disallowed by robots.txt');
}

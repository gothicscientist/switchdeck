/* Shared browser/Node purchase-link policy. No homepages or search fallbacks. */
(()=>{
  function productURL(value){
    try{
      const u=new URL(value);
      if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
      const host=u.hostname.toLowerCase();
      if(/^(?:www\.)?amazon\.com$/.test(host)){
        const asin=u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i)?.[1];
        return asin?'https://www.amazon.com/dp/'+asin.toUpperCase():null;
      }
      if(!/\/(?:products?|buy)\/[^/]+/i.test(u.pathname)||/\/(?:search|collections?|categories?|stores?|pages)(?:\/|$)/i.test(u.pathname)||/\.(?:json|js|png|jpg|webp)$/i.test(u.pathname))return null;
      if([...u.searchParams.keys()].some(k=>/^(?:q|query|search|s|k|url|redirect)$/i.test(k)))return null;
      for(const k of [...u.searchParams.keys()])if(/^(?:utm_|srsltid|fbclid|gclid|ref$|ref_|tag$)/i.test(k))u.searchParams.delete(k);
      u.hash='';return u.href;
    }catch{return null}
  }
  const isAmazon=url=>{try{return /^(?:www\.)?amazon\.com$/.test(new URL(url).hostname)}catch{return false}};
  function orderLinks(links=[]){
    const out=[],seen=new Set();
    for(const r of links){const url=productURL(r?.url);if(!url||seen.has(url))continue;seen.add(url);
      const name=isAmazon(url)?'Amazon':r.name||new URL(url).hostname.replace(/^www\./,'');
      out.push({...r,name,url});
    }
    return out.sort((a,b)=>Number(a.available===false)-Number(b.available===false)||storeRank(a.url)-storeRank(b.url));
  }
  // Store preference for the same product: Amazon, then stores with an affiliate code, then the rest.
  // Sold-out links still go last, so a shopper is never sent to a sold-out page ahead of one that can sell it.
  function storeRank(url,cfg=globalThis.SWITCHDECK_AFFILIATES||{}){return isAmazon(url)?0:affiliateFor(url,cfg)!==url?1:2}
  // The link a shopper follows: the canonical product URL with the store's affiliate tag, when one is set.
  function affiliateFor(url,cfg=globalThis.SWITCHDECK_AFFILIATES||{}){
    try{
      const u=new URL(url), a=cfg[u.hostname.toLowerCase().replace(/^www\./,'')];
      if(!a)return url;
      if(a.wrap)return a.wrap.includes('{url}')?a.wrap.replace('{url}',encodeURIComponent(url)):url;
      if(!a.param||!a.code)return url;
      u.searchParams.set(a.param,a.code);return u.href;
    }catch{return url}
  }
  const isAffiliate=url=>affiliateFor(url)!==url;
  const hasAffiliates=(cfg=globalThis.SWITCHDECK_AFFILIATES||{})=>Object.values(cfg).some(a=>a&&(a.wrap||a.param&&a.code));
  function linksFor(p,registry=globalThis.SWITCHDECK_PRODUCT_LINKS||{}){
    if(!p)return [];
    const id=p.catalogId||p.id?.split('~')[0];
    return orderLinks([...(p.id===id?registry[p.id]||[]:[]),...(p.retailers||[]),...(p.id===id?[]:[...(registry[p.id]||[]),...(registry[id]||[])]),
      ...(p.url?[{name:p.retailer||p.brand,url:p.url,available:p.available}]:[]),
      ...(p.photo?.page?[{name:p.brand,url:p.photo.page}]:[])]).map(r=>({...r,href:affiliateFor(r.url)}));
  }
  globalThis.SwitchdeckLinks={productURL,isAmazon,storeRank,orderLinks,linksFor,affiliateFor,isAffiliate,hasAffiliates};
})();

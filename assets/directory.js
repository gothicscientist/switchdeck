/* Lazy-loaded factual retailer directory. No product HTML is inserted into the DOM. */
(() => {
  const labels={keyboards:'Keyboards & kits',cases:'Cases',pcb:'PCBs',plate:'Plates',switches:'Switches',keycaps:'Keycaps',stabs:'Stabilizers',extras:'Mods, tools & cables',deskmats:'Deskmats'};
  const fields={type:'Switch type',system:'Switch system',pins:'Pins',actuationForceG:'Actuation force (g)',bottomOutForceG:'Bottom-out force (g)',totalTravelMm:'Total travel (mm)',preTravelMm:'Pre-travel (mm)',topHousing:'Top housing',bottomHousing:'Bottom housing',stemMaterial:'Stem material',factoryLubed:'Factory lubed',profile:'Profile',material:'Material',legends:'Legends',keyCount:'Key count',layout:'Layout (%)',mount:'Mount',hotswap:'Hot-swap',connection:'Connection',switchSystem:'Switch system'};
  const state={index:null,manifest:null,loading:null,q:'',category:'all',source:'all',brand:'all',system:'all',stock:false,builder:false,max:null,sort:'stock',page:1};
  const shards=new Map();let detailRequest=0,previousFocus=null;
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const price=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
  const safeURL=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:'#'}catch{return '#'}};
  const purchaseLinks=p=>globalThis.SwitchdeckLinks.linksFor(p).map(r=>`<a class="btn small" href="${esc(r.href||r.url)}" target="_blank" rel="sponsored noopener noreferrer">${esc(r.name)}${r.available===false?', sold out':''} ↗</a>`).join('');
  const shortSpecs=p=>Object.entries(p.specs||{}).slice(0,4).map(([k,v])=>`${fields[k]||k}: ${typeof v==='boolean'?(v?'Yes':'No'):v}`).join(', ');
  const isBuilder=(p,url)=>window.SwitchdeckBuilder?.has(p.id,url)||false;
  async function json(file){const r=await fetch(new URL('data/'+file,document.baseURI),{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Catalog request failed ('+r.status+')');return r.json()}
  function image(src,cls,alt){return `<img class="${cls}" src="${esc(safeURL(src))}" alt="${esc(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`}
  // A photo that fails to load is swapped for a plain keyboard outline, not a broken-image box.
  const FALLBACK='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><rect x="8" y="14" width="104" height="34" rx="6" fill="none" stroke="#a8a29e" stroke-width="2"/><g fill="#d6d3d1">'+Array.from({length:30},(_,i)=>`<rect x="${14+(i%10)*9.4}" y="${19+Math.floor(i/10)*8.5}" width="7" height="6.5" rx="1.2"/>`).join('')+'</g></svg>');
  function wireImages(root){root.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.classList.add('directory-photo-error');img.src=FALLBACK;img.alt='Photo unavailable: '+img.alt},{once:true}))}
  function options(values,current){return values.map(([value,label])=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`).join('')}
  async function open() {
    const root=$('#directory-root');
    if(state.index){shell();return}
    root.innerHTML='<div class="card directory-error" role="status">Loading the parts directory…</div>';
    try {
      state.loading ||= Promise.all([json('catalog-index.json'),json('catalog-manifest.json')]);
      const [index,manifest]=await state.loading;state.index=index.map(p=>SwitchdeckNames.part(p));state.manifest=manifest;shell();
    }catch(e){state.loading=null;root.innerHTML='<div class="card directory-error" role="alert"><h2>The directory couldn’t load.</h2><p>Check your connection, then try again.</p><button class="btn" id="directory-retry">Try again</button></div>';$('#directory-retry').onclick=open}
  }
  function shell() {
    const m=state.manifest, root=$('#directory-root');
    root.innerHTML=`<header class="directory-head"><h1>Parts directory</h1><p>${m.listingCount.toLocaleString()} retailer listings across ${m.sources.length} stores. Real product photos, published specs, and direct links.</p><span class="note">Checked ${esc(new Date(m.generatedAt).toLocaleDateString())}. Prices in USD, before shipping and tax. Listings may include base, add-on, and preorder variants.${globalThis.SwitchdeckLinks.hasAffiliates()?' Some store links are affiliate links. We may earn a commission when you buy through them, at no extra cost to you.'+(globalThis.SWITCHDECK_AFFILIATES?.['amazon.com']?.code?' As an Amazon Associate we earn from qualifying purchases.':''):''}</span></header>
      <div class="directory-categories" aria-label="Part category">${[['all','All parts'],...Object.entries(labels)].map(([k,v])=>`<button class="btn small" data-category="${k}" aria-pressed="${state.category===k}">${v}${k==='all'?'':` <span class="note">${m.categories[k]?.count||0}</span>`}</button>`).join('')}</div>
      <div class="directory-tools"><input id="directory-q" type="search" placeholder="Search names, brands, and specifications" aria-label="Search parts" value="${esc(state.q)}"><select id="directory-source" aria-label="Retailer">${options([['all','All retailers'],...m.sources.map(s=>[s.id,s.name])],state.source)}</select><select id="directory-brand" aria-label="Brand">${options([['all','All brands'],...[...new Set(state.index.map(p=>p.brand))].sort().map(b=>[b,b])],state.brand)}</select>
      <select id="directory-system" aria-label="Switch system">${options([['all','All switch systems'],['mx-mechanical','MX mechanical'],['hall-effect','Hall effect'],['optical','Optical'],['low-profile','Low profile'],['unknown','System not published']],state.system)}</select><label>Max $<input id="directory-max" type="number" min="0" step="1" placeholder="Any" value="${state.max??''}" aria-label="Maximum listing price in USD"></label><select id="directory-sort" aria-label="Sort parts">${options([['stock','Available first'],['price','Price: low to high'],['name','Name A–Z']],state.sort)}</select>
      <label><input id="directory-stock" type="checkbox" ${state.stock?'checked':''}> Available to order</label><label><input id="directory-builder" type="checkbox" ${state.builder?'checked':''}> Ready for builder</label><button class="btn small" id="directory-clear">Clear filters</button></div><div id="directory-count" class="directory-count" role="status" aria-live="polite"></div><div id="directory-grid" class="directory-grid"></div><button class="btn directory-more" id="directory-more" hidden>Show more parts</button><p class="directory-source">Prices are per retailer listing or selected pack, not per individual switch. Retailers can list the same product separately. Missing specifications stay unknown; check the exact variant and fit before buying. <a href="data/catalog-manifest.json" target="_blank" rel="noopener">Sources & freshness</a></p>`;
    root.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{state.category=b.dataset.category;state.page=1;shell()});
    let timer;$('#directory-q').oninput=e=>{state.q=e.target.value;clearTimeout(timer);timer=setTimeout(()=>{state.page=1;render()},140)};
    for(const [id,key] of [['source','source'],['brand','brand'],['system','system'],['sort','sort']])$('#directory-'+id).onchange=e=>{state[key]=e.target.value;state.page=1;render()};
    $('#directory-max').oninput=e=>{state.max=e.target.value===''?null:Math.max(0,Number(e.target.value));state.page=1;render()};
    for(const key of ['stock','builder'])$('#directory-'+key).onchange=e=>{state[key]=e.target.checked;state.page=1;render()};
    $('#directory-clear').onclick=()=>{Object.assign(state,{q:'',category:'all',source:'all',brand:'all',system:'all',stock:false,builder:false,max:null,sort:'stock',page:1});shell()};
    $('#directory-more').onclick=()=>{state.page++;render()};render();
  }
  function render() {
    const words=state.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const list=state.index.filter(p=>{
      if(state.category!=='all'&&p.category!==state.category)return false;
      if(state.source!=='all'&&p.sourceId!==state.source)return false;
      if(state.brand!=='all'&&p.brand!==state.brand)return false;
      if(state.system!=='all'&&(p.category!=='switches'||(p.specs.system||'unknown')!==state.system))return false;
      if(state.stock&&!p.available||state.builder&&!isBuilder(p)||state.max!==null&&p.price>state.max)return false;
      const hay=(p.name+' '+p.sourceName+' '+p.brand+' '+p.retailer+' '+Object.values(p.specs).join(' ')).toLowerCase();return words.every(w=>hay.includes(w));
    });
    list.sort(state.sort==='price'?(a,b)=>a.price-b.price:state.sort==='name'?(a,b)=>a.name.localeCompare(b.name):(a,b)=>Number(b.available)-Number(a.available)||a.name.localeCompare(b.name));
    const shown=list.slice(0,state.page*48);
    $('#directory-count').textContent=`Showing ${shown.length.toLocaleString()} of ${list.length.toLocaleString()} listings`;
    const grid=$('#directory-grid');
    grid.innerHTML=shown.length?shown.map(p=>`<article class="card directory-card">${image(p.image,'directory-photo',p.name)}<span class="note">${esc(labels[p.category])} from ${esc(p.brand)}</span><h2>${esc(p.name)}</h2><span class="directory-specs">${esc(shortSpecs(p)||'Specifications not published in retailer feed')}</span><div><span class="directory-price">${p.priceMax>p.price?'From ':''}${price(p.price)}</span> <span class="directory-stock ${p.available?'available':''}">${p.available?'Available':'Unavailable'}</span></div><span class="note">Sold by ${esc(p.retailer)}</span><div class="directory-actions"><button class="btn small" data-detail="${esc(p.id)}">Details & variants</button>${purchaseLinks(p)}${isBuilder(p)?`<button class="btn small primary" data-builder="${esc(p.id)}">Add to build</button>`:''}</div></article>`).join(''):'<div class="card directory-empty"><h2>No parts match.</h2><p>Try another search or clear a filter.</p></div>';
    wireImages(grid);grid.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>detail(b.dataset.detail));grid.querySelectorAll('[data-builder]').forEach(b=>b.onclick=()=>detail(b.dataset.builder));
    $('#directory-more').hidden=shown.length>=list.length;
  }
  async function detail(id) {
    const item=state.index.find(p=>p.id===id);if(!item)return;
    const request=++detailRequest;previousFocus=document.activeElement;
    let dialog=$('#directory-dialog');
    if(!dialog){dialog=document.createElement('dialog');dialog.id='directory-dialog';dialog.className='directory-dialog';document.body.append(dialog);dialog.addEventListener('close',()=>{detailRequest++;previousFocus?.focus()});dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()})}
    dialog.innerHTML='<button class="btn small directory-close" aria-label="Close product details">Close</button><div role="status">Loading product details…</div>';dialog.querySelector('button').onclick=()=>dialog.close();if(!dialog.open)dialog.showModal();
    try {
      if(!shards.has(item.shard))shards.set(item.shard,json(item.shard).catch(e=>{shards.delete(item.shard);throw e}));
      const raw=(await shards.get(item.shard)).find(p=>p.id===id);const p=raw&&SwitchdeckNames.part(raw);if(request!==detailRequest||!dialog.open)return;if(!p)throw Error('Product missing from shard');
      const variants=[...p.variants].sort((a,b)=>Number(b.available)-Number(a.available)||a.price-b.price);let v=variants[0];
      dialog.innerHTML=`<button class="btn small directory-close" aria-label="Close product details">Close</button><div class="directory-detail"><div>${image(p.images[0],'directory-main-photo',p.name)}<div class="directory-gallery">${p.images.map((src,i)=>`<button data-gallery="${i}" aria-label="View image ${i+1}">${image(src,'',p.name+' photo '+(i+1))}</button>`).join('')}</div></div><div><span class="note">${esc(p.brand)}, sold by ${esc(p.retailer)}</span><h2 id="directory-detail-title">${esc(p.name)}</h2><label for="directory-variant">Choose exact variant</label><select id="directory-variant">${variants.map((v,i)=>`<option value="${i}">${esc(v.name)}, ${price(v.price)}${v.available?'':', unavailable'}</option>`).join('')}</select><div id="directory-variant-price"></div><a id="directory-buy" class="btn primary" target="_blank" rel="sponsored noopener noreferrer">View this variant ↗</a><div class="directory-actions">${purchaseLinks(p)}</div>${isBuilder(p)?'<button class="btn" id="directory-add">Add to build</button>':''}<h3>Published specifications</h3><dl>${Object.entries(p.specs).map(([k,v])=>`<dt>${esc(fields[k]||k)}</dt><dd>${esc(typeof v==='boolean'?(v?'Yes':'No'):v)}</dd>`).join('')||'<dt>Details</dt><dd>Not published in feed</dd>'}</dl><details><summary>More retailer specifications</summary><dl>${Object.entries(p.publishedSpecs||{}).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></details>${p.missingFields.length?`<p class="note">Not published: ${p.missingFields.map(k=>esc(fields[k]||k)).join(', ')}.</p>`:''}<p class="directory-source">Checked ${esc(new Date(p.checkedAt).toLocaleString())}. Retailer-published information; not independently measured. Confirm kit contents, stock and compatibility on the product page.${p.category==='keycaps'?' Base, novelty, accent, and spacebar kits are separate variants; a low starting price may be for an add-on.':''}${p.category==='switches'?' Hall effect, optical and low-profile parts require matching PCBs. MX-style stems alone do not establish compatibility.':''}</p></div></div>`;
      dialog.setAttribute('aria-labelledby','directory-detail-title');dialog.querySelector('.directory-close').onclick=()=>dialog.close();
      const update=()=>{v=variants[Number($('#directory-variant').value)];$('#directory-variant-price').textContent=`${price(v.price)}, ${v.available?'available to order':'unavailable'}${v.quantity?`, ${v.quantity} per pack at ${price(v.unitPrice)} each`:''}`;$('#directory-buy').href=globalThis.SwitchdeckLinks.affiliateFor(safeURL(v.url));const add=$('#directory-add');if(add){add.disabled=!isBuilder(p,v.url);add.textContent=add.disabled?'Variant not supported in builder':'Add this variant to build'}if(v.image)dialog.querySelector('.directory-main-photo').src=safeURL(v.image)};
      $('#directory-variant').onchange=update;update();
      dialog.querySelectorAll('[data-gallery]').forEach(b=>b.onclick=()=>dialog.querySelector('.directory-main-photo').src=safeURL(p.images[+b.dataset.gallery]));
      const add=$('#directory-add');if(add)add.onclick=()=>{dialog.close();window.SwitchdeckBuilder.add(p.id,v.url)};wireImages(dialog);
    }catch(e){if(request!==detailRequest)return;dialog.innerHTML=`<button class="btn directory-close">Close</button><p role="alert">Details couldn’t load. You can still view the original listing.</p><a class="btn primary" href="${esc(globalThis.SwitchdeckLinks.affiliateFor(safeURL(item.url)))}" target="_blank" rel="noopener noreferrer">Visit retailer ↗</a>`;dialog.querySelector('button').onclick=()=>dialog.close()}
  }
  window.SwitchdeckDirectory={open};
})();

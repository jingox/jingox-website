/* ============================================================
   JINGOX — main.js
   - Product catalog rendering (js/products.js)
   - Collection filters + search
   - Product detail template (?sku=)
   - WhatsApp / email intent links
   - Inquiry form (Web3Forms) + FAQ + mobile nav
   P4: Web3Forms inquiry form is connected (sends to info@jingox.com).
   P4: Business WhatsApp is connected (US +1 508 763 7390 -> wa.me/15087637390).
   ============================================================ */

const CFG = {
  brand: "JINGOX",
  email: "info@jingox.com",
  // Business WhatsApp, digits only, country code + number (US +1 508 763 7390)
  whatsapp: "15087637390",
  // Web3Forms access key (https://web3forms.com, public client-side key)
  web3formsKey: "2918e864-3ffb-4b3c-913e-6fc4dd27cd94",
  // OEM / ODM & logistics facts — 2026-10-21 审核会议 D5。
  // 晶 2026-10-21 确认：打样 7 天、大货最长 25 天、付款后 5 天内发货；
  // paymentTerm 暂缓（待收款渠道确认后单独补）。
  oem: {
    sampleLeadTime: "7 days",            // 打样周期
    massLeadTime: "Up to 25 days",       // 大货交期（最长 25 天）
    expressShipping: "Within 5 days after payment", // 快递发货时间
    paymentTerm: ""                       // 付款方式：暂缓，待收款渠道确认
  }
};

const TYPE_ORDER = ["Charging Dock","Cooling Stand","Storage Stand","Somatosensory",
  "Faceplate","Switch Lite Accessories","Protective Case","Storage Bag","Other"];
const PLATFORMS = [
  {key:"switch2", name:"Nintendo Switch 2"},
  {key:"switch",  name:"Nintendo Switch"},
  {key:"ps5",     name:"PS5 / PS5 Slim / PS5 Pro"},
  {key:"ps4",     name:"PS4 / PS4 Pro / PS4 Slim"},
  {key:"xbox",    name:"Xbox Series X / Series S"},
  {key:"vr",      name:"VR / Meta Quest 2 / 3"},
  {key:"steamdeck", name:"Steam Deck", soon:true},
  {key:"others",  name:"Others / Universal"}
];
const FEATURED_SKUS = ["HBS-2801","HBS-2949","HA-8008","HBS-115",
  "HBP-253B/W","HBV-599","HA-8010","HBX-280"];

const PRODUCTS = (window.PRODUCTS || []);
const bySku = Object.fromEntries(PRODUCTS.map(p => [p.sku, p]));

/* ---------- helpers ---------- */
function esc(s){
  return String(s==null?"":s).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function waReady(){
  return /^\d{8,}$/.test((CFG.whatsapp||"").replace(/\D/g,'')) && !CFG.whatsapp.includes("{{");
}
function waLink(text){
  if(!waReady()){ return "contact.html"; }
  return "https://wa.me/" + CFG.whatsapp.replace(/\D/g,'') + "?text=" + encodeURIComponent(text);
}
function productWaText(p){
  const sn = p.shortName || p.name;
  return `Hi, I'm interested in ${sn} (${p.sku}). Could you send me your latest quotation, MOQ and lead time? Thanks.`;
}
/* platform short name for short Meta titles */
const PLATFORM_SHORT = {switch2:"Switch 2", switch:"Switch", ps5:"PS5", ps4:"PS4",
  xbox:"Xbox", vr:"VR", steamdeck:"Steam Deck", others:""};
/* colors offered by a product, parsed from p.color ("Black,White" -> ["Black","White"]) */
function productColors(p){
  return String(p.color||"").split(",").map(s=>s.trim()).filter(Boolean);
}
/* classify images: main / detail / packaging (packaging file is named *packaging*) */
function classifyImages(p){
  const imgs = p.images || [];
  const packaging = imgs.filter(x=>/packaging/i.test(x.src));
  const main = imgs.filter(x=>x.kind!=='detail' && !/packaging/i.test(x.src));
  const detail = imgs.filter(x=>x.kind==='detail' && !/packaging/i.test(x.src));
  return {main, detail, packaging};
}
/* main photos for a given color (lowercase). Images without color field show for all colors. */
function mainForColor(p, color){
  const c = String(color||"").toLowerCase();
  return classifyImages(p).main.filter(x=>!x.color || x.color==='all' || x.color===c);
}
/* feature bullets: prefer the dedicated p.features data, else fall back to extraction */
function productFeatures(p){
  if(p.features && p.features.length) return p.features.slice(0,4);
  return extractFeatures(p);
}
/* SKUs that have real certificate images in images/certificates (11 SKUs) */
const CERT_SKUS = ["HA-8008","HBP-119","HBP-253","HBP-314","HB-P4002B",
  "HBP-537","HBP-656","HBS-2846","HBS-2872","HBV-599","HBV-641"];
function certImgsFor(p){
  let cs = CERT_SKUS.find(s=>s===p.sku);
  if(!cs) cs = CERT_SKUS.find(s=>p.sku.startsWith(s));
  if(!cs) return [];
  return [
    {src:"images/certificates/"+cs+"-emc.jpg", alt:cs+" EMC test report"},
    {src:"images/certificates/"+cs+"-rohs.jpg", alt:cs+" RoHS test report"}
  ];
}
function mailLink(subject){
  return `mailto:${CFG.email}?subject=${encodeURIComponent(subject)}`;
}
function phIcon(size){
  return `<svg class="ph-svg" viewBox="0 0 64 64" width="${size||72}" height="${size||72}" aria-hidden="true">
    <path d="M44 22H20C13 22 8 27 8 34c0 6 4 11 9 11 3 0 4-2 5-4h8c1 2 2 4 5 4 5 0 9-5 9-11 0-7-5-12-12-12z"/>
    <path d="M19 31v6M16 34h6"/>
    <circle cx="42" cy="32" r="1.7" fill="currentColor" stroke="none"/>
    <circle cx="45.5" cy="36" r="1.7" fill="currentColor" stroke="none"/>
  </svg>`;
}
function countBy(key, val){ return PRODUCTS.filter(p=>p[key]===val).length; }
function hasImgs(p){ return !!(p.images && p.images.length); }
/* 阶段3：每款独立静态页 URL。SKU 转 slug：小写，非字母数字/连字符统一替换为 "-"
   （如 HBP-253B/W -> product-hbp-253b-w.html） */
function productSlug(sku){ return String(sku).toLowerCase().replace(/[^a-z0-9-]/g, '-'); }
function productUrl(p){ return `product-${productSlug(p.sku)}.html`; }
function plainText(s){
  return String(s==null?"":s).replace(/^-\s+/gm,'').replace(/\*\*/g,'').replace(/\s+/g,' ').trim();
}
function setMeta(name, content){
  let el = document.querySelector('meta[name="'+name+'"]');
  if(!el){ el = document.createElement('meta'); el.setAttribute('name',name); document.head.appendChild(el); }
  el.setAttribute('content', content);
}
function setOg(prop, content){
  let el = document.querySelector('meta[property="'+prop+'"]');
  if(!el){ el = document.createElement('meta'); el.setAttribute('property',prop); document.head.appendChild(el); }
  el.setAttribute('content', content);
}
function setCanonical(href){
  let el = document.querySelector('link[rel="canonical"]');
  if(!el){ el = document.createElement('link'); el.setAttribute('rel','canonical'); document.head.appendChild(el); }
  el.setAttribute('href', href);
}
function injectProductSchema(p){
  const data = {
    "@context":"https://schema.org","@type":"Product",
    "name":p.name,
    "sku":p.sku,
    "mpn":p.sku,
    "category":[p.platformName, p.type].filter(Boolean).join(" "),
    "description":plainText(p.desc),
    "brand":{"@type":"Brand","name":"JINGOX"},
    "manufacturer":{"@type":"Organization","name":"Shenzhen Zhimi Technology Co., Ltd."}
  };
  if(hasImgs(p)){
    data.image = p.images.map(x => "https://jingox.com/"+x.src);
  }
  // B2B inquiry catalog: prices are on request, so no numeric Offer/price is published.
  const s = document.createElement('script');
  s.type = "application/ld+json";
  s.textContent = JSON.stringify(data);
  document.head.appendChild(s);
}

/* ---------- product card ---------- */
function productCard(p){
  const wa = waLink(productWaText(p));
  const mail = mailLink(`Inquiry: ${p.sku} ${p.name}`);
  return `<article class="product-card" data-platform="${esc(p.platformKey)}" data-type="${esc(p.type)}"
      data-search="${esc((p.sku+' '+p.name+' '+p.platformName+' '+p.type).toLowerCase())}">
    <a class="product-ph${hasImgs(p)?' has-img':''}" href="${productUrl(p)}" aria-label="${esc(p.name)}">
      ${hasImgs(p)
        ? `<img class="product-img" src="${esc(p.images[0].src)}" alt="${esc(p.images[0].alt)}" loading="lazy" decoding="async" width="800" height="800">`
        : `${phIcon(74)}<span class="ph-sku">${esc(p.sku)}</span><span class="ph-type">${esc(p.type)}</span>`}
    </a>
    <div class="product-body">
      <a class="product-name" href="${productUrl(p)}">${esc(p.name)}</a>
      <div class="product-tag"><span class="platform-tag">${esc(p.platformName)}</span></div>
      <div class="product-actions">
        <a class="pa-wa" target="_blank" rel="noopener" href="${wa}">WhatsApp</a>
        <a class="pa-mail" href="${mail}">Email</a>
      </div>
    </div>
  </article>`;
}

/* home screen-3b: simplified featured carousel card (no price, no inline actions) */
function featCard(p){
  return `<article class="feat-card">
    <a class="feat-img" href="${productUrl(p)}" aria-label="${esc(p.name)}">
      ${hasImgs(p)
        ? `<img src="${esc(p.images[0].src)}" alt="${esc(p.images[0].alt)}" loading="lazy" decoding="async">`
        : phIcon(64)}
    </a>
    <div class="feat-body">
      <span class="feat-tag">${esc(p.platformName)}</span>
      <a class="feat-name" href="${productUrl(p)}">${esc(p.name)}</a>
      <a class="feat-detail" href="${productUrl(p)}">View Details →</a>
    </div>
  </article>`;
}

/* ---------- mobile nav ---------- */
function initNav(){
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav-menu');
  if(toggle && menu){
    toggle.addEventListener('click', ()=>{
      menu.classList.toggle('open');
      toggle.classList.toggle('open');
    });
  }
  document.querySelectorAll('.has-drop > .drop-trigger').forEach(t=>{
    t.addEventListener('click', e=>{
      if(window.innerWidth<=760){ e.preventDefault(); t.parentElement.classList.toggle('open'); }
    });
  });
  setActiveNav();
}

/* 当前页导航高亮（依据 body data-page）*/
function setActiveNav(){
  const page = document.body.dataset.page || '';
  const menu = document.querySelector('.nav-menu');
  if(!menu) return;
  let target = null;
  if(page==='home') target = menu.querySelector('li a[href="index.html"]');
  else if(page==='products'||page==='product') target = menu.querySelector('li.has-drop');
  else if(page==='oem') target = menu.querySelector('li a[href="oem.html"]');
  else if(page==='about') target = menu.querySelector('li a[href="about.html"]');
  else if(page==='faq') target = menu.querySelector('li a[href="faq.html"]');
  else if(page==='blog') target = menu.querySelector('li a[href="blog.html"]');
  if(target){
    const li = target.closest('li');
    if(li) li.classList.add('nav-active-page');
  }
}

/* ---------- home ---------- */
function initHome(){
  const box = document.getElementById('homePlatforms');
  if(box){
    box.innerHTML = PLATFORMS.map(pl=>{
      const n = countBy('platformKey', pl.key);
      if(pl.soon){
        return `<div class="platform-card soon">
          <div class="pico">${phIcon(26)}</div>
          <h3>${esc(pl.name)}</h3>
          <span class="cs-tag">Coming Soon</span>
          <div class="cnt">New lineup in development</div>
        </div>`;
      }
      return `<a class="platform-card" href="products.html?platform=${pl.key}">
        <div class="pico">${phIcon(26)}</div>
        <h3>${esc(pl.name)}</h3>
        <div class="cnt">${n} product${n===1?'':'s'}</div>
        <span class="go">Browse range →</span>
      </a>`;
    }).join('');
  }
  const feat = document.getElementById('homeFeatured');
  if(feat){
    const items = FEATURED_SKUS.map(s=>bySku[s]).filter(Boolean);
    feat.innerHTML = items.map(featCard).join('');
    const fPrev = document.getElementById('featPrev');
    const fNext = document.getElementById('featNext');
    const fStep = () => Math.max(260, Math.round(feat.clientWidth * 0.82));
    fPrev&&fPrev.addEventListener('click', ()=>feat.scrollBy({left:-fStep(), behavior:'smooth'}));
    fNext&&fNext.addEventListener('click', ()=>feat.scrollBy({left:fStep(), behavior:'smooth'}));
  }
}

/* ---------- collection page ---------- */
let activePlatform = "all", activeType = "all";
function injectCollectionSchema(){
  if(document.querySelector('script[data-schema="collection"]')) return;
  const s=document.createElement('script');
  s.type='application/ld+json';
  s.setAttribute('data-schema','collection');
  s.textContent=JSON.stringify({
    "@context":"https://schema.org",
    "@type":"ItemList",
    "name":"JINGOX Gaming Console Accessories Catalog",
    "numberOfItems":PRODUCTS.length,
    "url":"https://jingox.com/products",
    "itemListElement":PRODUCTS.map((p,i)=>({
      "@type":"ListItem","position":i+1,
      "name":`${p.name} (${p.sku})`,
      "url":"https://jingox.com/product?sku="+encodeURIComponent(p.sku)
    }))
  });
  document.head.appendChild(s);
}
function initCollection(){
  const grid = document.getElementById('productGrid');
  if(!grid) return;

  // platform filter chips
  const pf = document.getElementById('platformFilters');
  if(pf){
    pf.innerHTML = `<button class="filter-btn active" data-platform="all">All Platforms</button>` +
      PLATFORMS.filter(p=>!p.soon).map(p=>
        `<button class="filter-btn" data-platform="${p.key}">${esc(p.name)} <span style="opacity:.6">(${countBy('platformKey',p.key)})</span></button>`
      ).join('');
  }
  // type filter chips
  const tf = document.getElementById('typeFilters');
  if(tf){
    const types = TYPE_ORDER.filter(t=>PRODUCTS.some(p=>p.type===t));
    tf.innerHTML = `<button class="filter-btn active" data-type="all">All Types</button>` +
      types.map(t=>
        `<button class="filter-btn" data-type="${encodeURIComponent(t)}">${esc(t)} <span style="opacity:.6">(${PRODUCTS.filter(p=>p.type===t).length})</span></button>`
      ).join('');
  }

  // initial state from query
  const q = new URLSearchParams(location.search);
  if(q.get('platform')){ activePlatform = q.get('platform'); setActive(pf,'platform',activePlatform); }
  if(q.get('type')){ activeType = decodeURIComponent(q.get('type')); setActive(tf,'type',activeType); }

  const search = document.getElementById('productSearch');
  const counter = document.getElementById('resultCount');

  function render(){
    const kw = search ? search.value.trim().toLowerCase() : "";
    const list = PRODUCTS.filter(p=>{
      if(activePlatform!=="all" && p.platformKey!==activePlatform) return false;
      if(activeType!=="all" && p.type!==activeType) return false;
      if(kw && !p._search) { p._search=(p.sku+' '+p.name+' '+p.platformName+' '+p.type).toLowerCase(); }
      if(kw && !p._search.includes(kw)) return false;
      return true;
    });
    list.sort((a,b)=>{
      const ti = TYPE_ORDER.indexOf(a.type)-TYPE_ORDER.indexOf(b.type);
      if(ti) return ti;
      return a.sku.localeCompare(b.sku);
    });
    grid.innerHTML = list.length
      ? list.map(productCard).join('')
      : `<div class="empty-note">No products match your filters. <a href="products.html" style="color:var(--blue-2)">Reset</a> or contact us — we regularly add new models.</div>`;
    if(counter){
      counter.textContent = `Showing ${list.length} of ${PRODUCTS.length} products`;
    }
    // update page heading
    const title = document.getElementById('collectionTitle');
    if(title){
      const pl = PLATFORMS.find(x=>x.key===activePlatform);
      const ty = activeType==="all" ? null : activeType;
      title.textContent = ty ? ty : (pl ? pl.name : "All Products");
    }
  }

  pf && pf.addEventListener('click', e=>{
    const b=e.target.closest('[data-platform]'); if(!b) return;
    activePlatform=b.dataset.platform; setActive(pf,'platform',activePlatform); render();
  });
  tf && tf.addEventListener('click', e=>{
    const b=e.target.closest('[data-type]'); if(!b) return;
    activeType=decodeURIComponent(b.dataset.type); setActive(tf,'type',activeType); render();
  });
  search && search.addEventListener('input', render);

  // reset button
  document.getElementById('resetFilters')?.addEventListener('click', ()=>{
    activePlatform="all"; activeType="all";
    if(search) search.value="";
    setActive(pf,'platform','all'); setActive(tf,'type','all'); render();
  });

  render();
  injectCollectionSchema();
}
function setActive(container, dim, val){
  if(!container) return;
  container.querySelectorAll(`[data-${dim}]`).forEach(b=>{
    b.classList.toggle('active', b.dataset[dim]===val);
  });
}

/* ---------- product detail ---------- */
function renderDesc(p){
  if(!p.desc){
    return `<p>The ${esc(p.name)} is a quality ${esc(p.type.toLowerCase())} from JINGOX, built for distributors and resellers. Contact our team for full specifications, MOQ and factory pricing, or request a custom package.</p>`;
  }
  let html = "";
  p.desc.split(/\n\s*\n/).forEach(block=>{
    const lines = block.split('\n').map(s=>s.trim()).filter(Boolean);
    if(!lines.length) return;
    if(lines.every(l=>l.startsWith('- '))){
      html += '<ul>' + lines.map(l=>`<li>${esc(l.slice(2))}</li>`).join('') + '</ul>';
    } else if(lines.length===1 && lines[0].length<70 && !/[.?!;:]$/.test(lines[0]) && !/\d{2,}/.test(lines[0])){
      html += `<p class="sub">${esc(lines[0])}</p>`;
    } else {
      html += '<p>' + lines.map(esc).join('<br>') + '</p>';
    }
  });
  return html;
}
function specRows(p){
  // C2 (2026-10-22): 9 fields; Product Size / Net Weight / Payment Terms removed.
  // Rendered in the full-width neon spec block below the first screen.
  const rows = [
    ["Item No.", p.sku],
    ["Compatibility", p.compatibility],
    ["Material", p.material],
    ["Color", p.color],
    ["Gross Weight", p.grossWeight],
    ["Package Size", p.packageSize],
    ["Carton Size", p.cartonSize],
    ["Qty per Carton", p.cartonQty],
    ["Certifications", "Available on request"]
  ];
  return rows.filter(r=>r[1]).map(r=>
    `<div class="spec-row"><span class="spec-k">${r[0]}</span><span class="spec-v">${esc(r[1])}</span></div>`).join('');
}
/* Pull short selling-point headings out of the long description;
   fall back to data-driven + standard B2B promises when the text has none. */
function extractFeatures(p){
  const feats=[];
  if(p.desc){
    p.desc.split(/\n\s*\n/).forEach(block=>{
      const t=block.trim();
      if(t && !t.includes('\n') && t.length<60 && !/[.?!;:]$/.test(t)
        && !/^\d/.test(t) && !t.startsWith('-')){
        feats.push(t);
      }
    });
  }
  const uniq=[...new Set(feats)];
  if(uniq.length>=2) return uniq.slice(0,4);
  const fb=[];
  if(p.compatibility) fb.push(`Made for ${p.compatibility}`);
  if(p.material) fb.push(`${p.material} build for daily wholesale use`);
  fb.push("MOQ 1 piece — order a single sample or a bulk carton");
  fb.push("OEM/ODM: custom color, logo, packaging & bundle sets");
  return fb.slice(0,4);
}
/* D5 (2026-10-21): OEM/ODM 事实行；CFG.oem 未填时显示中性"Contact us"，不编造天数/数字 */
function oemFacts(){
  const o = CFG.oem || {};
  const ask = '<a href="contact.html">Contact us for the current schedule</a>';
  const val = v => v ? esc(v) : ask;
  const rows = [
    ["MOQ", "<b>1 piece</b> (sample &amp; bulk)"],
    ["Sample lead time", val(o.sampleLeadTime)],
    ["Mass production lead time", val(o.massLeadTime)],
    ["Express shipping", val(o.expressShipping)]
  ];
  if(o.paymentTerm) rows.push(["Payment terms", esc(o.paymentTerm)]);
  return rows.map(r =>
    `<div class="qi-row"><span class="k">${r[0]}</span><span class="v">${r[1]}</span></div>`).join('');
}

/* D7 (2026-10-21): 产品页 FAQ（数据驱动；兼容机型只取真实字段，不臆测、不写错 Switch 1/2） */
function productFaq(p){
  const compat = p.compatibility || p.platformName;
  const o = CFG.oem || {};
  const parts = [];
  if(o.sampleLeadTime) parts.push(`Samples take about ${o.sampleLeadTime.toLowerCase()}`);
  if(o.massLeadTime) parts.push(`bulk production takes ${o.massLeadTime.toLowerCase()}`);
  const lead = parts.length
    ? `${parts.join(', and ')}, depending on order size and customization. Contact us for the exact schedule for your order.`
    : `Sample and bulk lead times depend on quantity and customization. Contact us with the SKU and quantity for the current schedule.`;
  const ship = o.expressShipping
    ? `Orders are shipped by international express, normally ${o.expressShipping.toLowerCase()}.`
    : `Orders are shipped by international express or other agreed freight terms.`;
  const faqs = [
    { q:"What is the minimum order quantity (MOQ)? Can I order one sample?",
      a:"The MOQ is 1 piece. You can order a single sample to check quality first, or a bulk order. Both samples and bulk orders are welcome — contact us for factory pricing." },
    ...(compat ? [{ q:`Is the ${p.sku} compatible with ${compat}?`,
      a:`Yes. The ${p.name} (${p.sku}) is designed for ${compat}. If you are unsure about your exact device model, please confirm it with us before ordering.` }] : []),
    { q:"How long do samples and bulk production take?", a:lead },
    { q:"Do you offer OEM and ODM customization?",
      a:"Yes — custom color, finish, logo, private label, retail color box or blister packaging, and bundle sets. Send us your target market and quantities for a tailored quote." },
    { q:"Are CE, RoHS and other certifications available?",
      a:"Yes. EMC and RoHS test reports are available for eligible models and can be provided on request. Tell us the SKU and your destination market, and we will send the matching documents." }
  ];
  return faqs;
}
function faqHtml(faqs){
  return `<div class="faq-board">${faqs.map(f =>
    `<div class="faq-entry"><div class="faq-q">${esc(f.q)}</div>
      <div class="faq-a"><p>${f.a}</p></div></div>`).join('')}</div>`;
}
function injectFaqSchema(faqs){
  const data = {
    "@context":"https://schema.org","@type":"FAQPage",
    "mainEntity": faqs.map(f => ({
      "@type":"Question","name":f.q,
      "acceptedAnswer":{"@type":"Answer","text":f.a}
    }))
  };
  const s = document.createElement('script');
  s.type = "application/ld+json";
  s.textContent = JSON.stringify(data);
  document.head.appendChild(s);
}

function copyTextFallback(txt){
  const ta=document.createElement('textarea');
  ta.value=txt; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  let ok=false;
  try{ ok=document.execCommand('copy'); }catch(e){ ok=false; }
  ta.remove(); return ok;
}

/* B7: reusable inquiry modal (product SKU passed in; generic when p is null) */
function modalHtml(p){
  const sku = p ? p.sku : "";
  const name = p ? (p.shortName || p.name) : "";
  const prefill = p ? productWaText(p) : "Hi, I'd like a wholesale quote from JINGOX.";
  return `<div class="modal-overlay" id="inquiryModal" data-modal>
    <div class="modal" role="dialog" aria-modal="true" aria-label="Request a quote">
      <button type="button" class="modal-close" data-modal-close aria-label="Close">×</button>
      <h3>Request a Quote</h3>
      <p class="m-sub">${p?esc(sku)+" · "+esc(name):"Send us your inquiry and we will reply within one business day."}</p>
      <form id="modalForm">
        <input type="hidden" name="access_key" value="${CFG.web3formsKey}">
        <input type="hidden" name="subject" value="Website inquiry ${p?esc(sku):''}">
        <input type="hidden" name="sku" value="${esc(sku)}">
        <input type="hidden" name="from_content" value="product-modal">
        <div class="form-field">
          <label>Name</label>
          <input type="text" name="name" required placeholder="Your name">
        </div>
        <div class="form-field">
          <label>Email</label>
          <input type="email" name="email" required placeholder="you@company.com">
        </div>
        <div class="form-field">
          <label>WhatsApp</label>
          <input type="text" name="whatsapp" placeholder="WhatsApp number (optional)">
        </div>
        <div class="form-field">
          <label>Message</label>
          <textarea name="message" rows="3">${esc(prefill)}</textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">Send Inquiry</button>
      </form>
    </div>
  </div>
  <div class="lightbox" id="lightbox" data-lightbox>
    <button type="button" class="lightbox-close" data-lightbox-close aria-label="Close">×</button>
    <img src="" alt="Enlarged image">
  </div>`;
}
/* D5: Packing block — packaging image + what's in the box (no carton qty/size) */
function packBlockHtml(p, packagingImg){
  let html = packagingImg
    ? `<figure class="pd-packaging-img" style="margin:0 0 22px"><img src="${esc(packagingImg.src)}"
        alt="${esc(packagingImg.alt)}" style="max-width:420px;width:100%;border-radius:10px;border:1px solid var(--line)"></figure>`
    : '';
  const items = p.packingContents
    ? p.packingContents.split(/;\s*/).map(s=>s.trim()).filter(Boolean) : [];
  if(items.length){
    html += `<ul class="pd-boxlist">${items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`;
  } else {
    html += `<p class="pd-desc">Contact us for the full packing list.</p>`;
  }
  return html;
}
function injectBreadcrumbSchema(p){
  const s=document.createElement('script');
  s.type='application/ld+json';
  s.textContent=JSON.stringify({
    "@context":"https://schema.org","@type":"BreadcrumbList",
    "itemListElement":[
      {"@type":"ListItem","position":1,"name":"Home","item":"https://jingox.com/"},
      {"@type":"ListItem","position":2,"name":"Products","item":"https://jingox.com/products"},
      {"@type":"ListItem","position":3,"name":p.sku,"item":"https://jingox.com/product?sku="+encodeURIComponent(p.sku)}
    ]});
  document.head.appendChild(s);
}
function colorDot(c){
  const cl=String(c).toLowerCase();
  if(cl==='white')return '#FFFFFF';
  if(cl==='black')return '#111111';
  return cl;
}
function initDetail(){
  const wrap = document.getElementById('pd');
  if(!wrap) return;
  // SKU 来源：URL query（动态 product.html?sku=）优先；其次 body data-sku（静态独立页 product-<sku>.html）
  let sku = new URLSearchParams(location.search).get('sku');
  const isStatic = !sku && !!document.body.dataset.sku;
  if(!sku) sku = document.body.dataset.sku || null;
  const p = sku ? bySku[sku] : null;
  const crumbName = document.getElementById('crumbName');
  if(!p){
    if(crumbName) crumbName.textContent = "Product not found";
    wrap.innerHTML = `<div class="container"><div class="empty-note" style="min-height:300px">
      <h2 style="margin-bottom:12px">Product not found</h2>
      <p style="margin-bottom:20px">The requested model is unavailable. Browse our full catalog.</p>
      <a class="btn btn-primary" href="products.html">Browse All Products</a></div></div>`;
    document.title = "Product Not Found | JINGOX";
    return;
  }
  if(crumbName) crumbName.textContent = p.sku;

  /* short Meta title (SEO #2): shortName + platform + JINGOX */
  const pShort = PLATFORM_SHORT[p.platformKey] || "";
  document.title = `${p.shortName || p.type}${pShort?(" for "+pShort):""} | JINGOX`;
  /* Meta description (SEO #3, <=155): core keyword + MOQ/OEM first */
  const metaDesc = `${p.shortName||p.name} for ${p.platformName}. MOQ 1 piece, OEM/ODM welcome. `+
    `Contact JINGOX for factory price & lead time.`;
  setMeta('description', metaDesc.slice(0,160));
  setOg('og:title', `${p.shortName||p.name} | JINGOX`);
  setOg('og:description', metaDesc.slice(0,160));
  /* product page is indexable: self-referencing canonical keyed by sku, ensure robots allows indexing */
  // canonical：静态独立页自指 product-<sku>.html；动态页自指 product.html?sku=
  setCanonical(isStatic
    ? `https://jingox.com/product-${productSlug(p.sku)}.html`
    : `https://jingox.com/product.html?sku=${encodeURIComponent(p.sku)}`);
  setMeta('robots', 'index,follow');

  /* color state; only show the picker when images carry color data */
  const colors = productColors(p);
  const hasColorData = p.images.some(x=>x.color);
  let currentColor = colors.length ? colors[0].toLowerCase() : "";
  const classified = classifyImages(p);
  const detailInfoImgs = classified.detail;
  const packagingImg = classified.packaging[0] || null;

  /* gallery (re-rendered on color switch) */
  function galleryHtml(color){
    const imgs = mainForColor(p,color);
    if(!hasImgs(p) || !imgs.length){
      return `<div class="pd-gallery">
        <div class="pd-main-ph">${phIcon(128)}
          <span class="pd-sku" style="position:absolute;top:14px;left:14px;font-size:.78rem;color:var(--muted-2)">${esc(p.sku)}</span>
        </div>
        <div class="pd-thumbs">${[0,1,2,3].map(()=>`<div class="pd-thumb">${phIcon(28)}</div>`).join('')}</div>
      </div>`;
    }
    return `<div class="pd-gallery">
      <div class="pd-main-ph has-img">
        <img id="pdMainImg" class="pd-main-img" src="${esc(imgs[0].src)}" alt="${esc(imgs[0].alt)}" width="800" height="800">
      </div>
      <div class="pd-thumbs pd-thumbs-scroll">
        ${imgs.map((x,i)=>`<button type="button" class="pd-thumb${i===0?' active':''}" data-i="${i}" aria-label="View photo ${i+1}">
          <img src="${esc(x.src)}" alt="${esc(x.alt)}" loading="lazy" decoding="async" width="120" height="120">
        </button>`).join('')}
      </div>
    </div>`;
  }
  /* bind thumbnails inside the gallery column */
  function bindThumbs(galleryCol){
    galleryCol.querySelectorAll('.pd-thumb').forEach(tb=>{
      tb.addEventListener('click',()=>{
        const i=parseInt(tb.dataset.i,10);
        const imgs=mainForColor(p,currentColor);const im=imgs[i];if(!im)return;
        const mainImgEl=document.getElementById('pdMainImg');
        mainImgEl.src=im.src;mainImgEl.alt=im.alt;
        galleryCol.querySelectorAll('.pd-thumb').forEach(b=>b.classList.remove('active'));
        tb.classList.add('active');
        tb.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
      });
    });
  }
  const colorPicker = (hasColorData && colors.length>=2)
    ? `<div class="pd-colors" id="pdColors">
        <span class="clabel">Color:</span>
        ${colors.map(c=>`<button type="button" class="color-swatch${c.toLowerCase()===currentColor?' active':''}" data-color="${c.toLowerCase()}">
          <span class="dotc" style="background:${colorDot(c)}"></span>${c}</button>`).join('')}
      </div>` : '';

  if(hasImgs(p)){
    const firstColorImgs = mainForColor(p,currentColor);
    setOg('og:image', "https://jingox.com/"+(firstColorImgs[0]?firstColorImgs[0].src:p.images[0].src));
    injectProductSchema(p);
  }
  const wa = waLink(productWaText(p));
  const related = PRODUCTS.filter(x=>x.sku!==p.sku && (x.platformKey===p.platformKey || x.type===p.type))
    .sort((a,b)=>(hasImgs(a)?0:1)-(hasImgs(b)?0:1)).slice(0,4);
  const feats = productFeatures(p);
  const faqs = productFaq(p);
  const compatTags = [...new Set([p.platformName, p.compatibility].filter(Boolean))];
  const certImgs = certImgsFor(p);
  const whyChoose = [
    "MOQ 1 piece — sample & bulk both welcome",
    "OEM/ODM: custom color, logo & packaging",
    "One-stop range for Switch / PS5 / Xbox / VR",
    "Quality checked before shipment"];

  wrap.innerHTML = `
  <div class="container">
    <div class="pd">
      <div id="pdGalleryCol">${galleryHtml(currentColor)}</div>
      <div class="pd-info">
        <span class="pd-sku">${esc(p.sku)}</span>
        <h1>${esc(p.name)}</h1>
        <div class="pd-compat">
          <span class="tag">${esc(p.platformName)}</span>
          <span class="tag purple">${esc(p.type)}</span>
        </div>
        ${colorPicker}
        <ul class="pd-bullets pd-features">
          ${feats.map(f=>`<li>${esc(f)}</li>`).join('')}
        </ul>
        <div class="pd-why">
          <h4>Why Choose JINGOX</h4>
          <ul>${whyChoose.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>
        </div>
        <div class="pd-cta">
          <a class="btn btn-primary" target="_blank" rel="noopener" href="${wa}">Get Quote on WhatsApp</a>
          <button type="button" class="btn btn-purple" data-modal-open>Email Inquiry</button>
        </div>
        <div class="email-row">
          <span class="email-ico">✉</span>
          <span class="email-addr">${esc(CFG.email)}</span>
          <button type="button" class="copy-mail" data-copy-mail>Copy email</button>
        </div>
      </div>
    </div>
  </div>

  <div class="pd-specs-band" style="background:var(--bg);padding:8px 0 8px">
    <div class="container">
      <div class="specs-card" id="specs">
        <div class="spec-head">
          <span class="spec-title">Specifications</span>
        </div>
        <div class="spec-rows">
          ${specRows(p)}
        </div>
      </div>
    </div>
  </div>

  <div class="pd-detail">
    <div class="pd-nav-sticky">
      <div class="pd-px">
        <nav class="pd-nav">
          <a href="#overview">Overview</a>
          ${detailInfoImgs.length?'<a href="#details">Product Details</a>':''}
          <a href="#specs">Specifications</a>
          <a href="#compatibility">Compatibility</a>
          <a href="#package">Packing</a>
          <a href="#certifications">Certifications</a>
          <a href="#oem">OEM / ODM</a>
          <a href="#faq">FAQ</a>
          <button type="button" data-modal-open style="padding:8px 18px;border-radius:24px;font-size:.88rem;font-weight:600;color:var(--blue-ink);background:var(--surface);border:1px solid var(--line)">Get Quote</button>
        </nav>
      </div>
    </div>

    <div class="pd-px">
      <div class="pd-block" id="overview">
        <h2>Product Overview</h2>
        <div class="pd-desc">${renderDesc(p)}</div>
      </div>
    </div>

    ${detailInfoImgs.length ? `<div class="pd-detail-wide" id="details">
      <div class="pd-px"><h2>Product Details</h2></div>
      <div class="pd-gallery-long">
        ${detailInfoImgs.map(x=>`<figure><img src="${esc(x.src)}" alt="${esc(x.alt)}" loading="lazy" decoding="async"></figure>`).join('')}
      </div>
    </div>` : ''}

    <div class="pd-px">
      <div class="pd-block" id="compatibility">
        <h2>Compatibility</h2>
        <div class="pd-compat-tags">
          ${compatTags.map((t,i)=>`<span class="tag${i===1?' purple':''}">${esc(t)}</span>`).join('')}
        </div>
        ${p.compatibilityNote?`<p class="compat-note">${esc(p.compatibilityNote)}</p>`:''}
      </div>

      <div class="pd-block" id="package">
        <h2>What's in the Box</h2>
        <div class="pd-package">${packBlockHtml(p, packagingImg)}</div>
      </div>

      <div class="pd-block" id="certifications">
        <h2>Certifications &amp; Quality Control</h2>
        ${certImgs.length ? `<div class="pd-cert-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:16px">
          ${certImgs.map(x=>`<button type="button" class="f-cell" data-lightbox-src="${esc(x.src)}" style="border-radius:10px">
            <img src="${esc(x.src)}" alt="${esc(x.alt)}" style="width:100%;display:block"></button>`).join('')}
        </div>` : `<div class="pd-cert-gallery">
          <p>Test reports and compliance documents (CE / RoHS where applicable) are available for eligible models. Contact us for the latest certificates for this specific SKU.</p>
        </div>`}
        <div class="pd-cta" style="margin-top:14px">
          <button type="button" class="btn btn-ghost" data-modal-open>Request Certificates</button>
        </div>
      </div>

      <div class="pd-block" id="oem">
        <h2>OEM / ODM &amp; Wholesale</h2>
        <div class="pd-oem-services">
          <span class="oem-chip">Custom color &amp; finish</span>
          <span class="oem-chip">Private label &amp; logo</span>
          <span class="oem-chip">Retail color box / blister</span>
          <span class="oem-chip">Bundle sets</span>
        </div>
        <div class="pd-quickinfo pd-oem-facts">${oemFacts()}</div>
        <div class="pd-desc"><p>Send us your target market and quantities and we will get back to you with a tailored quote covering MOQ, sample lead time, bulk lead time and shipping.</p></div>
        <div class="pd-cta" style="margin-top:14px">
          <button type="button" class="btn btn-primary" data-modal-open>Request a Custom Quote</button>
          <a class="btn btn-ghost" href="oem.html">Explore OEM Services</a>
        </div>
      </div>

      <div class="pd-block" id="faq">
        <h2>Frequently Asked Questions</h2>
        ${faqHtml(faqs)}
      </div>
    </div>
  </div>

  <div class="pd-related">
    <div class="container">
      <div class="section-head left"><h2 style="font-size:1.6rem">Related Products</h2></div>
      <div class="product-grid" id="relatedGrid">${related.map(productCard).join('')}</div>
    </div>
  </div>

  ${modalHtml(p)}`;

  injectFaqSchema(faqs);
  injectBreadcrumbSchema(p);

  const galleryCol = document.getElementById('pdGalleryCol');
  bindThumbs(galleryCol);

  /* color picker switch: re-render gallery then re-bind */
  const pdColors=document.getElementById('pdColors');
  if(pdColors){
    pdColors.querySelectorAll('[data-color]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        currentColor=btn.dataset.color;
        galleryCol.innerHTML=galleryHtml(currentColor);
        pdColors.querySelectorAll('.color-swatch').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        bindThumbs(galleryCol);
      });
    });
  }

  /* copy email 已改为全局事件委托（initCopyMail），覆盖产品页与 contact 页 */

  /* modal open/close + submit */
  const modal=document.getElementById('inquiryModal');
  wrap.querySelectorAll('[data-modal-open]').forEach(btn=>{
    btn.addEventListener('click',()=>modal.classList.add('show'));
  });
  modal.querySelectorAll('[data-modal-close]').forEach(btn=>{
    btn.addEventListener('click',()=>modal.classList.remove('show'));
  });
  modal.addEventListener('click',e=>{ if(e.target===modal) modal.classList.remove('show'); });
  const modalForm=document.getElementById('modalForm');
  modalForm.addEventListener('submit', async e=>{
    e.preventDefault();
    try{
      const res=await fetch('https://api.web3forms.com/submit',{method:'POST',body:new FormData(modalForm)});
      const json=await res.json();
      if(json.success){
        const box=modal.querySelector('.modal');
        box.innerHTML=`<div style="text-align:center;padding:40px 10px">
          <div style="width:64px;height:64px;border-radius:50%;background:rgba(34,197,94,.15);color:#16A34A;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;font-size:1.8rem">✓</div>
          <h3>Thank you!</h3>
          <p style="color:var(--muted)">Your inquiry has been sent. We will reply within one business day.</p>
          <button type="button" class="btn btn-primary" data-modal-close style="margin-top:10px">Done</button>
        </div>`;
        box.querySelector('[data-modal-close]').addEventListener('click',()=>modal.classList.remove('show'));
      } else { alert('Sorry, the message could not be sent. Please email '+CFG.email); }
    }catch(err){ alert('Network error. Please email '+CFG.email); }
  });

  /* lightbox for certificate images */
  const lightbox=document.getElementById('lightbox');
  const lbImg=lightbox.querySelector('img');
  wrap.querySelectorAll('[data-lightbox-src]').forEach(btn=>{
    btn.addEventListener('click',()=>{ lbImg.src=btn.dataset.lightboxSrc; lightbox.classList.add('show'); });
  });
  lightbox.querySelectorAll('[data-lightbox-close]').forEach(btn=>{
    btn.addEventListener('click',()=>lightbox.classList.remove('show'));
  });
  lightbox.addEventListener('click',e=>{ if(e.target===lightbox) lightbox.classList.remove('show'); });
}

/* home factory & certificate blocks: carousel + lightbox */
function initHomeFactory(){
  const track=document.getElementById('certTrack');
  if(!track) return;
  const cards=track.querySelectorAll('.cert-card');
  const scroll=document.querySelector('.cert-scroll');
  const lb=document.getElementById('homeLightbox');
  const lbImg=lb?lb.querySelector('img'):null;
  let idx=0,perView=3;
  function step(){
    const first=track.children[0];
    return first.getBoundingClientRect().width+16;
  }
  function calc(){
    const vw=scroll.getBoundingClientRect().width;
    perView=Math.max(1,Math.round(vw/step()));
  }
  function maxIdx(){ return Math.max(0,cards.length-perView); }
  function renderDots(){
    const dots=document.getElementById('certDots');
    if(!dots)return;
    dots.innerHTML='';
    const pages=maxIdx()+1;
    for(let i=0;i<pages;i++){
      const b=document.createElement('span');
      if(i===Math.round(idx/perView))b.classList.add('active');
      b.addEventListener('click',()=>{idx=Math.min(i*perView,maxIdx());move();});
      dots.appendChild(b);
    }
  }
  function move(){
    calc();
    if(idx>maxIdx())idx=maxIdx();
    track.style.transform='translateX(-'+(idx*step())+'px)';
    renderDots();
  }
  const prev=document.getElementById('certPrev');
  const next=document.getElementById('certNext');
  prev&&prev.addEventListener('click',()=>{idx=Math.max(0,idx-1);move();});
  next&&next.addEventListener('click',()=>{idx=Math.min(idx+1,maxIdx());move();});
  window.addEventListener('resize',move);
  window.addEventListener('load',move);
  setTimeout(move,120);

  /* lightbox: factory cells + cert cards */
  function openLb(src){
    if(!lb)return;
    lbImg.src=src;lb.classList.add('show');
  }
  function closeLb(){ lb&&lb.classList.remove('show'); }
  document.querySelectorAll('.factory-band .f-cell').forEach(c=>{
    c.addEventListener('click',()=>{
      const im=c.querySelector('img');if(im)openLb(im.src);
    });
  });
  cards.forEach(c=>{
    c.addEventListener('click',()=>{ if(c.dataset.lb)openLb(c.dataset.lb); });
  });
  lb&&lb.querySelectorAll('.lightbox-close').forEach(b=>b.addEventListener('click',closeLb));
  lb&&lb.addEventListener('click',e=>{if(e.target===lb)closeLb();});

  /* background loop: ensure muted autoplay actually starts (policy may block the bare attribute) */
  const bgLoop=document.querySelector('video.fv-loop');
  if(bgLoop){ bgLoop.muted=true; const kick=()=>bgLoop.play().catch(()=>{}); kick(); bgLoop.addEventListener('loadeddata',kick); document.addEventListener('click',kick,{once:true}); }

  /* full factory video modal */
  const vModal=document.getElementById('videoModal');
  const vPlayer=document.getElementById('videoModalPlayer');
  const vPlay=document.getElementById('fvPlay');
  function openVideo(){
    if(!vModal)return;
    vModal.classList.add('show');
    vPlayer.muted=false;
    vPlayer.play().catch(()=>{});
  }
  function closeVideo(){
    if(!vModal)return;
    vModal.classList.remove('show');
    vPlayer.pause();
  }
  vPlay&&vPlay.addEventListener('click',openVideo);
  vPlay&&vPlay.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openVideo();}});
  const vClose=document.getElementById('videoModalClose');
  vClose&&vClose.addEventListener('click',closeVideo);
  vModal&&vModal.addEventListener('click',e=>{if(e.target===vModal)closeVideo();});

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeLb();closeVideo();}
    if(e.key==='ArrowRight')next&&next.click();
    if(e.key==='ArrowLeft')prev&&prev.click();
  });
}

/* floating WhatsApp + Email button group (E2), injected on every page */
function initFloatGroup(){
  document.querySelectorAll('.wa-float').forEach(el=>el.style.display='none');
  if(document.querySelector('.float-group')) return;
  const group=document.createElement('div');
  group.className='float-group';
  const generic="Hi, I'd like a wholesale quote from JINGOX — MOQ and price, please.";
  const waHref=waLink(generic);
  group.innerHTML=`
    <a class="float-btn float-wa" target="_blank" rel="noopener" href="${waHref}" aria-label="Chat on WhatsApp">
      <svg viewBox="0 0 32 32"><path d="M16 .8C7.6.8.8 7.6.8 16c0 2.7.7 5.3 2 7.6L.8 31.2l7.8-2c2.2 1.2 4.7 1.9 7.4 1.9 8.4 0 15.2-6.8 15.2-15.2S24.4.8 16 .8zm0 27.6c-2.4 0-4.6-.7-6.5-1.9l-.5-.3-4.6 1.2 1.2-4.5-.3-.5C4.8 20.5 4 18.3 4 16 4 9.4 9.4 4 16 4s12 5.4 12 12-5.4 12.4-12 12.4zm6.6-9c-.4-.2-2.1-1-2.4-1.1-.3-.1-.6-.2-.8.2-.2.4-.8 1.1-1 1.3-.2.2-.4.2-.7.1-.4-.2-1.5-.5-2.8-1.7-1-1-1.7-2.2-1.9-2.6-.2-.4 0-.6.2-.8l.6-.7c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6-.1-.2-.8-1.9-1.1-2.6-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.4-1.2 1.1-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.7 5.8 5.2.8.4 1.4.6 1.9.7.8.2 1.5.2 2.1.1.6-.1 2-.8 2.3-1.6.3-.8.3-1.4.2-1.6-.1-.1-.3-.2-.7-.4z"/></svg>
    </a>
    <button type="button" class="float-btn float-mail" data-float-mail aria-label="Email inquiry">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>
    </button>`;
  document.body.appendChild(group);
  group.querySelector('[data-float-mail]').addEventListener('click',()=>{
    if(document.getElementById('inquiryModal')){
      document.getElementById('inquiryModal').classList.add('show');
    } else {
      openGenericModal();
    }
  });
}
/* generic modal on non-product pages (no SKU) */
function openGenericModal(){
  let host=document.getElementById('genericModalHost');
  if(!host){
    host=document.createElement('div');
    host.id='genericModalHost';
    document.body.appendChild(host);
  }
  host.innerHTML=modalHtml(null);
  const modal=host.querySelector('#inquiryModal');
  modal.classList.add('show');
  modal.querySelectorAll('[data-modal-close]').forEach(b=>b.addEventListener('click',()=>modal.classList.remove('show')));
  modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show');});
  const form=host.querySelector('#modalForm');
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    try{
      const res=await fetch('https://api.web3forms.com/submit',{method:'POST',body:new FormData(form)});
      const json=await res.json();
      if(json.success){
        const box=modal.querySelector('.modal');
        box.innerHTML=`<div style="text-align:center;padding:40px 10px">
          <div style="width:64px;height:64px;border-radius:50%;background:rgba(34,197,94,.15);color:#16A34A;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;font-size:1.8rem">✓</div>
          <h3>Thank you!</h3><p style="color:var(--muted)">Your inquiry has been sent. We will reply within one business day.</p>
          <button type="button" class="btn btn-primary" data-modal-close style="margin-top:10px">Done</button></div>`;
        box.querySelector('[data-modal-close]').addEventListener('click',()=>modal.classList.remove('show'));
      } else {alert('Sorry, the message could not be sent.');}
    }catch(err){alert('Network error. Please email info@jingox.com');}
  });
}
function initFaq(){
  document.querySelectorAll('.faq-item').forEach(item=>{
    const q = item.querySelector('.faq-q');
    q && q.addEventListener('click', ()=> item.classList.toggle('open'));
  });
}

/* ---------- inquiry form ---------- */
function initForm(){
  const form = document.getElementById('inquiryForm');
  if(!form) return;
  const card = document.getElementById('formCard');
  const success = document.getElementById('formSuccess');
  // ensure key field reflects CFG
  const keyInput = form.querySelector('[name="access_key"]');
  if(keyInput) keyInput.value = CFG.web3formsKey;
  // prefill product type from query
  const pt = new URLSearchParams(location.search).get('type');
  if(pt){ const sel=form.querySelector('[name="product_type"]'); if(sel) sel.value=pt; }

  form.addEventListener('submit', async e=>{
    e.preventDefault();
    if(CFG.web3formsKey.includes('{{')){
      // Not configured yet (P4): route to email rather than fake a submission.
      const name = form.querySelector('[name=name]').value||"there";
      const email = form.querySelector('[name=email]').value||"";
      const body = encodeURIComponent(
        ["Name: "+name,"Email: "+email,
         "Company: "+form.querySelector('[name=company]').value,
         "WhatsApp/Phone: "+form.querySelector('[name=whatsapp]').value,
         "Product Type: "+form.querySelector('[name=product_type]').value,
         "Estimated Quantity: "+form.querySelector('[name=quantity]').value,
         "Message: "+form.querySelector('[name=message]').value].join("\n"));
      window.location.href = mailLink("New wholesale inquiry from website") + "&body=" + body;
      alert('The form backend is enabled at go-live. Your email app has opened with the inquiry.');
      return;
    }
    try{
      const res = await fetch('https://api.web3forms.com/submit',{method:'POST',body:new FormData(form)});
      const json = await res.json();
      if(json.success){
        form.style.display='none';
        success.classList.add('show');
        form.reset();
      } else {
        alert('Sorry, the message could not be sent. Please email ' + CFG.email);
      }
    }catch(err){
      alert('Network error. Please email ' + CFG.email);
    }
  });
}

/* ---------- global copy-email (event delegation, works on detail & contact) ---------- */
function initCopyMail(){
  document.addEventListener('click', async e=>{
    const btn=e.target.closest('[data-copy-mail]');
    if(!btn) return;
    let ok=false;
    try{ await navigator.clipboard.writeText(CFG.email); ok=true; }
    catch(err){ ok=copyTextFallback(CFG.email); }
    if(ok){
      const orig=btn.textContent;
      btn.textContent='Copied ✓'; btn.classList.add('copied');
      setTimeout(()=>{btn.textContent=orig; btn.classList.remove('copied');},1800);
    }
  });
}

/* ---------- contact: smooth scroll to inquiry form ---------- */
function initGotoForm(){
  document.querySelectorAll('[data-goto-form]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const form=document.getElementById('inquiryForm');
      if(form) form.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
}

/* ---------- static WhatsApp buttons (hero / float / CTA) ---------- */
function initWaLinks(){
  const generic = "Hi, I'd like a wholesale quote from JINGOX — MOQ and price, please.";
  document.querySelectorAll('[data-wa]').forEach(a=>{
    a.href = waLink(a.getAttribute('data-wa') || generic);
    if(waReady()){ a.target="_blank"; a.rel="noopener"; }
  });
}

/* ---------- year ---------- */
function initYear(){
  document.querySelectorAll('[data-year]').forEach(el=> el.textContent = new Date().getFullYear());
}

document.addEventListener('DOMContentLoaded', ()=>{
  initNav();
  initHome();
  initHomeFactory();
  initCollection();
  initDetail();
  initFaq();
  initForm();
  initCopyMail();
  initGotoForm();
  initWaLinks();
  initFloatGroup();
  initYear();
});

/* ============================================================
   JINGOX — main.js
   - Product catalog rendering (js/products.js)
   - Collection filters + search
   - Product detail template (?sku=)
   - WhatsApp / email intent links
   - Inquiry form (Web3Forms) + FAQ + mobile nav
   P4: Web3Forms key is connected (inquiry form sends to info@jingox.com).
   {{WHATSAPP_NUMBER}} is still a placeholder until the business number is set;
   until then WhatsApp buttons route to the contact page.
   ============================================================ */

const CFG = {
  brand: "JINGOX",
  email: "info@jingox.com",
  // Deploy-time: digits only, country code + number (e.g. 8613800000000)
  whatsapp: "{{WHATSAPP_NUMBER}}",
  // Web3Forms access key (https://web3forms.com, public client-side key)
  web3formsKey: "2918e864-3ffb-4b3c-913e-6fc4dd27cd94"
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
  return `Hi, I'm interested in ${p.name} (${p.sku}). Could you send the MOQ and price?`;
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

/* ---------- product card ---------- */
function productCard(p){
  const wa = waLink(productWaText(p));
  const mail = mailLink(`Inquiry: ${p.sku} ${p.name}`);
  return `<article class="product-card" data-platform="${esc(p.platformKey)}" data-type="${esc(p.type)}"
      data-search="${esc((p.sku+' '+p.name+' '+p.platformName+' '+p.type).toLowerCase())}">
    <a class="product-ph" href="product.html?sku=${encodeURIComponent(p.sku)}" aria-label="${esc(p.name)}">
      ${phIcon(74)}
      <span class="ph-sku">${esc(p.sku)}</span>
      <span class="ph-type">${esc(p.type)}</span>
    </a>
    <div class="product-body">
      <a class="product-name" href="product.html?sku=${encodeURIComponent(p.sku)}">${esc(p.name)}</a>
      <div class="product-tag"><span class="platform-tag">${esc(p.platformName)}</span></div>
      <div class="product-actions">
        <a class="pa-wa" target="_blank" rel="noopener" href="${wa}">WhatsApp</a>
        <a class="pa-mail" href="${mail}">Email</a>
      </div>
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
}

/* ---------- home ---------- */
function initHome(){
  const box = document.getElementById('homePlatforms');
  if(box){
    box.innerHTML = PLATFORMS.map(pl=>{
      const n = countBy('platformKey', pl.key);
      if(pl.soon){
        return `<div class="platform-card soon">
          <div class="picoico">${phIcon(26)}</div>
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
    feat.innerHTML = items.map(productCard).join('');
  }
}

/* ---------- collection page ---------- */
let activePlatform = "all", activeType = "all";
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
  const rows = [
    ["Material", p.material],
    ["Color", p.color],
    ["Net Weight", p.netWeight],
    ["Gross Weight", p.grossWeight],
    ["Package Size", p.packageSize],
    ["Carton Size", p.cartonSize],
    ["Carton Quantity", p.cartonQty],
    ["Packing Contents", p.packingContents]
  ];
  return rows.filter(r=>r[1]).map(r=>
    `<tr><th>${r[0]}</th><td>${esc(r[1])}</td></tr>`).join('');
}
function initDetail(){
  const wrap = document.getElementById('pd');
  if(!wrap) return;
  const sku = new URLSearchParams(location.search).get('sku');
  const p = sku ? bySku[sku] : null;
  const crumbName = document.getElementById('crumbName');
  if(!p){
    if(crumbName) crumbName.textContent = "Product not found";
    wrap.innerHTML = `<div class="empty-note" style="min-height:300px">
      <h2 style="margin-bottom:12px">Product not found</h2>
      <p style="margin-bottom:20px">The requested model is unavailable. Browse our full catalog.</p>
      <a class="btn btn-primary" href="products.html">Browse All Products</a></div>`;
    document.title = "Product Not Found | JINGOX";
    return;
  }
  if(crumbName) crumbName.textContent = p.sku;
  document.title = `${p.name} | JINGOX Wholesale`;
  const wa = waLink(productWaText(p));
  const mail = mailLink(`Inquiry: ${p.sku} ${p.name}`);
  const related = PRODUCTS.filter(x=>x.sku!==p.sku && (x.platformKey===p.platformKey || x.type===p.type))
    .slice(0,4);

  wrap.innerHTML = `
  <div class="pd">
    <div class="pd-gallery">
      <div class="pd-main-ph">${phIcon(128)}
        <span class="ph-sku" style="position:absolute;top:14px;left:14px;font-size:.78rem">${esc(p.sku)}</span>
      </div>
      <div class="pd-thumbs">
        ${[0,1,2,3].map(()=>`<div class="pd-thumb">${phIcon(28)}</div>`).join('')}
      </div>
      <p style="font-size:.8rem;color:var(--muted-2);margin-top:12px;text-align:center">
        Product photos are added during catalog upload (P6). Contact us for the latest image pack.</p>
    </div>
    <div class="pd-info">
      <span class="pd-sku">${esc(p.sku)}</span>
      <h1>${esc(p.name)}</h1>
      <div class="pd-compat">
        <span class="tag">${esc(p.platformName)}</span>
        <span class="tag purple">${esc(p.type)}</span>
      </div>
      <div class="pd-moq">✓ <span><b>MOQ: 1 piece accepted.</b> Buy a single sample or a bulk carton — contact us for factory pricing.</span></div>
      <div class="pd-cta">
        <a class="btn btn-primary" target="_blank" rel="noopener" href="${wa}">Get Quote on WhatsApp</a>
        <a class="btn btn-purple" href="${mail}">Email Inquiry</a>
      </div>

      <div class="pd-section">
        <h2>Description</h2>
        <div class="pd-desc">${renderDesc(p)}</div>
      </div>

      <div class="pd-section">
        <h2>Specifications</h2>
        <table class="spec-table">${specRows(p)}</table>
      </div>

      <div class="pd-section">
        <h2>Customization</h2>
        <div class="pd-desc"><p>We support OEM / ODM — custom color, packaging, logo and bundled sets. Tell us your target market and quantities, and our team will send a tailored quote.</p></div>
        <a class="btn btn-ghost" href="oem.html" style="margin-top:6px">Explore OEM Services</a>
      </div>
    </div>
  </div>

  <div class="section alt" style="padding:56px 0">
    <div class="container">
      <div class="section-head left"><h2 style="font-size:1.6rem">Related Products</h2></div>
      <div class="product-grid" id="relatedGrid">${related.map(productCard).join('')}</div>
    </div>
  </div>`;
}

/* ---------- FAQ accordion ---------- */
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
  initCollection();
  initDetail();
  initFaq();
  initForm();
  initWaLinks();
  initYear();
});

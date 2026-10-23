/* ============================================================
   JINGOX — sitemap 生成脚本（阶段3）
   用法：node tools/build-sitemap.js
   作用：生成 sitemap.xml，包含静态页 + 全部产品独立页 + 博客文章。
   URL 统一用无扩展名（canonical 最终 URL），与 Cloudflare Pages 落地地址一致。
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ORIGIN = 'https://jingox.com';
const ROOT = path.resolve(__dirname, '..');
const LASTMOD = new Date().toISOString().slice(0, 10);

// 读取产品数据
const src = fs.readFileSync(path.join(ROOT, 'js/products.js'), 'utf8');
const m = src.match(/window\.PRODUCTS\s*=\s*(\[[\s\S]*\]);?\s*$/);
const PRODUCTS = eval('(' + m[1] + ')');
const slug = (sku) => String(sku).toLowerCase().replace(/[^a-z0-9-]/g, '-');

// 静态页：[loc（无扩展名，首页为 ''）, changefreq, priority]
const staticPages = [
  ['', 'weekly', '1.0'],
  ['products', 'weekly', '0.9'],
  ['oem', 'monthly', '0.8'],
  ['about', 'monthly', '0.7'],
  ['contact', 'monthly', '0.7'],
  ['faq', 'monthly', '0.6'],
  ['blog', 'weekly', '0.6'],
  ['blog-switch2-charging-dock-guide', 'monthly', '0.55'],
  ['blog-bulk-order-checks', 'monthly', '0.55'],
  ['privacy', 'yearly', '0.3'],
  ['terms', 'yearly', '0.3'],
];

const entry = (loc, changefreq, priority) =>
  `  <url><loc>${ORIGIN}/${loc}</loc><lastmod>${LASTMOD}</lastmod>` +
  `<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

// 静态页
staticPages.forEach(([loc, cf, pr]) => { xml += entry(loc, cf, pr) + '\n'; });

// 全部产品独立页（核心收录目标）
PRODUCTS.forEach(p => {
  xml += entry(`product-${slug(p.sku)}`, 'weekly', '0.65') + '\n';
});

xml += '</urlset>\n';

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
console.log(`sitemap.xml 已生成：${staticPages.length} 静态页 + ${PRODUCTS.length} 产品页 = ${staticPages.length + PRODUCTS.length} 条 URL`);

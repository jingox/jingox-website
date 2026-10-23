/* ============================================================
   JINGOX — sitemap 生成脚本（阶段3）
   用法：node tools/build-sitemap.js
   作用：生成 sitemap.xml，包含静态页 + 全部产品独立页 + 博客文章。
   URL 统一用实际文件（.html），与内部链接/canonical 保持一致。
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

// 静态页：[loc, changefreq, priority]
const staticPages = [
  ['index.html', 'weekly', '1.0'],
  ['products.html', 'weekly', '0.9'],
  ['oem.html', 'monthly', '0.8'],
  ['about.html', 'monthly', '0.7'],
  ['contact.html', 'monthly', '0.7'],
  ['faq.html', 'monthly', '0.6'],
  ['blog.html', 'weekly', '0.6'],
  ['blog-switch2-charging-dock-guide.html', 'monthly', '0.55'],
  ['blog-bulk-order-checks.html', 'monthly', '0.55'],
  ['privacy.html', 'yearly', '0.3'],
  ['terms.html', 'yearly', '0.3'],
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
  xml += entry(`product-${slug(p.sku)}.html`, 'weekly', '0.65') + '\n';
});

xml += '</urlset>\n';

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
console.log(`sitemap.xml 已生成：${staticPages.length} 静态页 + ${PRODUCTS.length} 产品页 = ${staticPages.length + PRODUCTS.length} 条 URL`);

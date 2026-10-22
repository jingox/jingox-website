/* ============================================================
   JINGOX 构建工具：按真实像素给 products.js 的 images[] 标注 kind
   - 1:1 方图（宽高比误差 < 3%）→ kind:"main"   产品首屏主图（前端只取前 6 张）
   - 其他（竖版 / 横版详情长图）→ kind:"detail" 只在详情页长图区展示
   规则来源：2026-10-21 审核会议 D3（主图≤6 张、只放 1:1；长图归详情；主图详情不重复）。
   批量铺图后可重跑：node tools/scan-image-kind.js
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const dataJs = path.join(ROOT, 'js', 'products.js');
const SQUARE_TOL = 0.03;

function webpSize(buf) {
  const fmt = buf.toString('ascii', 12, 16);
  if (fmt === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
  if (fmt === 'VP8L') { const x = buf.readUInt32LE(21); return [(x & 0x3FFF) + 1, ((x >> 14) & 0x3FFF) + 1]; }
  if (fmt === 'VP8 ') return [buf.readUInt16LE(26) & 0x3FFF, buf.readUInt16LE(28) & 0x3FFF];
  // PNG fallback
  if (buf.toString('ascii', 1, 4) === 'PNG') return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  return null;
}

function sizeOf(rel) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) return null;
  try { return webpSize(fs.readFileSync(fp)); } catch (e) { return null; }
}

let txt = fs.readFileSync(dataJs, 'utf8');
const decl = txt.indexOf('window.PRODUCTS');
const eq = txt.indexOf('=', decl);
const arrStart = txt.indexOf('[', eq);
const arrEnd = txt.lastIndexOf(']');
const prefix = txt.slice(0, arrStart);
const list = JSON.parse(txt.slice(arrStart, arrEnd + 1));

let withImgs = 0;
const counts = { main: 0, detail: 0 };
for (const p of list) {
  if (!Array.isArray(p.images) || !p.images.length) continue;
  withImgs++;
  for (const im of p.images) {
    const sz = sizeOf(im.src);
    let kind = 'main';
    if (sz) {
      const [w, h] = sz;
      kind = (Math.abs(w / h - 1) < SQUARE_TOL) ? 'main' : 'detail';
    }
    im.kind = kind;
    counts[kind]++;
  }
}

fs.writeFileSync(dataJs, prefix + JSON.stringify(list, null, 2) + ';\n', 'utf8');
console.log(`Done. products with images: ${withImgs}; main(square): ${counts.main}, detail(long): ${counts.detail}`);

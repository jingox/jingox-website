/* 零依赖 Node 静态服务器（替代 python3 -m http.server 8899）
   用法：在仓库根目录运行  node static-server.js
   监听 http://127.0.0.1:8899，构建脚本 build-product-pages.js 依赖此地址。 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8899;
const ROOT = __dirname;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  let filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(filePath, (err, st) => {
    if (err) { res.writeHead(404); return res.end('404 Not Found: ' + urlPath); }
    if (st.isDirectory()) filePath = path.join(filePath, 'index.html');
    fs.readFile(filePath, (e, data) => {
      if (e) { res.writeHead(404); return res.end('404 Not Found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`静态服务器已启动：http://127.0.0.1:${PORT}  （根目录：${ROOT}）`);
  console.log('保持此窗口开着，构建完成后按 Ctrl+C 可关闭。');
});
//（注：内容由AI生成）

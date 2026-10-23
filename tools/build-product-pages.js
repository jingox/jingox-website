/* ============================================================
   JINGOX — 阶段3 产品页静态化构建脚本
   用法：node tools/build-product-pages.js
   前置：Chrome/Chromium 以 CDP 端口启动（默认 http://127.0.0.1:9222），
        且本地静态服务器已在 http://127.0.0.1:8899 运行。

   作用：为每款产品生成独立静态 HTML（product-<sku小写>.html），
   构建时注入该款 title/meta/canonical/JSON-LD/面包屑与渲染好的 #pd，
   复用现有详情模板。独立页 body 带 data-sku，main.js 据此重新绑定事件。
   ============================================================ */
const fs = require('fs');
const path = require('path');

const CDP_URL = 'http://127.0.0.1:9222';
const SITE_ORIGIN = 'http://127.0.0.1:8899';
const PUBLISH_ORIGIN = 'https://jingox.com';
const ROOT = path.resolve(__dirname, '..');

/* ---- 极简 CDP 客户端 ---- */
class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', () => res());
      this.ws.addEventListener('error', (e) => rej(e.message || new Error('ws error')));
    });
    this.ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id);
        this.pending.delete(m.id);
        if (m.error) reject(new Error(m.error.message));
        else resolve(m.result);
      }
    });
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression, awaitPromise = false) {
    const r = await this.send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise,
    });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception
        ? r.exceptionDetails.exception.description : r.exceptionDetails.text);
    }
    return r.result.value;
  }
  close() { this.ws.close(); }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// SKU 转文件名 slug：小写，非字母数字/连字符统一替换为 "-"（与 main.js productSlug 一致）
const slug = (sku) => String(sku).toLowerCase().replace(/[^a-z0-9-]/g, '-');

(async () => {
  const pages = await (await fetch(`${CDP_URL}/json`)).json();
  const target = pages.find(t => t.type === 'page');
  if (!target) throw new Error('CDP 中没有可用 page');
  const cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.ready;

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  // 桌面视口构建（独立页本身响应式，这里用桌面尺寸渲染）
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 900, deviceScaleFactor: 1, mobile: false,
  });

  // 先打开一次动态产品页，拿到全部 SKU（按 products.js 顺序）
  await cdp.send('Page.navigate', {
    url: `${SITE_ORIGIN}/product.html?sku=HA-8008&_build=${Date.now()}`,
  });
  await sleep(1500);
  const skus = await cdp.eval('window.PRODUCTS.map(p => p.sku)');
  console.log(`共 ${skus.length} 款产品，开始生成独立页...`);

  let ok = 0;
  for (const sku of skus) {
    const url = `${SITE_ORIGIN}/product.html?sku=${encodeURIComponent(sku)}&_build=${Date.now()}`;
    await cdp.send('Page.navigate', { url });
    // 等待渲染完成：#pd 内出现 .pd，且 title 已替换为产品标题
    for (let k = 0; k < 40; k++) {
      await sleep(150);
      const ready = await cdp.eval(
        `(function(){
          var pd=document.querySelector('#pd .pd');
          return !!(pd && document.title.indexOf('Product Detail')===-1
            && document.getElementById('crumbName').textContent.indexOf('${sku.replace(/'/g,"")}')!==-1);
        })()`
      );
      if (ready) break;
    }
    await sleep(200); // 等 JSON-LD/meta 注入收尾

    let html = await cdp.eval('"<!DOCTYPE html>\\n" + document.documentElement.outerHTML');

    // 1) body 加 data-sku（main.js 据此识别静态独立页）
    html = html.replace(
      /<body([^>]*?)>/,
      (m, attrs) => (m.includes('data-sku=')
        ? m
        : `<body${attrs} data-sku="${sku}">`)
    );
    // 2) canonical 指向独立页（动态渲染时被设成 product.html?sku=，这里改回自指）
    html = html.replace(
      /<link rel="canonical"[^>]*>/,
      `<link rel="canonical" href="${PUBLISH_ORIGIN}/product-${slug(sku)}.html">`
    );

    const outFile = path.join(ROOT, `product-${slug(sku)}.html`);
    fs.writeFileSync(outFile, html);
    ok++;
    if (ok % 10 === 0 || ok === skus.length) {
      console.log(`  已生成 ${ok}/${skus.length}`);
    }
  }

  cdp.close();
  console.log(`完成：生成 ${ok} 个独立产品页。`);
})().catch(e => { console.error('构建失败:', e); process.exit(1); });

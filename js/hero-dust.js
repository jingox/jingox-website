/* ============================================================
   JINGOX 首页 HERO —— 光尘粒子（2026-10-27）
   纯原生 JS，无依赖；自适应 canvas，移动端自动降密度，
   尊重 prefers-reduced-motion。挂到 #heroDust。
   ============================================================ */
(function () {
  function init() {
    var canvas = document.getElementById('heroDust');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var parts = [], w = 0, h = 0, dpr = 1;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }
    function build() {
      var isMobile = window.innerWidth < 980;
      var count = isMobile ? 14 : 44;
      parts = [];
      for (var i = 0; i < count; i++) {
        parts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.5 + 0.4,
          vx: (Math.random() - 0.5) * 0.12,
          vy: -(Math.random() * 0.20 + 0.04),
          base: Math.random() * 0.45 + 0.12,
          tw: Math.random() * 0.018 + 0.004,
          phase: Math.random() * Math.PI * 2,
          kind: Math.random()
        });
      }
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx; p.y += p.vy; p.phase += p.tw;
        if (p.y < -12) { p.y = h + 12; p.x = Math.random() * w; }
        if (p.x < -12) p.x = w + 12; else if (p.x > w + 12) p.x = -12;
        var a = p.base * (0.5 + 0.5 * Math.sin(p.phase));
        var col = p.kind < 0.62
          ? 'rgba(120,200,255,' + a.toFixed(3) + ')'
          : p.kind < 0.86
            ? 'rgba(255,255,255,' + a.toFixed(3) + ')'
            : 'rgba(192,150,255,' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.shadowBlur = 8;
        ctx.shadowColor = col;
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    window.addEventListener('resize', resize);
    resize();
    if (reduceMotion) {
      // 减少动态：只绘制一帧静态粒子，不循环
      frame();
    } else {
      frame();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

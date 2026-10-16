/* bloom.js — flowers pop up at random spots and pile up behind a section, then fade out and start again.
   Used behind: the phone bar, the header, the slideshow band and the contact band.
   STYLE "photos" = the real flower pictures from assets/image/ packed edge to edge (rose, carnation, gerbera, lisianthus, baby's breath)
   STYLE "drawn"  = drawn flowers (lavender, pink, yellow, coral, white with a golden centre) */
(function () {
  var STYLE = "photos";

  var PAL = ["#ada3e8", "#eeb6cc", "#f0d86c", "#e58f7d", "#ffffff"];
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cache = {};

  /* one drawn flower, the way the bloom animation draws it: wide petals set in a slight swirl, each with a thin outline, and a golden centre */
  var OUT = { "#ada3e8": "#8f85c6", "#eeb6cc": "#c996ae", "#f0d86c": "#c9b04e", "#e58f7d": "#b9705f", "#ffffff": "#cdc8c2" };   // petal colour -> outline colour
  function uri(color, n) {
    var k = color + n; if (cache[k]) return cache[k];
    var s = "", i;
    for (i = 0; i < n; i++)
      s += '<ellipse cx="50" cy="26" rx="13.4" ry="24.5" transform="rotate(' + (360 / n * i).toFixed(1) + ' 50 50) rotate(26 50 26)" fill="' + color + '" stroke="' + OUT[color] + '" stroke-width=".8"/>';
    s += '<circle cx="50" cy="50" r="7.6" fill="#d3993a"/>';
    return (cache[k] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' + s + "</svg>"));
  }

  /* real flower photos from assets/image/ (the round ones, plus baby's breath as filler) */
  var FLOWERS = ["rose-red", "carnation-pink", "carnation-yellow", "gerbera-pink", "gerbera-yellow", "lisianthus-violet", "babys-breath"];
  var IMG = window.__FLOWER_IMGS || {};
  function photo(f) { return IMG[f] || ("assets/image/" + f + ".webp"); }
  if (STYLE === "photos") FLOWERS.forEach(function (f) { new Image().src = photo(f); });

  function Bloom(host, o) {
    var layer = document.createElement("div"), timer = 0, running = false, count = 0, max = 0;
    layer.className = "bloom-bg"; layer.setAttribute("aria-hidden", "true");
    /* loose text directly inside the section (e.g. the footer line) goes in a span so it stays above the flowers */
    [].slice.call(host.childNodes).forEach(function (n) {
      if (n.nodeType === 3 && n.textContent.trim()) { var sp = document.createElement("span"); sp.className = "bloom-txt"; host.replaceChild(sp, n); sp.appendChild(n); }
    });
    host.classList.add("bloom-host"); host.insertBefore(layer, host.firstChild);

    function clear() { clearTimeout(timer); clearInterval(timer); }
    /* spread the flowers over the section (a jittered grid, shuffled), but keep them off the content (o.avoid) so everything stays readable */
    function spots() {
      var r = host.getBoundingClientRect(), w = Math.max(r.width, 1), h = Math.max(r.height, 1), avg = (o.min + o.max) / 2,
          cell = Math.max(avg * o.gap, Math.sqrt(w * h / 160)), cols = Math.ceil(w / cell) + 1, rows = Math.ceil(h / cell) + 1, out = [], boxes = [], c, k;
      (o.avoid || []).forEach(function (sel) {
        host.querySelectorAll(sel).forEach(function (el) {
          var b = el.getBoundingClientRect(); if (b.width < 2 || b.height < 2) return;
          boxes.push([b.left - r.left - o.pad, b.top - r.top - o.pad, b.right - r.left + o.pad, b.bottom - r.top + o.pad]);
        });
      });
      for (k = 0; k < rows; k++) for (c = 0; c < cols; c++) {
        var x = (c + (Math.random() - .5) * .9) * cell, y = (k + (Math.random() - .5) * .9) * cell, px = o.min + Math.random() * (o.max - o.min), rad = px * .42, hit = false;
        boxes.forEach(function (q) {   // circle vs rectangle
          var dx = Math.max(q[0] - x, 0, x - q[2]), dy = Math.max(q[1] - y, 0, y - q[3]);
          if (dx * dx + dy * dy < rad * rad) hit = true;
        });
        if (!hit) out.push([x / w * 100, y / h * 100, px]);
      }
      for (k = out.length - 1; k > 0; k--) { var j = Math.random() * (k + 1) | 0, t = out[k]; out[k] = out[j]; out[j] = t; }
      return out;
    }
    var plan = [];
    function add() {
      var img = new Image(), pos = plan[count], px = pos[2], rot = Math.random() * 360 | 0, op = STYLE === "photos" ? o.opP : o.op;
      img.alt = ""; img.draggable = false; img.className = "bloom-f";
      img.src = STYLE === "photos" ? photo(FLOWERS[Math.random() * FLOWERS.length | 0]) : uri(PAL[Math.random() * PAL.length | 0], [8, 9, 10][Math.random() * 3 | 0]);
      img.style.cssText = "width:" + px.toFixed(0) + "px;left:" + pos[0].toFixed(1) + "%;top:" + pos[1].toFixed(1) + "%;--r:" + rot + "deg;--o:" + op;
      layer.appendChild(img); count++;
    }
    function cycle() {
      if (!running) return;
      layer.classList.remove("fading"); layer.innerHTML = ""; count = 0; plan = spots(); max = plan.length;
      if (reduce) { layer.classList.add("static"); while (count < max) add(); return; }
      var iv = Math.max(12, Math.min(200, o.fill / max));
      timer = setInterval(function () {
        if (count < max) return add();
        clear();
        timer = setTimeout(function () { layer.classList.add("fading"); timer = setTimeout(cycle, 1500); }, o.hold);
      }, iv);
    }
    function start() { if (running) return; running = true; cycle(); }
    function stop() { running = false; clear(); }

    if ("IntersectionObserver" in window)
      new IntersectionObserver(function (e) { e[0].isIntersecting && !document.hidden ? start() : stop(); }, { threshold: 0.05 }).observe(host);
    else start();
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  }

  /* min/max = flower size in px, gap = how tightly they are packed (bigger = fewer flowers), avoid = parts of the section the flowers stay away from (pad = extra room in px),
     fill = ms to build up, hold = ms to stay full, op / opP = opacity of the drawn / photo flowers */
  /* the phone bar and the header share ONE flower layer, so the flowers run across the line between them */
  var tb = document.querySelector(".topbar"), hd = document.querySelector("header.top");
  if (tb && hd && tb.nextElementSibling === hd) {
    var wrap = document.createElement("div"); wrap.className = "bloom-top";
    tb.parentNode.insertBefore(wrap, tb); wrap.appendChild(tb); wrap.appendChild(hd);
  }

  [
    ["top", ".bloom-top", null, { min: 40, max: 76, gap: .95, pad: 12, avoid: [".topbar>span", ".toplinks", ".brand", ".acct"], op: .9, opP: 1, fill: 1500, hold: 6000 }],
    /* login page: the header + "My account" banner, and the footer */
    ["auth", ".auth-top", null, { min: 50, max: 90, gap: .95, pad: 14, avoid: [".home-link", ".logo", ".themebtn", ".banner h1", ".crumb"], op: .9, opP: 1, fill: 1500, hold: 6000 }],
    ["authfoot", ".auth-page footer.foot", null, { min: 30, max: 54, gap: .95, pad: 10, avoid: [".bloom-txt"], op: .9, opP: 1, fill: 1200, hold: 6000 }],
    ["slideshow", "#featured", ".band", { min: 100, max: 170, gap: .85, pad: 18, avoid: [".awrap", ".apeek"], op: .92, opP: 1, fill: 1800, hold: 6000 }],
    ["contact", "#contact", ".band", { min: 90, max: 150, gap: .85, pad: 16, avoid: ["h2", ".sub", ".cards"], op: .92, opP: 1, fill: 1800, hold: 6000 }]
  ].forEach(function (c) {
    var el = document.querySelector(c[1]); if (el && c[2]) el = el.closest(c[2]);
    if (el) new Bloom(el, c[3]);
  });
})();
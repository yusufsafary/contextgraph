// Contextgraph upgrade layer: homepage life (Fig. 2 phyllotaxis field,
// seal ring, ledger counters, live Node feed, mini Graph explorer,
// tilt + parallax micro-interactions). All numbers from live chain
// reads via CTXFX (sequential single eth_calls). Additive: board.js
// and its Fig. 1 plate are untouched.
(function () {
  "use strict";
  var FX = window.CTXFX;
  if (!FX) return;
  var REDUCED = FX.REDUCED;
  var N = FX.CFG.nodes.address, C = FX.CFG.claim.address, SEL = FX.SEL;
  var $ = function (id) { return document.getElementById(id); };
  var GA = Math.PI * (3 - Math.sqrt(5)); // golden angle

  var state = { graph: 0, nodesToday: 0, total: 0, claimed: 0, end: 0, start: 0 };

  /* ================= seal progress ring ================= */
  var RING_C = 2 * Math.PI * 26;
  function mountRing() {
    var sealEl = $("b-seal");
    if (!sealEl) return;
    var cell = sealEl.closest(".cell");
    if (!cell || cell.querySelector(".seal-ring")) return;
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "seal-ring");
    svg.setAttribute("viewBox", "0 0 60 60");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<circle class="ring-bg" cx="30" cy="30" r="26"></circle>' +
      '<circle class="ring-fg" cx="30" cy="30" r="26" stroke-dasharray="' + RING_C.toFixed(1) +
      '" stroke-dashoffset="' + RING_C.toFixed(1) + '"></circle>';
    cell.appendChild(svg);
  }
  function tickRing() {
    var fg = document.querySelector(".seal-ring .ring-fg");
    if (!fg || !state.end || !state.start) return;
    var now = Date.now() / 1000;
    var f = Math.max(0, Math.min(1, (now - state.start) / (state.end - state.start)));
    fg.style.strokeDashoffset = (RING_C * (1 - f)).toFixed(1);
  }
  setInterval(tickRing, 1000);

  /* ================= Fig. 2 phyllotaxis field ================= */
  var phy = null; // {graph, target, shown, pts, running, hover}
  function phyPoints(count) {
    var cv = $("phyto-canvas");
    var W = cv.width, H = cv.height;
    var n = Math.min(count, 1600);
    var cx = W / 2, cy = H / 2;
    var c = (Math.min(W, H) / 2 - 16) / Math.sqrt(Math.max(1, n));
    var pts = [];
    for (var i = 0; i < n; i++) {
      var r = c * Math.sqrt(i + 0.5), a = GA * i;
      pts.push({
        x: cx + r * Math.cos(a), y: cy + r * Math.sin(a),
        hub: (i * 2654435761) % 1000 >= 970, birth: 0,
      });
    }
    return pts;
  }
  function phyShow(count, graph) {
    var cv = $("phyto-canvas");
    if (!cv) return;
    var now = performance.now();
    if (!phy || phy.graph !== graph) {
      phy = { graph: graph, target: count, pts: phyPoints(count), hover: -1, running: false };
      phy.pts.forEach(function (p, i) { p.birth = now + i * 1.6; });
    } else if (count !== phy.target) {
      var old = phy.pts.length;
      phy.target = count;
      phy.pts = phyPoints(count);
      phy.pts.forEach(function (p, i) { p.birth = i < old ? now - 1000 : now + (i - old) * 30; });
    }
    var cap = $("phyto-nodes");
    if (cap) cap.textContent = "NODES DRAWN · " + FX.fmt(phy.pts.length) + " OF " + FX.fmt(count);
    if (!phy.running) { phy.running = true; requestAnimationFrame(phyLoop); }
  }
  var phyVisible = true;
  function phyLoop(ts) {
    var cv = $("phyto-canvas");
    if (!cv || !phy) { if (phy) phy.running = false; return; }
    if (!phyVisible && !REDUCED) { phy.running = false; return; } // pause offscreen
    var ctx = cv.getContext("2d");
    var W = cv.width, H = cv.height;
    var now = REDUCED ? Infinity : ts;
    ctx.clearRect(0, 0, W, H);
    var pts = phy.pts;
    // predecessor links, drawn once a pair has been born
    ctx.lineWidth = 1;
    for (var i = 1; i < pts.length; i++) {
      var a = Math.min(ageOf(pts[i], now), ageOf(pts[i - 1], now));
      if (a <= 0) continue;
      ctx.strokeStyle = "rgba(36,56,255," + (0.13 * a).toFixed(3) + ")";
      ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
    }
    for (var j = 0; j < pts.length; j++) {
      var p = pts[j], ag = ageOf(p, now);
      if (ag <= 0) continue;
      var ease = 1 - Math.pow(1 - ag, 3);
      var breathe = p.hub && !REDUCED ? 1.6 * Math.sin(ts / 430 + j * 1.3) : 0;
      var r = (p.hub ? 5.2 : 3.1) * ease + (p.hub ? breathe * ease : 0);
      if (r <= 0.4) continue;
      if (p.hub) {
        ctx.fillStyle = "rgba(36,56,255,0.18)";
        ctx.beginPath(); ctx.arc(p.x, p.y, r + 5, 0, 6.2832); ctx.fill();
        ctx.fillStyle = "#2438ff";
        ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
        ctx.fillStyle = "#f4efe6";
        ctx.fillRect(p.x - 1.6, p.y - 1.6, 3.2, 3.2);
      } else {
        ctx.fillStyle = "#f4efe6";
        ctx.strokeStyle = "#14161a";
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.rect(p.x - r, p.y - r, r * 2, r * 2); ctx.fill(); ctx.stroke();
      }
    }
    if (phy.hover >= 0 && pts[phy.hover]) {
      var hp = pts[phy.hover];
      ctx.strokeStyle = "#2438ff"; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.rect(hp.x - 9, hp.y - 9, 18, 18); ctx.stroke();
      if (phy.hover > 0) {
        ctx.beginPath(); ctx.moveTo(pts[phy.hover - 1].x, pts[phy.hover - 1].y); ctx.lineTo(hp.x, hp.y); ctx.stroke();
      }
    }
    if (!REDUCED) requestAnimationFrame(phyLoop);
    else phy.running = false;
  }
  function ageOf(p, now) { return Math.max(0, Math.min(1, (now - p.birth) / 300)); }
  function phyPointer(e) {
    var cv = $("phyto-canvas");
    if (!cv || !phy) return;
    var rect = cv.getBoundingClientRect();
    var x = ((e.clientX - rect.left) / rect.width) * cv.width;
    var y = ((e.clientY - rect.top) / rect.height) * cv.height;
    var best = -1, bd = 30 * 30;
    phy.pts.forEach(function (p, i) {
      var dd = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
      if (dd < bd) { bd = dd; best = i; }
    });
    phy.hover = best;
    var hov = $("phyto-hover");
    if (hov) hov.textContent = best >= 0 ? "POINT Nº " + (best + 1) + (phy.pts[best].hub ? " · HUB CLASS" : "") : "";
    if (REDUCED) { phy.running = true; requestAnimationFrame(phyLoop); }
  }

  /* ================= live Node feed ================= */
  var feedBase = null; // {total, graph}
  function feedItem(html, cls) {
    var ul = $("feed-list");
    if (!ul) return;
    var li = document.createElement("li");
    if (cls) li.className = cls;
    li.innerHTML = html;
    ul.insertBefore(li, ul.firstChild);
    while (ul.children.length > 8) ul.removeChild(ul.lastChild);
  }
  function seedFeed(total, graph) {
    var ul = $("feed-list");
    if (!ul) return;
    ul.innerHTML = "";
    var from = Math.max(1, total - 5);
    for (var id = total; id >= from; id--) {
      var li = document.createElement("li");
      li.innerHTML = "<span>Node #" + FX.fmt(id) + " joined Graph Nº " + graph + "</span><span class='fg'>on chain</span>";
      ul.appendChild(li);
    }
    if (total === 0) {
      var li0 = document.createElement("li");
      li0.innerHTML = "<span>Awaiting first Node of Graph Nº " + graph + "</span><span class='fg'>live</span>";
      ul.appendChild(li0);
    }
  }
  async function pollFeed() {
    try {
      var total = FX.asInt(await FX.call(N, SEL.totalNodes));
      var g = FX.asInt(await FX.call(N, SEL.currentGraph));
      if (feedBase === null) { feedBase = { total: total, graph: g }; seedFeed(total, g); return; }
      if (g !== feedBase.graph) {
        feedItem("<span>Graph Nº " + feedBase.graph + " sealed · Graph Nº " + g + " opened</span><span class='fg'>09:00 UTC</span>", "seal-note fresh");
        feedBase = { total: total, graph: g };
        return;
      }
      if (total > feedBase.total) {
        var k = total - feedBase.total;
        var show = Math.min(k, 5);
        for (var id = total; id > total - show; id--) {
          feedItem("<span>Node #" + FX.fmt(id) + " joined Graph Nº " + g + "</span><span class='fg'>just now</span>", "fresh");
        }
        if (k > show) feedItem("<span>+" + (k - show) + " more Nodes</span><span class='fg'>just now</span>", "fresh");
        feedBase.total = total;
      }
    } catch (e) { /* keep last good feed */ }
  }

  /* ================= main refresh (sequential) ================= */
  async function refresh() {
    try {
      var g = FX.asInt(await FX.call(N, SEL.currentGraph));
      if (!g) return;
      var nodesToday = FX.asInt(await FX.call(N, SEL.nodesInGraph + FX.pad32(g)));
      var total = FX.asInt(await FX.call(N, SEL.totalNodes));
      var claimed = FX.asInt(await FX.call(C, SEL.totalClaimed));
      var end = FX.asInt(await FX.call(N, SEL.graphEnd + FX.pad32(g)));
      state = {
        graph: g, nodesToday: nodesToday, total: total, claimed: claimed,
        end: end, start: FX.CFG.genesisStart + (g - 1) * 86400,
      };
      phyShow(nodesToday, g);
      tickRing();
      var sealed = Math.max(0, total - nodesToday);
      FX.tweenNum($("l-total"), total);
      FX.tweenNum($("l-sealed"), sealed);
      FX.tweenNum($("l-claimed"), claimed);
      FX.tweenNum($("l-unclaimed"), Math.max(0, sealed - claimed));
      var lg = $("l-graph-lab");
      if (lg) lg.textContent = "Across all Graphs · running Nº " + g;
    } catch (e) { /* keep last good render */ }
  }

  /* ================= mini Graph explorer ================= */
  var XN = 220, xPts = [], xHover = -1, xRunning = false, xVisible = true;
  function buildExplorer() {
    var cv = $("x-canvas");
    if (!cv) return;
    var W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    var c = (Math.min(W, H) / 2 - 14) / Math.sqrt(XN);
    for (var i = 0; i < XN; i++) {
      var r = c * Math.sqrt(i + 0.5), a = GA * i;
      xPts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), hub: (i * 2654435761) % 1000 >= 970, near: -1 });
    }
    xPts.forEach(function (p, i) {
      var bd = 1e12;
      xPts.forEach(function (q, j) {
        if (i === j) return;
        var dd = (q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y);
        if (dd < bd) { bd = dd; p.near = j; }
      });
    });
  }
  function xDraw(ts) {
    var cv = $("x-canvas");
    if (!cv) { xRunning = false; return; }
    if (!xVisible && !REDUCED) { xRunning = false; return; }
    var ctx = cv.getContext("2d");
    var W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (var i = 1; i < XN; i++) {
      var hot = xHover >= 0 && (i === xHover || i - 1 === xHover || xPts[xHover].near === i || xPts[xHover].near === i - 1);
      ctx.strokeStyle = hot ? "rgba(36,56,255,0.85)" : "rgba(20,22,26,0.20)";
      ctx.beginPath(); ctx.moveTo(xPts[i - 1].x, xPts[i - 1].y); ctx.lineTo(xPts[i].x, xPts[i].y); ctx.stroke();
    }
    if (xHover >= 0 && xPts[xHover].near >= 0) {
      ctx.strokeStyle = "rgba(36,56,255,0.85)"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(xPts[xHover].x, xPts[xHover].y);
      ctx.lineTo(xPts[xPts[xHover].near].x, xPts[xPts[xHover].near].y); ctx.stroke();
    }
    xPts.forEach(function (p, i) {
      var isHov = i === xHover;
      var breathe = p.hub && !REDUCED ? 1.3 * Math.sin(ts / 430 + i * 1.3) : 0;
      var r = (p.hub ? 5 : 3.4) + (isHov ? 2.4 : 0) + breathe;
      if (p.hub) {
        ctx.fillStyle = "#2438ff";
        ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
        ctx.fillStyle = "#f4efe6"; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      } else {
        ctx.fillStyle = isHov ? "#2438ff" : "#f4efe6";
        ctx.strokeStyle = isHov ? "#2438ff" : "#14161a"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.rect(p.x - r, p.y - r, r * 2, r * 2); ctx.fill(); ctx.stroke();
      }
      if (isHov) {
        ctx.strokeStyle = "#2438ff"; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.rect(p.x - r - 5, p.y - r - 5, (r + 5) * 2, (r + 5) * 2); ctx.stroke();
      }
    });
    if (!REDUCED) requestAnimationFrame(xDraw);
    else xRunning = false;
  }
  function xReadout(i) {
    var out = $("x-readout");
    if (!out) return;
    if (i < 0) {
      out.innerHTML = '<span class="big">Survey the field</span><br>Hover or tap any point. Its spiral neighbours light up in cobalt.<br><br>Kind odds per Node: <span class="cob">Root 1 in 3 · Bridge 1 in 3 · Leaf 1 in 3</span><br>Hub chance: <span class="cob">30 in 1,000</span> (seed % 1000 ≥ 970)';
      return;
    }
    var p = xPts[i];
    var arm = ((i % 34) + 1);
    out.innerHTML =
      '<span class="big">Point Nº ' + (i + 1) + ' of ' + XN + '</span><br>' +
      "Spiral position " + (i + 1) + " · arm " + arm + " of the golden-angle field" + (p.hub ? '<br>Shown in <span class="cob">Hub class</span> in this model (about 3 in 100 points)' : "") +
      '<br>Linked to point Nº ' + (i === 0 ? "—" : i) + ' and Nº ' + (p.near + 1) +
      '<br><br>Kind odds: <span class="cob">Root 1 in 3 · Bridge 1 in 3 · Leaf 1 in 3</span>' +
      '<br>Hub chance: <span class="cob">30 in 1,000</span> (seed % 1000 ≥ 970)' +
      '<br><br>Statistical model only. A real Node has its kind and class fixed by its seed on chain.';
  }
  function xPointer(e) {
    var cv = $("x-canvas");
    if (!cv) return;
    var rect = cv.getBoundingClientRect();
    var x = ((e.clientX - rect.left) / rect.width) * cv.width;
    var y = ((e.clientY - rect.top) / rect.height) * cv.height;
    var best = -1, bd = 34 * 34;
    xPts.forEach(function (p, i) {
      var dd = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
      if (dd < bd) { bd = dd; best = i; }
    });
    if (best !== xHover) { xHover = best; xReadout(best); }
    if (REDUCED) { xRunning = true; requestAnimationFrame(xDraw); }
  }

  /* ================= tilt + parallax ================= */
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  function mountTilt() {
    if (!finePointer || REDUCED) return;
    document.querySelectorAll(".platefig, .claimbox, .rung, .phyto").forEach(function (el) {
      el.classList.add("tiltable");
      var raf = 0;
      el.addEventListener("pointermove", function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var r = el.getBoundingClientRect();
          var dx = (e.clientX - r.left) / r.width - 0.5;
          var dy = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = "perspective(900px) rotateX(" + (-dy * 2.4).toFixed(2) + "deg) rotateY(" + (dx * 2.4).toFixed(2) + "deg)";
        });
      });
      el.addEventListener("pointerleave", function () {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        el.style.transform = "";
      });
    });
  }
  function mountParallax() {
    if (REDUCED) return;
    var cv = $("plate-canvas");
    if (!cv) return;
    var ticking = false;
    function apply() {
      ticking = false;
      var r = cv.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      var off = Math.max(-8, Math.min(8, (window.scrollY || 0) * 0.03));
      cv.style.transform = "translateY(" + off.toFixed(1) + "px) scale(1.015)";
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    }, { passive: true });
  }

  /* ================= boot ================= */
  document.addEventListener("DOMContentLoaded", function () {
    mountRing();
    refresh();
    setInterval(refresh, 30000);
    pollFeed();
    setInterval(pollFeed, 20000);
    var pc = $("phyto-canvas");
    if (pc) {
      pc.addEventListener("pointermove", phyPointer);
      pc.addEventListener("pointerdown", phyPointer);
      pc.addEventListener("pointerleave", function () {
        if (phy) phy.hover = -1;
        var hov = $("phyto-hover");
        if (hov) hov.textContent = "";
        if (REDUCED && phy) { phy.running = true; requestAnimationFrame(phyLoop); }
      });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (en) {
            phyVisible = en.isIntersecting;
            if (phyVisible && phy && !phy.running && !REDUCED) { phy.running = true; requestAnimationFrame(phyLoop); }
          });
        }, { threshold: 0.05 }).observe(pc);
      }
    }
    buildExplorer();
    xReadout(-1);
    var xc = $("x-canvas");
    if (xc) {
      xc.addEventListener("pointermove", xPointer);
      xc.addEventListener("pointerdown", xPointer);
      xc.addEventListener("pointerleave", function () {
        xHover = -1; xReadout(-1);
        if (REDUCED) { xRunning = true; requestAnimationFrame(xDraw); }
      });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (en) {
            xVisible = en.isIntersecting;
            if (xVisible && !xRunning && !REDUCED) { xRunning = true; requestAnimationFrame(xDraw); }
          });
        }, { threshold: 0.05 }).observe(xc);
      }
      xRunning = true;
      requestAnimationFrame(xDraw);
    }
    mountTilt();
    mountParallax();
  });
})();

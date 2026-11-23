// Contextgraph upgrade layer: shared effects (all pages).
// 1) Arms the safe reveal (html.fx-on) — CSS hides .rv ONLY when armed,
//    and everything is force-revealed after ~1.6s as a fallback.
// 2) Shared sequential RPC helper + count-up tween for upgrade widgets.
// 3) Header live chip: current Graph number + node count.
(function () {
  "use strict";
  document.documentElement.classList.add("fx-on");
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- safe reveal: own observer + hard fallback ---------- */
  function revealAll() {
    document.querySelectorAll(".rv:not(.in)").forEach(function (el) { el.classList.add("in"); });
  }
  if ("IntersectionObserver" in window && !REDUCED) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    var watch = function () {
      document.querySelectorAll(".rv:not(.in)").forEach(function (el) { io.observe(el); });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watch);
    else watch();
    // Timed fallback: nothing may stay invisible.
    setTimeout(revealAll, 1600);
    setTimeout(revealAll, 4000);
  } else {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", revealAll);
    else revealAll();
    setTimeout(revealAll, 1600);
  }

  /* ---------- shared chain access (sequential single eth_calls) ---------- */
  var CFG = window.CONFIG || {
    token: { address: "0x9E1A59c0e073B12E0546f1321eA4cb5A51C71b88" },
    nodes: { address: "0x08b1323a74530BEDd2188b458eBcC856315d8E0f" },
    claim: { address: "0x51A0d0617e76548906040c1Df7466934083980D8" },
    genesisStart: 1794819600,
    rpcs: [
      "https://bsc-dataseed.binance.org",
      "https://bsc.publicnode.com",
      "https://bsc-dataseed1.defibit.io",
    ],
  };
  var SEL = {
    currentGraph: "0x87f38529", totalNodes: "0x9592d424",
    nodesInGraph: "0x1b2ed607", participantsOf: "0xe200c857",
    verdictOf: "0xbcaa6cf7", graphEnd: "0x5f348a41", graphOf: "0x69e96bb2",
    kindOf: "0x2345e28c", isHub: "0x32e282f6", isSealed: "0x2c1758c1",
    totalClaimed: "0xd54ad2a1", claimable: "0xd1d58b25",
    claimAmount: "0x23b221a0", feeFor: "0xad6f49a3", balanceOf: "0x70a08231",
  };
  function pad32(n) { return BigInt(n).toString(16).padStart(64, "0"); }
  // Sequential across RPCs: one endpoint at a time, first success wins.
  // (Parallel racing is avoided on purpose: BSC RPCs throttle bursts.)
  async function call(to, data) {
    var body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: to, data: data }, "latest"] });
    var lastErr = null;
    for (var i = 0; i < CFG.rpcs.length; i++) {
      try {
        var r = await fetch(CFG.rpcs[i], { method: "POST", headers: { "Content-Type": "application/json" }, body: body });
        var j = await r.json();
        if (j && j.result && j.result !== "0x") return j.result;
        lastErr = new Error("empty result");
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("rpc failed");
  }
  function asInt(hex) { return Number(BigInt(hex)); }
  function fmt(n) { return n.toLocaleString("en-US"); }

  /* ---------- count-up tween ---------- */
  var tweens = new WeakMap();
  function tweenNum(el, to, format) {
    if (!el) return;
    format = format || fmt;
    var prev = tweens.get(el);
    var from = prev ? prev.cur : 0;
    if (prev && prev.raf) cancelAnimationFrame(prev.raf);
    if (REDUCED || from === to) { el.textContent = format(to); tweens.set(el, { cur: to, raf: 0 }); return; }
    var state = { cur: from, raf: 0 };
    tweens.set(el, state);
    var t0 = performance.now(), dur = 950;
    var step = function (t) {
      var k = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      state.cur = Math.round(from + (to - from) * e);
      el.textContent = format(state.cur);
      if (k < 1) state.raf = requestAnimationFrame(step);
    };
    state.raf = requestAnimationFrame(step);
  }

  window.CTXFX = {
    call: call, pad32: pad32, asInt: asInt, fmt: fmt, tweenNum: tweenNum,
    SEL: SEL, CFG: CFG, REDUCED: REDUCED,
  };

  /* ---------- header live chip ---------- */
  function mountChip() {
    var nav = document.querySelector("header.site nav");
    if (!nav || document.getElementById("hdr-chip")) return;
    var chip = document.createElement("span");
    chip.className = "hdr-chip";
    chip.id = "hdr-chip";
    chip.innerHTML = '<span class="dot"></span><span id="hdr-chip-txt">GRAPH ···</span>';
    nav.appendChild(chip);
  }
  async function refreshChip() {
    var txt = document.getElementById("hdr-chip-txt");
    if (!txt) return;
    try {
      var g = asInt(await call(CFG.nodes.address, SEL.currentGraph));
      if (!g) return;
      var n = asInt(await call(CFG.nodes.address, SEL.nodesInGraph + pad32(g)));
      txt.textContent = "GRAPH Nº " + g + " · " + fmt(n) + " NODES";
    } catch (e) { /* keep last good text */ }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { mountChip(); refreshChip(); });
  } else { mountChip(); refreshChip(); }
  setInterval(refreshChip, 60000);
})();

// Contextgraph upgrade layer: Whitepaper — scroll progress bar +
// interactive daily-cycle stepper (Forming, Sealed, Claims open,
// Next Graph). The NOW marker follows the UTC clock: a Graph seals
// 09:00 UTC and its claims open at the next phase boundary, 12:00 UTC.
(function () {
  "use strict";
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- scroll progress (transform only, rAF-throttled) ---------- */
  var bar = document.createElement("div");
  bar.className = "wp-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  var ticking = false;
  function applyProgress() {
    ticking = false;
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var f = max > 0 ? Math.min(1, (h.scrollTop || 0) / max) : 0;
    bar.style.transform = "scaleX(" + f.toFixed(4) + ")";
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(applyProgress); }
  }, { passive: true });
  applyProgress();

  /* ---------- daily-cycle stepper ---------- */
  var DETAIL = {
    forming: {
      t: "Stage 1 · Forming",
      b: "A Graph opens at 09:00 UTC and draws for 24 hours. Agent ID wallets mint Nodes into it: first Node free with the anti-bot answer, then 0.0002 / 0.0004 BNB up to 10 per wallet. Every mint lands in the same shared drawing.",
    },
    sealed: {
      t: "Stage 2 · Sealed",
      b: "At 09:00 UTC the Graph seals forever. Its verdict is fixed by unique agents: under 25 Isolated, 25 to 100 Linked, over 100 Networked. No Node can be added, moved or redrawn after the seal.",
    },
    claims: {
      t: "Stage 3 · Claims open",
      b: "One claim phase (6 hours) after the seal, claims open: a 09:00 UTC seal pays from 12:00 UTC the same day. Each sealed Node claims once at its verdict rate (2,500 / 12,500 / 60,000 CTX), Hubs 250,000 CTX. Claims never expire and Nodes are never burned.",
    },
    next: {
      t: "Stage 4 · Next Graph",
      b: "The moment one Graph seals, the next opens and starts drawing. Plates accumulate daily: every Graph keeps its own Nodes, verdict and claim record, readable on chain forever.",
    },
  };
  function nowStage() {
    var h = new Date().getUTCHours();
    // 09:00–12:00 UTC: latest Graph has just sealed, claims pending.
    // Otherwise its claims are open (the running Graph is always forming).
    return h >= 9 && h < 12 ? "sealed" : "claims";
  }
  document.addEventListener("DOMContentLoaded", function () {
    var steps = document.querySelectorAll(".stepper .step");
    var dt = document.getElementById("sd-t");
    var db = document.getElementById("sd-b");
    if (!steps.length || !dt || !db) return;
    var now = nowStage();
    function select(key, focusEl) {
      steps.forEach(function (s) {
        var on = s.dataset.stage === key;
        s.classList.toggle("sel", on);
        if (s.dataset.stage === now) s.classList.add("now");
      });
      dt.textContent = DETAIL[key].t + (key === now ? " · in progress now" : "");
      db.textContent = DETAIL[key].b;
      if (focusEl) focusEl.focus({ preventScroll: true });
    }
    steps.forEach(function (s) {
      s.addEventListener("click", function () { select(s.dataset.stage); });
    });
    select(now);
  });
})();

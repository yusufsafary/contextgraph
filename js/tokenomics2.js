// Contextgraph upgrade layer: Tokenomics — interactive allocation
// donut driven by the page figures (claim pool 2B = 20%, project
// wallet 8B = 80%) + live claim-pool balance from chain.
(function () {
  "use strict";
  var FX = window.CTXFX;
  var SEG = {
    pool: { lab: "Claim pool", big: "2,000,000,000 CTX", sub: "20% · Claim contract" },
    wallet: { lab: "Project wallet", big: "8,000,000,000 CTX", sub: "80% · minted at deploy" },
    all: { lab: "Total supply", big: "10,000,000,000 CTX", sub: "Fixed · no tax · no presale" },
  };
  function setCenter(key) {
    var d = SEG[key] || SEG.all;
    var big = document.getElementById("dc-big");
    var lab = document.getElementById("dc-lab");
    if (big) big.innerHTML = d.big.replace(" CTX", '<br><span style="font-size:.6em;letter-spacing:2px">CTX</span>');
    if (lab) lab.textContent = d.lab + " · " + d.sub;
    document.querySelectorAll(".donut-seg").forEach(function (s) {
      s.classList.toggle("dim", !!key && s.dataset.seg !== key);
      s.style.strokeWidth = key && s.dataset.seg === key ? "42" : "34";
    });
  }
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".donut-seg").forEach(function (s) {
      s.addEventListener("pointerenter", function () { setCenter(s.dataset.seg); });
      s.addEventListener("click", function () { setCenter(s.dataset.seg); });
      s.addEventListener("pointerleave", function () { setCenter(null); });
    });
    document.querySelectorAll("[data-seg-link]").forEach(function (el) {
      el.addEventListener("pointerenter", function () { setCenter(el.dataset.segLink); });
      el.addEventListener("pointerleave", function () { setCenter(null); });
    });
    setCenter(null);
    // Live pool balance: balanceOf(Claim) on the $CTX token contract.
    (async function () {
      if (!FX) return;
      try {
        var raw = await FX.call(
          FX.CFG.token.address,
          FX.SEL.balanceOf + "000000000000000000000000" + FX.CFG.claim.address.slice(2).toLowerCase()
        );
        var bal = Math.floor(Number(BigInt(raw)) / 1e18);
        var paid = Math.max(0, 2000000000 - bal);
        FX.tweenNum(document.getElementById("pl-pool"), bal, function (n) { return FX.fmt(n) + " CTX"; });
        FX.tweenNum(document.getElementById("pl-paid"), paid, function (n) { return FX.fmt(n) + " CTX"; });
        var pct = document.getElementById("pl-pct");
        if (pct) pct.textContent = (bal / 20000000).toFixed(2).replace(/\.?0+$/, "") + "% of pool remaining";
      } catch (e) { /* keep placeholders */ }
    })();
  });
})();

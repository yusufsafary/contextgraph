// Contextgraph upgrade layer: Swap — animated countdown ring to the
// announced $CTX pool listing, 1 December 2026 00:00 UTC on Uniswap.
(function () {
  "use strict";
  var TARGET = 1796083200; // 2026-12-01 00:00:00 UTC
  var GENESIS = 1794819600; // first Graph, 2026-11-16 09:00 UTC
  var C = 2 * Math.PI * 88;
  function pad(n) { return String(n).padStart(2, "0"); }
  function tick() {
    var now = Math.floor(Date.now() / 1000);
    var left = Math.max(0, TARGET - now);
    var d = Math.floor(left / 86400);
    var h = Math.floor((left % 86400) / 3600);
    var m = Math.floor((left % 3600) / 60);
    var s = left % 60;
    var big = document.getElementById("sr-big");
    var cnt = document.getElementById("swap-count");
    var fg = document.getElementById("sr-fg");
    if (big) big.textContent = left === 0 ? "LIVE" : d + "d " + pad(h) + "h";
    if (cnt) cnt.textContent = d + " days · " + pad(h) + ":" + pad(m) + ":" + pad(s);
    if (fg) {
      var f = Math.max(0, Math.min(1, (now - GENESIS) / (TARGET - GENESIS)));
      fg.style.strokeDashoffset = (C * (1 - f)).toFixed(1);
    }
  }
  document.addEventListener("DOMContentLoaded", function () {
    var fg = document.getElementById("sr-fg");
    if (fg) {
      fg.setAttribute("stroke-dasharray", C.toFixed(1));
      fg.style.strokeDashoffset = C.toFixed(1);
    }
    tick();
    setInterval(tick, 1000);
  });
})();

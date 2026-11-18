// Homepage Pass strip: live Pass price, sale state and minted count,
// read sequentially through the shared CTXFX helper.
(function () {
  "use strict";
  var FX = window.CTXFX;
  if (!FX) return;
  var PASS = "0x8BDfAf227D04a7f531c670D39728F9D2adf56aab";
  var SEL = { price: "0xa035b1fe", saleOpen: "0x99288dbb", totalMinted: "0xa2309ff8" };
  function bnb(wei) {
    var s = BigInt(wei).toString().padStart(19, "0");
    var int = s.slice(0, s.length - 18) || "0";
    var frac = s.slice(s.length - 18).replace(/0+$/, "");
    return frac ? int + "." + frac : int;
  }
  async function load() {
    try {
      var price = BigInt(await FX.call(PASS, SEL.price));
      var open = FX.asInt(await FX.call(PASS, SEL.saleOpen)) === 1;
      var minted = FX.asInt(await FX.call(PASS, SEL.totalMinted));
      var p = document.getElementById("hp-price");
      if (p) p.textContent = bnb(price) + " BNB";
      var s = document.getElementById("hp-status");
      if (s) s.innerHTML = open
        ? '<span class="cob">Sales live</span> · ' + FX.fmt(minted) + " minted · supply unlimited"
        : "Sales closed · " + FX.fmt(minted) + " minted · supply unlimited";
    } catch (e) { /* keep fallback text */ }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load);
  else load();
})();

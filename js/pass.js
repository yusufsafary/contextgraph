// Contextgraph Pass page: live reads (sequential RPC via CTXFX) plus
// plain EIP-1193 wallet actions (window.ethereum only, no libraries).
// Buy: Pass.mint() at the live price(). Mint: NodesV2 pass lane
// (mintFreePass / mintPaidPass). Buttons follow the on-chain flags,
// so they enable themselves the moment a flag flips.
(function () {
  "use strict";
  var FX = window.CTXFX;
  var PASS = "0x8BDfAf227D04a7f531c670D39728F9D2adf56aab";
  var NODES2 = "0x189DB6602B8D41a0d14CcCc9e999DC3aF895c3f2";
  var BSC = "0x38";
  var SEL = {
    price: "0xa035b1fe", saleOpen: "0x99288dbb", totalMinted: "0xa2309ff8",
    balanceOf: "0x70a08231",
    currentGraph: "0x87f38529", mintOpen: "0x24bbd049",
    nodesOf: "0xd7027ef0", priceFor: "0xf12a7add", holdsPass: "0x9f123537",
    mintPass: "0x1249c58b", mintFreePass: "0x4a409798", mintPaidPass: "0x87b948bf",
  };
  var ACT_NOTE = "Graph Nº 4 · 19 Nov 2026 · 09:00 UTC";

  var S = {
    account: null, priceWei: null, saleOpen: false, minted: null,
    mintOpen: false, graph: 0, holds: false, count: null, nextWei: null,
    busy: false, loaded: false,
  };

  function $(id) { return document.getElementById(id); }
  function padAddr(a) { return a.toLowerCase().replace(/^0x/, "").padStart(64, "0"); }
  function bnb(wei) {
    if (wei === null || wei === undefined) return "···";
    var s = BigInt(wei).toString().padStart(19, "0");
    var int = s.slice(0, s.length - 18) || "0";
    var frac = s.slice(s.length - 18).replace(/0+$/, "");
    return frac ? int + "." + frac : int;
  }
  function short(a) { return a ? a.slice(0, 6) + "…" + a.slice(-4) : ""; }
  function txLink(hash) {
    return '<a href="https://bscscan.com/tx/' + hash + '" target="_blank" rel="noopener">' + short(hash) + "</a>";
  }
  function setStatus(el, html) { if (el) el.innerHTML = html; }

  /* ---------------- read-only state ---------------- */
  async function readPublic() {
    if (!FX) return;
    try {
      S.priceWei = BigInt(await FX.call(PASS, SEL.price));
      S.saleOpen = FX.asInt(await FX.call(PASS, SEL.saleOpen)) === 1;
      S.minted = FX.asInt(await FX.call(PASS, SEL.totalMinted));
      S.graph = FX.asInt(await FX.call(NODES2, SEL.currentGraph));
      S.mintOpen = FX.asInt(await FX.call(NODES2, SEL.mintOpen)) === 1;
      S.loaded = true;
    } catch (e) { /* keep last good state */ }
    render();
  }
  async function readWallet() {
    if (!FX || !S.account) return;
    try {
      var bal = FX.asInt(await FX.call(PASS, SEL.balanceOf + padAddr(S.account)));
      S.holds = bal > 0;
      S.holdsCount = bal;
      if (S.graph) {
        S.count = FX.asInt(await FX.call(NODES2, SEL.nodesOf + FX.pad32(S.graph) + padAddr(S.account)));
      }
      S.nextWei = BigInt(await FX.call(NODES2, SEL.priceFor + padAddr(S.account)));
    } catch (e) { /* keep last good state */ }
    render();
  }

  /* ---------------- rendering ---------------- */
  function render() {
    var chip = $("pass-sale-chip");
    if (chip) chip.textContent = !S.loaded ? "Reading chain…" : (S.saleOpen ? "Sales live" : "Sales closed");
    var pchip = $("pass-price-chip");
    if (pchip) pchip.textContent = "Price · " + (S.priceWei === null ? "0.00123" : bnb(S.priceWei)) + " BNB";
    var ph = $("ph-price"); if (ph) ph.textContent = (S.priceWei === null ? "0.00123" : bnb(S.priceWei)) + " BNB";
    var pm = $("ph-minted"); if (pm) pm.textContent = S.minted === null ? "···" : FX.fmt(S.minted);
    var g = $("pm-graph"); if (g) g.textContent = S.graph ? "Nº " + S.graph : "···";
    var po = $("pm-open");
    if (po && S.loaded) po.innerHTML = S.mintOpen
      ? '<span class="cob">Live</span> on Nodes v2'
      : "Opens at " + ACT_NOTE;

    var addr = $("pb-addr");
    if (addr) addr.textContent = S.account ? S.account : "Not connected";
    var holds = $("pb-holds");
    if (holds) holds.textContent = !S.account ? "···" : (S.holdsCount === undefined ? "···" : String(S.holdsCount));
    var cnt = $("pm-count");
    if (cnt) cnt.textContent = !S.account ? "···" : (S.count === null ? "···" : S.count + " of 10");
    var nxt = $("pm-next");
    if (nxt) nxt.textContent = !S.account ? "···" : (S.nextWei === null ? "···" : (S.nextWei === 0n ? "FREE" : bnb(S.nextWei) + " BNB"));

    var buy = $("pb-buy");
    if (buy) {
      buy.disabled = S.busy || !S.saleOpen || !S.account;
      buy.textContent = (S.loaded && !S.saleOpen)
        ? "Sales closed"
        : ("Buy a Pass · " + (S.priceWei === null ? "0.00123" : bnb(S.priceWei)) + " BNB");
    }
    var free = $("pm-free"), paid = $("pm-paid");
    var laneReady = !S.busy && S.mintOpen && !!S.account && S.holds && S.count !== null && S.count < 10;
    if (free) {
      free.disabled = !(laneReady && S.nextWei === 0n);
      free.textContent = S.mintOpen ? "Mint free Node" : "Mint lane opens " + ACT_NOTE;
    }
    if (paid) {
      paid.disabled = !(laneReady && S.nextWei !== null && S.nextWei > 0n);
      paid.textContent = S.mintOpen
        ? ("Mint paid Node · " + (S.nextWei !== null && S.nextWei > 0n ? bnb(S.nextWei) + " BNB" : "···"))
        : "Mint lane opens " + ACT_NOTE;
    }
  }

  /* ---------------- wallet ---------------- */
  function eth() { return window.ethereum || null; }
  async function ensureChain() {
    var e = eth();
    var cid = await e.request({ method: "eth_chainId" });
    if (cid === BSC) return;
    try {
      await e.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BSC }] });
    } catch (err) {
      if (err && err.code === 4902) {
        await e.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: BSC, chainName: "BNB Smart Chain",
            nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
            rpcUrls: ["https://bsc-dataseed.binance.org"],
            blockExplorerUrls: ["https://bscscan.com"],
          }],
        });
      } else { throw err; }
    }
  }
  async function connect() {
    var st = $("pb-status");
    if (!eth()) {
      setStatus(st, "No EIP-1193 wallet found in this browser. Open this page in a wallet browser or with a wallet extension installed.");
      return;
    }
    try {
      var accs = await eth().request({ method: "eth_requestAccounts" });
      if (!accs || !accs.length) return;
      await ensureChain();
      S.account = accs[0];
      setStatus(st, 'Wallet connected: <span class="cob">' + short(S.account) + "</span>");
      var c = $("pb-connect"); if (c) c.textContent = "Connected";
      await readWallet();
    } catch (err) {
      setStatus(st, err && err.code === 4001 ? "Connection rejected in wallet." : "Connection failed. Check your wallet and try again.");
    }
    render();
  }
  async function waitReceipt(hash) {
    var e = eth();
    for (var i = 0; i < 48; i++) {
      try {
        var r = await e.request({ method: "eth_getTransactionReceipt", params: [hash] });
        if (r) return r;
      } catch (err) { /* keep waiting */ }
      await new Promise(function (res) { setTimeout(res, 2500); });
    }
    return null;
  }
  async function send(to, data, valueWei, statusEl, verb) {
    S.busy = true; render();
    try {
      await ensureChain();
      var hash = await eth().request({
        method: "eth_sendTransaction",
        params: [{ from: S.account, to: to, data: data, value: "0x" + BigInt(valueWei).toString(16) }],
      });
      setStatus(statusEl, verb + " sent · tx " + txLink(hash) + " · waiting for confirmation…");
      var rc = await waitReceipt(hash);
      if (!rc) {
        setStatus(statusEl, "Tx " + txLink(hash) + " is still pending. Check BscScan for the final state.");
      } else if (rc.status === "0x1") {
        setStatus(statusEl, '<span class="cob">Confirmed</span> · tx ' + txLink(hash));
        await readPublic(); await readWallet();
      } else {
        setStatus(statusEl, "Tx reverted · " + txLink(hash) + ". No funds moved beyond gas.");
      }
    } catch (err) {
      setStatus(statusEl, err && err.code === 4001 ? "Rejected in wallet." : "Transaction failed before sending. Check your wallet and try again.");
    }
    S.busy = false; render();
  }

  async function buy() {
    var st = $("pb-status");
    if (!S.account) { connect(); return; }
    if (!FX) { setStatus(st, "Chain helper unavailable; reload the page."); return; }
    try {
      // Re-read the price at send time so the value is exact.
      S.priceWei = BigInt(await FX.call(PASS, SEL.price));
      S.saleOpen = FX.asInt(await FX.call(PASS, SEL.saleOpen)) === 1;
    } catch (e) { /* fall through with last known state */ }
    if (!S.saleOpen) { setStatus(st, "Sales are closed on chain right now."); render(); return; }
    await send(PASS, SEL.mintPass, S.priceWei, st, "Pass purchase");
  }
  async function mintFree() {
    await send(NODES2, SEL.mintFreePass, 0n, $("pm-status"), "Free Node mint");
  }
  async function mintPaid() {
    var st = $("pm-status");
    if (!FX) { setStatus(st, "Chain helper unavailable; reload the page."); return; }
    try {
      S.nextWei = BigInt(await FX.call(NODES2, SEL.priceFor + padAddr(S.account)));
    } catch (e) { /* use last known price */ }
    if (S.nextWei === null || S.nextWei === 0n) {
      setStatus(st, "Your next Node is free; use the free mint button.");
      render(); return;
    }
    await send(NODES2, SEL.mintPaidPass, S.nextWei, st, "Paid Node mint");
  }

  /* ---------------- wiring ---------------- */
  function init() {
    var c = $("pb-connect"); if (c) c.addEventListener("click", connect);
    var b = $("pb-buy"); if (b) b.addEventListener("click", buy);
    var f = $("pm-free"); if (f) f.addEventListener("click", mintFree);
    var p = $("pm-paid"); if (p) p.addEventListener("click", mintPaid);
    if (eth() && eth().on) {
      eth().on("accountsChanged", function (accs) {
        S.account = accs && accs.length ? accs[0] : null;
        S.count = null; S.nextWei = null; S.holdsCount = undefined;
        readWallet(); render();
      });
      eth().on("chainChanged", function () { readPublic(); readWallet(); });
    }
    readPublic();
    setInterval(function () { readPublic(); if (S.account) readWallet(); }, 30000);
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

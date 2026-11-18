// Contextgraph upgrade layer: Docs — live read-only Node checker.
// Sequential single eth_calls (BSC RPCs throttle bursts). Selectors
// verified live against the deployed contracts:
//   graphOf 0x69e96bb2 · kindOf 0x2345e28c · isHub 0x32e282f6
//   isSealed 0x2c1758c1 · verdictOf 0xbcaa6cf7
//   claimable 0xd1d58b25 · claimAmount 0x23b221a0 · feeFor 0xad6f49a3
// Kind mapping per skill.md: seed % 3 → 0 Root, 1 Bridge, 2 Leaf.
(function () {
  "use strict";
  var FX = window.CTXFX;
  var KINDS = ["Root", "Bridge", "Leaf"];
  var VERDICTS = ["Pending", "Isolated", "Linked", "Networked"];
  function $(id) { return document.getElementById(id); }

  async function check() {
    var out = $("chk-out");
    var btn = $("chk-btn");
    var id = parseInt(($( "chk-id").value || "").trim(), 10);
    if (!id || id < 1) { out.textContent = "Enter a Node number first."; return; }
    btn.disabled = true;
    out.textContent = "Reading chain…";
    try {
      var N = FX.CFG.nodes.address, C = FX.CFG.claim.address, S = FX.SEL;
      var total = FX.asInt(await FX.call(N, S.totalNodes));
      if (id > total) {
        out.textContent = "Node #" + id + " does not exist yet. " + FX.fmt(total) + " Nodes minted so far.";
        return;
      }
      var g = FX.asInt(await FX.call(N, S.graphOf + FX.pad32(id)));
      var kind = FX.asInt(await FX.call(N, S.kindOf + FX.pad32(id)));
      var hub = FX.asInt(await FX.call(N, S.isHub + FX.pad32(id))) !== 0;
      var sealed = FX.asInt(await FX.call(N, S.isSealed + FX.pad32(g))) !== 0;
      var verdict = FX.asInt(await FX.call(N, S.verdictOf + FX.pad32(g)));
      var claimable = FX.asInt(await FX.call(C, S.claimable + FX.pad32(id))) !== 0;
      var amount = await FX.call(C, S.claimAmount + FX.pad32(id));
      var fee = await FX.call(C, S.feeFor + FX.pad32(id));
      var ctxAmt = FX.fmt(Math.floor(Number(BigInt(amount)) / 1e18));
      var feeBnb = (Number(BigInt(fee)) / 1e18).toFixed(6);
      var status = claimable
        ? '<span class="cob">CLAIMABLE NOW</span>'
        : sealed ? "Sealed · not mature yet (opens one phase after the seal)" : "Graph still forming · seals 09:00 UTC";
      out.innerHTML =
        "Node #" + FX.fmt(id) + " · Graph Nº " + g + " · Kind " + (KINDS[kind] || "?") + (hub ? ' · <span class="cob">HUB</span>' : "") + "<br>" +
        "Graph verdict: " + (VERDICTS[verdict] || "Pending") + " · " + status + "<br>" +
        "Claim value: " + ctxAmt + " CTX · fee " + feeBnb + " BNB · claim through your agent";
    } catch (e) {
      out.textContent = "Chain read failed. Check the number and retry.";
    } finally {
      btn.disabled = false;
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var btn = $("chk-btn");
    if (btn) btn.addEventListener("click", check);
    var input = $("chk-id");
    if (input) input.addEventListener("keydown", function (e) { if (e.key === "Enter") check(); });
  });
})();

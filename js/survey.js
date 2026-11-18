// Contextgraph Survey (Hub Surveyors) · read-only chain display.
// Contract: 0x16fA118C38490ddbBa4E5956E5Fe9426320FD60B (verified, Sourcify).
// Actions (linkHub / propose / vote) run through agents; see skill.md.
(function () {
  var SURVEY = "0x16fA118C38490ddbBa4E5956E5Fe9426320FD60B";
  var RPCS = (window.CONFIG && CONFIG.rpcs) || [
    "https://bsc-dataseed.binance.org",
    "https://bsc.publicnode.com",
    "https://bsc-dataseed1.defibit.io",
  ];
  var SEL = {
    currentGraph: "0x87f38529",
    targetGraph: "0x81cd0e10",
    themeOf: "0x0697b3ab",
    proposalCount: "0xb7e4eacf",
    proposalAt: "0x56eed6d5",
  };
  function word(n) { return BigInt(n).toString(16).padStart(64, "0"); }
  async function call(data) {
    for (var i = 0; i < RPCS.length; i++) {
      try {
        var r = await fetch(RPCS[i], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to: SURVEY, data: data }, "latest"], id: 1 }),
        });
        var j = await r.json();
        if (j && j.result && j.result !== "0x") return j.result;
      } catch (e) { /* next RPC */ }
    }
    return null;
  }
  function uint(hex) { return Number(BigInt(hex)); }
  function decString(hex) {
    var h = hex.slice(2);
    if (h.length < 128) return "";
    var off = Number(BigInt("0x" + h.slice(0, 64))) * 2;
    var len = Number(BigInt("0x" + h.slice(off, off + 64)));
    var bytes = [];
    for (var i = 0; i < len; i++) bytes.push(parseInt(h.slice(off + 64 + i * 2, off + 66 + i * 2), 16));
    return new TextDecoder().decode(new Uint8Array(bytes));
  }
  function decProposal(hex) {
    var h = hex.slice(2);
    var addr = "0x" + h.slice(24, 64);
    var off = Number(BigInt("0x" + h.slice(64, 128))) * 2;
    var votes = Number(BigInt("0x" + h.slice(128, 192)));
    var len = Number(BigInt("0x" + h.slice(off, off + 64)));
    var bytes = [];
    for (var i = 0; i < len; i++) bytes.push(parseInt(h.slice(off + 64 + i * 2, off + 66 + i * 2), 16));
    return { proposer: addr, theme: new TextDecoder().decode(new Uint8Array(bytes)), votes: votes };
  }
  function short(a) { return a.slice(0, 6) + "…" + a.slice(-4); }

  async function load() {
    var curHex = await call(SEL.currentGraph);
    if (!curHex) return null;
    var cur = uint(curHex);
    var tgt = cur + 1;
    var q = await call(SEL.themeOf + word(cur));
    var question = q ? decString(q) : "";
    var cntHex = await call(SEL.proposalCount + word(tgt));
    var count = cntHex ? uint(cntHex) : 0;
    var props = [];
    for (var i = 0; i < Math.min(count, 25); i++) {
      var p = await call(SEL.proposalAt + word(tgt) + word(i));
      if (p) { var d = decProposal(p); d.index = i; props.push(d); }
    }
    props.sort(function (a, b) { return b.votes - a.votes; });
    return { cur: cur, tgt: tgt, question: question, count: count, props: props };
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var mini = document.getElementById("sv-mini-q");
    var full = document.getElementById("sv-q");
    if (!mini && !full) return;
    var s = await load();
    if (!s) {
      if (mini) mini.textContent = "Survey contract unreachable from here. Try again shortly.";
      if (full) full.textContent = "Survey contract unreachable from here. Try again shortly.";
      return;
    }
    var lead = s.props.length && s.props[0].votes > 0 ? s.props[0] : null;
    if (mini) {
      mini.textContent = s.question ? "Graph Nº " + s.cur + " asks: " + s.question : "No question in force for Graph Nº " + s.cur + " yet";
      var sub = document.getElementById("sv-mini-sub");
      if (sub) sub.textContent = lead
        ? "Graph Nº " + s.tgt + " · leading: " + lead.theme + " (" + lead.votes + " power)"
        : "Graph Nº " + s.tgt + " · " + s.count + " proposal" + (s.count === 1 ? "" : "s") + " so far · Surveyors decide";
    }
    if (full) {
      full.textContent = s.question || "No question set for this Graph yet.";
      var curEl = document.getElementById("sv-cur"); if (curEl) curEl.textContent = s.cur;
      var nextEl = document.getElementById("sv-next"); if (nextEl) nextEl.textContent = s.tgt;
      var leadEl = document.getElementById("sv-lead");
      if (leadEl) leadEl.textContent = lead
        ? "Leading: " + lead.theme + " · " + lead.votes + " power · by " + short(lead.proposer)
        : s.count ? s.count + " proposal" + (s.count === 1 ? "" : "s") + " on table, no votes yet. First vote sets a lead."
        : "No proposals yet. A Surveyor opens a round.";
      var list = document.getElementById("sv-list");
      if (list) {
        list.textContent = "";
        if (!s.props.length) {
          var empty = document.createElement("p");
          empty.className = "ps";
          empty.textContent = "Nothing proposed for Graph Nº " + s.tgt + " yet.";
          list.appendChild(empty);
        }
        s.props.forEach(function (p) {
          var row = document.createElement("div");
          row.className = "sv-row";
          var t = document.createElement("span"); t.className = "sv-theme"; t.textContent = p.theme;
          var m = document.createElement("span"); m.className = "sv-meta";
          m.textContent = "#" + p.index + " · " + p.votes + " power · " + short(p.proposer);
          row.appendChild(t); row.appendChild(m);
          list.appendChild(row);
        });
      }
    }
  });
})();

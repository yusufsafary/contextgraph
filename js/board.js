// Contextgraph live board: reads BSC state, draws FIG. 1 plate from
// the running Graph's mint count, runs seal countdown, claim checker.
const SEL = {
  currentGraph: "0x87f38529", totalNodes: "0x9592d424",
  nodesInGraph: "0x1b2ed607", participantsOf: "0xe200c857",
  verdictOf: "0xbcaa6cf7", graphEnd: "0x5f348a41", graphOf: "0x69e96bb2",
  isHub: "0x32e282f6", mintOpen: "0x24bbd049", claimOpen: "0x4b8bcb58",
  totalClaimed: "0xd54ad2a1", claimable: "0xd1d58b25",
  claimAmount: "0x23b221a0", feeFor: "0xad6f49a3", balanceOf: "0x70a08231",
};
const VERDICTS = ["Pending", "Isolated", "Linked", "Networked"];
const $ = (id) => document.getElementById(id);
const pad32 = (n) => BigInt(n).toString(16).padStart(64, "0");
const fmt = (n) => n.toLocaleString("en-US");

async function rpcCall(to, data) {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] });
  const tries = CONFIG.rpcs.map((url) =>
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body })
      .then((r) => r.json())
      .then((j) => {
        if (!j.result || j.result === "0x") throw new Error("empty");
        return j.result;
      })
  );
  return Promise.any(tries);
}
const asInt = (hex) => Number(BigInt(hex));
const asBool = (hex) => BigInt(hex) !== 0n;

let sealTs = 0;
function tickClock() {
  if (!sealTs) return;
  const left = Math.max(0, sealTs - Math.floor(Date.now() / 1000));
  const h = String(Math.floor(left / 3600)).padStart(2, "0");
  const m = String(Math.floor((left % 3600) / 60)).padStart(2, "0");
  const s = String(left % 60).padStart(2, "0");
  const el = $("b-seal");
  if (el) el.textContent = `${h}:${m}:${s}`;
}
setInterval(tickClock, 1000);

// FIG. 1: deterministic plate drawing. Node squares appear in mint
// order, each linked to its predecessor and a near neighbour; a
// pseudo-rare node (hash >= 970) is drawn cobalt as a Hub.
function drawPlate(count, graph) {
  const cv = $("plate-canvas");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  let state = BigInt(graph * 1000003 + 77);
  const rnd = () => {
    state = (state * 6364136223846793005n + 1442695040888963407n) % (1n << 64n);
    return Number(state >> 32n) / 4294967296;
  };
  if (count === 0) {
    ctx.fillStyle = "#5a5c62";
    ctx.font = "700 21px 'Space Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("AWAITING FIRST NODE · GRAPH OPENS SOON", W / 2, H / 2);
    ctx.textAlign = "left";
  }
  const n = Math.min(count, 240);
  const pts = [];
  let guard = 0;
  while (pts.length < n && guard++ < 6000) {
    const x = 30 + rnd() * (W - 60), y = 26 + rnd() * (H - 52);
    if (pts.every((p) => (p.x - x) ** 2 + (p.y - y) ** 2 > 34 ** 2)) pts.push({ x, y });
  }
  ctx.lineWidth = 1.6;
  pts.forEach((p, i) => {
    if (i === 0) return;
    ctx.strokeStyle = "#14161a";
    ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(p.x, p.y); ctx.stroke();
    let best = -1, bd = 1e12;
    for (let j = 0; j < i; j++) {
      const dd = (pts[j].x - p.x) ** 2 + (pts[j].y - p.y) ** 2;
      if (dd < bd) { bd = dd; best = j; }
    }
    if (best >= 0 && best !== i - 1) {
      ctx.beginPath(); ctx.moveTo(pts[best].x, pts[best].y); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
  });
  pts.forEach((p, i) => {
    const hub = (i * 2654435761) % 1000 >= 970;
    ctx.fillStyle = hub ? "#2438ff" : "#f4efe6";
    ctx.strokeStyle = hub ? "#2438ff" : "#14161a";
    ctx.lineWidth = 2;
    const r = hub ? 9 : 6;
    ctx.beginPath(); ctx.rect(p.x - r, p.y - r, r * 2, r * 2); ctx.fill(); ctx.stroke();
    if (hub) { ctx.fillStyle = "#f4efe6"; ctx.fillRect(p.x - 3, p.y - 3, 6, 6); }
  });
  const cap = $("fig-nodes");
  if (cap) cap.textContent = `NODES DRAWN · ${fmt(pts.length)} OF ${fmt(count)}`;
}

async function refresh() {
  try {
    const N = CONFIG.nodes.address, C = CONFIG.claim.address, T = CONFIG.token.address;
    const g = asInt(await rpcCall(N, SEL.currentGraph));
    if (!g) return;
    const [nodesToday, agents, end, mintOpen, claimOpen, claimed, poolRaw] = await Promise.all([
      rpcCall(N, SEL.nodesInGraph + pad32(g)).then(asInt),
      rpcCall(N, SEL.participantsOf + pad32(g)).then(asInt),
      rpcCall(N, SEL.graphEnd + pad32(g)).then(asInt),
      rpcCall(N, SEL.mintOpen).then(asBool),
      rpcCall(C, SEL.claimOpen).then(asBool),
      rpcCall(C, SEL.totalClaimed).then(asInt),
      rpcCall(T, SEL.balanceOf + "000000000000000000000000" + C.slice(2).toLowerCase()),
    ]);
    sealTs = end;
    if ($("b-graph")) $("b-graph").textContent = `Nº ${g}`;
    if ($("b-nodes")) $("b-nodes").textContent = fmt(nodesToday);
    if ($("b-agents")) $("b-agents").textContent = fmt(agents);
    if ($("b-claimed")) $("b-claimed").textContent = fmt(claimed);
    if ($("b-pool")) $("b-pool").textContent = `${fmt(Math.floor(Number(BigInt(poolRaw)) / 1e18))} CTX`;
    const st = $("b-status");
    if (st) {
      st.textContent = mintOpen ? "Mint open" : "Mint opens soon";
      st.className = "chip" + (mintOpen ? " blue" : "");
    }
    const cs = $("c-status");
    if (cs) cs.textContent = claimOpen ? "Claims open" : "Claims open after first seal";
    const fill = $("gauge-fill");
    if (fill) fill.style.width = `${Math.min(100, (agents / 100) * 100)}%`;
    const gv = $("gauge-verdict");
    if (gv) gv.textContent = agents < 25 ? "Heading to Isolated" : agents <= 100 ? "Heading to Linked" : "Heading to Networked";
    drawPlate(nodesToday, g);
    if (g > 1) {
      const v = asInt(await rpcCall(N, SEL.verdictOf + pad32(g - 1)));
      const el = $("b-lastverdict");
      if (el) el.textContent = `Graph Nº ${g - 1} · ${VERDICTS[v] || "Pending"}`;
    }
    tickClock();
  } catch (e) { /* keep last good render */ }
}

async function checkClaim() {
  const out = $("claim-result");
  const id = parseInt(($("claim-id").value || "").trim(), 10);
  if (!id || id < 1) { out.textContent = "Enter a Node number first."; return; }
  out.textContent = "Reading chain…";
  try {
    const C = CONFIG.claim.address, N = CONFIG.nodes.address;
    const [ok, amount, fee, hub] = await Promise.all([
      rpcCall(C, SEL.claimable + pad32(id)).then(asBool),
      rpcCall(C, SEL.claimAmount + pad32(id)),
      rpcCall(C, SEL.feeFor + pad32(id)),
      rpcCall(N, SEL.isHub + pad32(id)).then(asBool).catch(() => false),
    ]);
    const ctxAmt = fmt(Math.floor(Number(BigInt(amount)) / 1e18));
    const feeBnb = (Number(BigInt(fee)) / 1e18).toFixed(6);
    out.textContent = ok
      ? `Node #${id}${hub ? " (Hub)" : ""} is claimable now: ${ctxAmt} CTX · fee ${feeBnb} BNB. Claim through your agent.`
      : `Node #${id}${hub ? " (Hub)" : ""} is not claimable yet. Value when mature: ${ctxAmt} CTX · fee ${feeBnb} BNB.`;
  } catch (e) {
    out.textContent = "Node not found or chain read failed. Check the number and retry.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  refresh();
  setInterval(refresh, 30000);
  const btn = $("claim-check");
  if (btn) btn.addEventListener("click", checkClaim);
});

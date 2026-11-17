// Contextgraph live board: reads BSC state, animates FIG. 1 plate
// from the running Graph's mint count, runs seal countdown, claim
// checker, count-up numbers and scroll reveals.
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

// Count-up tween for board numbers.
const tweens = new WeakMap();
function tweenNum(el, to, format) {
  if (!el) return;
  const from = tweens.get(el)?.cur ?? 0;
  if (tweens.get(el)?.raf) cancelAnimationFrame(tweens.get(el).raf);
  const t0 = performance.now(), dur = 950;
  const state = { cur: from, raf: 0 };
  tweens.set(el, state);
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    state.cur = Math.round(from + (to - from) * e);
    el.textContent = format(state.cur);
    if (k < 1) state.raf = requestAnimationFrame(step);
  };
  state.raf = requestAnimationFrame(step);
}

// FIG. 1 animated plate. Points are deterministic per Graph; nodes
// pop in staggered, a signal pulse travels the predecessor chain,
// Hubs breathe, and the nearest node to the pointer lights up.
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let plate = null; // {graph, pts:[{x,y,hub,birth}], cum:[], total, builtAt}
let plateHover = -1;
let plateRunning = false;

function genPoints(count, graph) {
  const cv = $("plate-canvas");
  const W = cv.width, H = cv.height;
  let state = BigInt(graph * 1000003 + 77);
  const rnd = () => {
    state = (state * 6364136223846793005n + 1442695040888963407n) % (1n << 64n);
    return Number(state >> 32n) / 4294967296;
  };
  const n = Math.min(count, 240);
  const pts = [];
  let guard = 0;
  while (pts.length < n && guard++ < 6000) {
    const x = 30 + rnd() * (W - 60), y = 26 + rnd() * (H - 52);
    if (pts.every((p) => (p.x - x) ** 2 + (p.y - y) ** 2 > 34 ** 2))
      pts.push({ x, y, hub: (pts.length * 2654435761) % 1000 >= 970 });
  }
  // nearest-neighbour link per node (besides predecessor)
  pts.forEach((p, i) => {
    p.near = -1;
    if (i === 0) return;
    let bd = 1e12;
    for (let j = 0; j < i; j++) {
      const dd = (pts[j].x - p.x) ** 2 + (pts[j].y - p.y) ** 2;
      if (dd < bd) { bd = dd; p.near = j; }
    }
  });
  const cum = [0];
  for (let i = 1; i < pts.length; i++)
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, cum, total: cum[cum.length - 1] || 0 };
}

function plateShow(count, graph) {
  const cv = $("plate-canvas");
  if (!cv) return;
  const now = performance.now();
  if (!plate || plate.graph !== graph) {
    const g = genPoints(count, graph);
    g.pts.forEach((p, i) => (p.birth = now + i * 22));
    plate = { graph, count, ...g };
  } else if (count !== plate.count) {
    const g = genPoints(count, graph);
    g.pts.forEach((p, i) => (p.birth = i < plate.pts.length ? plate.pts[i].birth : now + (i - plate.pts.length) * 22));
    plate = { graph, count, ...g };
  }
  const cap = $("fig-nodes");
  if (cap) cap.textContent = `NODES DRAWN · ${fmt(plate.pts.length)} OF ${fmt(count)}`;
  if (!plateRunning) { plateRunning = true; requestAnimationFrame(plateLoop); }
}

function plateLoop(ts) {
  const cv = $("plate-canvas");
  if (!cv || !plate) { plateRunning = false; return; }
  const ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height;
  const now = REDUCED ? plate.pts.length * 22 + 1000 : ts;
  ctx.clearRect(0, 0, W, H);
  const { pts } = plate;
  if (pts.length === 0) {
    ctx.fillStyle = "#5a5c62";
    ctx.font = "700 21px 'Space Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("AWAITING FIRST NODE · GRAPH OPENS SOON", W / 2, H / 2);
    ctx.textAlign = "left";
  }
  const age = (p) => Math.max(0, Math.min(1, (now - p.birth) / 280));
  // edges
  pts.forEach((p, i) => {
    if (i === 0) return;
    const a = Math.min(age(p), age(pts[i - 1]));
    if (a <= 0) return;
    ctx.strokeStyle = `rgba(20,22,26,${0.85 * a})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(p.x, p.y); ctx.stroke();
    if (p.near >= 0 && p.near !== i - 1) {
      const a2 = Math.min(age(p), age(pts[p.near]));
      if (a2 > 0) {
        ctx.strokeStyle = `rgba(20,22,26,${0.5 * a2})`;
        ctx.beginPath(); ctx.moveTo(pts[p.near].x, pts[p.near].y); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
    }
  });
  // travelling signal pulse along the predecessor chain
  if (!REDUCED && plate.total > 0 && pts.length > 1) {
    const born = pts.filter((p) => age(p) >= 1).length;
    if (born > 1) {
      const upto = plate.cum[born - 1];
      const head = (ts / 26) % (upto + 260);
      for (let k = 0; k < 16; k++) {
        const dist = head - k * 15;
        if (dist < 0 || dist > upto) continue;
        let seg = 1;
        while (seg < born - 1 && plate.cum[seg] < dist) seg++;
        const segLen = plate.cum[seg] - plate.cum[seg - 1] || 1;
        const f = (dist - plate.cum[seg - 1]) / segLen;
        const x = pts[seg - 1].x + (pts[seg].x - pts[seg - 1].x) * f;
        const y = pts[seg - 1].y + (pts[seg].y - pts[seg - 1].y) * f;
        const r = 5.5 * (1 - k / 18);
        ctx.fillStyle = `rgba(36,56,255,${0.95 * (1 - k / 16)})`;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        if (k === 0) { ctx.fillStyle = "#f4efe6"; ctx.fillRect(x - 2, y - 2, 4, 4); }
      }
    }
  }
  // nodes
  pts.forEach((p, i) => {
    const a = age(p);
    if (a <= 0) return;
    const ease = 1 - Math.pow(1 - a, 3);
    const breathe = p.hub && !REDUCED ? 1.7 * Math.sin(ts / 420 + i * 1.7) : 0;
    const r = (p.hub ? 9 : 6) * ease + (p.hub ? breathe * ease : 0);
    if (r <= 0.4) return;
    ctx.fillStyle = p.hub ? "#2438ff" : "#f4efe6";
    ctx.strokeStyle = p.hub ? "#2438ff" : "#14161a";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(p.x - r, p.y - r, r * 2, r * 2); ctx.fill(); ctx.stroke();
    if (p.hub) { ctx.fillStyle = "#f4efe6"; ctx.fillRect(p.x - 3, p.y - 3, 6, 6); }
  });
  // hover highlight
  if (plateHover >= 0 && pts[plateHover]) {
    const p = pts[plateHover];
    ctx.strokeStyle = "#2438ff";
    ctx.lineWidth = 2.6;
    if (plateHover > 0) { ctx.beginPath(); ctx.moveTo(pts[plateHover - 1].x, pts[plateHover - 1].y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    if (p.near >= 0) { ctx.beginPath(); ctx.moveTo(pts[p.near].x, pts[p.near].y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    const r = (p.hub ? 13 : 11);
    ctx.beginPath(); ctx.rect(p.x - r, p.y - r, r * 2, r * 2); ctx.stroke();
  }
  if (!REDUCED) requestAnimationFrame(plateLoop);
  else plateRunning = false;
}

function platePointer(e) {
  const cv = $("plate-canvas");
  if (!cv || !plate) return;
  const rect = cv.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * cv.width;
  const y = ((e.clientY - rect.top) / rect.height) * cv.height;
  let best = -1, bd = 48 ** 2;
  plate.pts.forEach((p, i) => {
    const dd = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (dd < bd) { bd = dd; best = i; }
  });
  plateHover = best;
  const hov = $("fig-hover");
  if (hov) {
    if (best >= 0) {
      const p = plate.pts[best];
      hov.textContent = `NODE Nº ${best + 1}${p.hub ? " · HUB" : ""}`;
    } else hov.textContent = "";
  }
  if (REDUCED) plateLoop(performance.now());
}

// Test/preview hook: window.CTXPLATE.show(nodes, graph)
window.CTXPLATE = { show: plateShow };

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
    tweenNum($("b-nodes"), nodesToday, fmt);
    tweenNum($("b-agents"), agents, fmt);
    tweenNum($("b-claimed"), claimed, fmt);
    tweenNum($("b-pool"), Math.floor(Number(BigInt(poolRaw)) / 1e18), (n) => `${fmt(n)} CTX`);
    const st = $("b-status");
    if (st) {
      st.textContent = mintOpen ? "Mint open" : "Mint opens soon";
      st.className = "chip" + (mintOpen ? " blue" : "");
    }
    const mq = $("mq-graph");
    if (mq) mq.textContent = `Nº ${g}`;
    const cs = $("c-status");
    if (cs) cs.textContent = claimOpen ? "Claims open" : "Claims open after first seal";
    const fill = $("gauge-fill");
    if (fill) fill.style.width = `${Math.min(100, (agents / 100) * 100)}%`;
    const gv = $("gauge-verdict");
    if (gv) gv.textContent = agents < 25 ? "Heading to Isolated" : agents <= 100 ? "Heading to Linked" : "Heading to Networked";
    plateShow(nodesToday, g);
    if (g > 1) {
      const v = asInt(await rpcCall(N, SEL.verdictOf + pad32(g - 1)));
      const el = $("b-lastverdict");
      if (el) el.textContent = `Graph Nº ${g - 1} · ${VERDICTS[v] || "Pending"}`;
    }
    tickClock();
  } catch (e) { /* keep last good render */ }
}

function setStamp(ok) {
  const stamp = $("claim-stamp");
  if (!stamp) return;
  if (ok === null) { stamp.className = "stamp"; return; }
  stamp.textContent = ok ? "CLAIMABLE" : "NOT MATURE";
  stamp.className = "stamp";
  void stamp.offsetWidth; // restart animation
  stamp.className = "stamp show" + (ok ? " ok" : "");
}

async function checkClaim() {
  const out = $("claim-result");
  const id = parseInt(($("claim-id").value || "").trim(), 10);
  if (!id || id < 1) { out.textContent = "Enter a Node number first."; setStamp(null); return; }
  out.textContent = "Reading chain…";
  setStamp(null);
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
    setStamp(ok);
  } catch (e) {
    out.textContent = "Node not found or chain read failed. Check the number and retry.";
    setStamp(null);
  }
}

// Claim phase strip: highlight the current 6-hour UTC phase.
function tickPhases() {
  const wrap = $("phases");
  if (!wrap) return;
  const idx = Math.floor(new Date().getUTCHours() / 6);
  wrap.querySelectorAll(".phase").forEach((el, i) => el.classList.toggle("on", i === idx));
  const note = $("phase-note");
  if (note) note.textContent = `Current claim phase · ${"ABCD"[idx]} · a sealed Node matures one phase after its Graph seals.`;
}

// Specimen gallery: swap the large plate, caption from metadata.
async function showSpecimen(id, btn) {
  const img = $("spec-img");
  if (!img) return;
  document.querySelectorAll(".thumb").forEach((t) => t.classList.toggle("on", t === btn));
  img.classList.add("swap");
  setTimeout(() => { img.src = `/img/node/${id}.png`; img.onload = () => img.classList.remove("swap"); }, 180);
  const cap = $("spec-cap");
  if (cap) {
    cap.textContent = `NODE Nº ${id}`;
    try {
      const meta = await (await fetch(`/metadata/node/${id}.json`)).json();
      const traits = Object.fromEntries((meta.attributes || []).map((a) => [a.trait_type, a.value]));
      cap.textContent = `NODE Nº ${id} · ${(traits.Kind || "").toUpperCase()}${traits.Class === "Hub" ? " · HUB" : ""}`;
    } catch (e) { /* keep plain caption */ }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  refresh();
  setInterval(refresh, 30000);
  const btn = $("claim-check");
  if (btn) btn.addEventListener("click", checkClaim);
  const cv = $("plate-canvas");
  if (cv) {
    cv.addEventListener("pointermove", platePointer);
    cv.addEventListener("pointerdown", platePointer);
    cv.addEventListener("pointerleave", () => {
      plateHover = -1;
      const hov = $("fig-hover");
      if (hov) hov.textContent = "";
      if (REDUCED) plateLoop(performance.now());
    });
  }
  tickPhases();
  setInterval(tickPhases, 60000);
  document.querySelectorAll(".thumb").forEach((btn) =>
    btn.addEventListener("click", () => showSpecimen(btn.dataset.id, btn)));
  // Scroll reveals
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: 0.1 });
  document.querySelectorAll(".rv, section.block, .platefig, .board, .gauge, .ladder .rung, .phases, .specimen").forEach((el) => {
    el.classList.add("rv");
    io.observe(el);
  });
});

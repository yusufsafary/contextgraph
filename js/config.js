// Contextgraph on-chain configuration (BNB Chain, chainId 56)
const CONFIG = {
  chainId: 56,
  token: { address: "0x9E1A59c0e073B12E0546f1321eA4cb5A51C71b88", symbol: "CTX", name: "Contextgraph" },
  nodes: { address: "0x08b1323a74530BEDd2188b458eBcC856315d8E0f", symbol: "NODE", name: "Contextgraph Nodes" },
  claim: { address: "0x51A0d0617e76548906040c1Df7466934083980D8", name: "Contextgraph Claim Burn" },
  genesisStart: 1794819600, // 2026-11-16 09:00 UTC, Graphs seal daily 09:00 UTC
  feeLowBNB: "0.000277",
  feeHighBNB: "0.000555",
  rpcs: [
    "https://bsc-dataseed.binance.org",
    "https://bsc.publicnode.com",
    "https://bsc-dataseed1.defibit.io",
  ],
};

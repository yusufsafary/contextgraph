# Contextgraph Agent Skill

Contextgraph (contextgraph.art) is a daily graph on BNB Chain (chainId 56).
Agents mint Nodes into a running Graph. Graphs seal daily at 09:00 UTC.
Sealed Nodes claim $CTX. Mint and claim are agent-only: this site has no
wallet connect and no browser mint.

## Contracts

- $CTX Token: 0x9E1A59c0e073B12E0546f1321eA4cb5A51C71b88
- Nodes (NODE): 0x08b1323a74530BEDd2188b458eBcC856315d8E0f
- Claim: 0x3552cd445b9Bb79046fa82e3c1Cd2fa8AF1EF524
- Agent ID gate (SPACE ID ERC-721): 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F
- Genesis: 2026-11-16 09:00 UTC (unix 1794819600). Graph n covers
  [genesis + (n-1) days, genesis + n days).

## Rules

- Wallet must hold an Agent ID NFT to mint.
- First Node per wallet per Graph: FREE via mintFree(answer).
- Nodes 2-5: 0.0002 BNB each. Nodes 6-10: 0.0004 BNB each, via mintPaid()
  with exactly priceFor(wallet) as value. Max 10 Nodes per wallet per Graph.
- Anti-bot question: read questionFor(wallet) -> (a, b, op) with
  op 0 = a+b, 1 = a-b, 2 = a*b. Salt "CONTEXTGRAPH-Q". answerFor(wallet)
  returns the expected answer on-chain; prefer computing from
  questionFor so the flow also works if you verify locally.
- Verdict per Graph from unique participants at seal: under 25 Isolated,
  25-100 Linked, over 100 Networked.
- Node kind = seedOf(id) % 3 (0 Root, 1 Bridge, 2 Leaf).
  Hub = seedOf(id) % 1000 >= 970; check isHub(id).

## Claim

- One claim per Node, to current owner, Node is not burned.
- Claim phases run every 6 hours (phase = timestamp / 21600). A Node
  matures one phase after its Graph seals: a Graph sealing 09:00 UTC
  pays from 12:00 UTC the same day. Claims never expire.
- Rates: Isolated 2,500 CTX; Linked 12,500 CTX; Networked 60,000 CTX;
  Hub 250,000 CTX.
- Fees: read feeFor(id). Ordinary 0.000277 BNB, Hub 0.000555 BNB
  (exact wei values live in the Claim contract: feeLowWei / feeHighWei).
- Flow: check claimable(id) == true, read claimAmount(id) and feeFor(id),
  then call claim(id) with value == feeFor(id).

## Useful reads

- currentGraph(), totalNodes(), nodesInGraph(g), participantsOf(g)
- verdictOf(g), graphEnd(g), isSealed(g)
- graphOf(id), seedOf(id), kindOf(id), isHub(id), minterOf(id)
- priceFor(wallet), mintOpen()
- totalClaimed(), claimOpen(), poolBalance()

## Notes

- Calls must come from an EOA (tx.origin == msg.sender) for mintFree,
  mintPaid and claim; contract callers are rejected.
- If mintOpen() or claimOpen() is false, wait for the opening
  announcement on contextgraph.art.

# Contextgraph Agent Skill

Contextgraph (contextgraph.art) is a daily graph on BNB Chain (chainId 56).
Agents mint Nodes into a running Graph. Graphs seal daily at 09:00 UTC.
Sealed Nodes claim $CTX. Mint and claim are agent-only: this site has no
wallet connect and no browser mint.

Official X: https://x.com/contextgraphart (@contextgraphart)

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

## Pass lane (from Graph Nº 4, 19 Nov 2026 09:00 UTC)

A second set of contracts adds a wallet lane next to the agent lane.
Graphs 1 to 3 live entirely on the v1 contracts above. From Graph Nº 4,
minting and claiming run on v2, behind a dual gate: the agent lane
(Agent ID + question) works exactly as above, and a Pass lane admits
any wallet holding a Contextgraph Pass.

- Pass (CPASS): 0x8BDfAf227D04a7f531c670D39728F9D2adf56aab
  Unlimited supply. Sales are LIVE. Buy with mint() at value == price()
  (0.00123 BNB at launch; always read price() first). One Pass per
  wallet is enough; the Pass is a transferable ERC-721 and never
  expires. Humans buy on https://contextgraph.art/pass
- Nodes v2 (NODE): 0x189DB6602B8D41a0d14CcCc9e999DC3aF895c3f2
  Same genesis (1794819600), same ladder, same verdicts as v1.
  Agent lane: mintFree(answer) / mintPaid(), unchanged.
  Pass lane: holdsPass(wallet) must be true. Free Node via
  mintFreePass() (no question, no answer argument). Paid Nodes via
  mintPaidPass() with value == priceFor(wallet).
  The per-wallet count is shared across both lanes: max 10 Nodes per
  wallet per Graph in total, first one free whichever lane mints it.
  mintOpen() opens at Graph Nº 4 (19 Nov 2026 09:00 UTC).
- Claim v2: 0x35B69a4204DC143B8CfEe5D91541D25e8D4095E9
  Claims for v2 Nodes only, same rates, fees and phase rule as the v1
  Claim (read feeFor(id), call claim(id) with that value). Pool
  2,000,000,000 CTX. claimOpen() opens with Graph Nº 4.
- v2 Node ids restart at 1. A Node id is meaningless without its
  contract: v1 id 7 and v2 id 7 are different Nodes. For Graphs 1 to 3
  use v1 contracts; from Graph Nº 4 use v2 contracts.
- The Pass lane also removes the browser limitation for humans: the
  Pass page connects a normal BNB wallet (EIP-1193) for buying a Pass
  and for Pass-lane mints. Agents keep calling contracts directly.

## Notes

- Calls must come from an EOA (tx.origin == msg.sender) for mintFree,
  mintPaid and claim; contract callers are rejected.
- If mintOpen() or claimOpen() is false, wait for the opening
  announcement on contextgraph.art.

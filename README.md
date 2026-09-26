# CredScore

CredScore is a GenLayer-native reputation registry for autonomous agents. It records wallet-authored task ratings, tracks GEN bonds, computes stake-weighted scores, and uses GenLayer’s validator consensus to adjudicate evidence-backed disputes. Reputation audit snapshots can be pinned to IPFS by the optional TypeScript/Node aggregator.

## Run the frontend

```sh
npm install
cp .env.example .env.local
npm run dev
```

The dashboard connects to the deployed CredScore contract on Studio Dev. The illustrative network totals and trend charts stay labeled as sample metrics until an indexer is configured.

Connect an EIP-1193 wallet on Studio Dev. GenLayerJS submits contract writes through chain ID 61997.

## Contract

`contracts/credscore.py` is a Python Intelligent Contract, not an ERC-721 Solidity contract. GenLayer Intelligent Contracts do not inherit Solidity token standards. Here each registered wallet is the portable profile identity; the current score, stake, task ratings, dispute state, and audit snapshot URI are readable through contract views. An EVM-layer NFT wrapper can be added later if interoperable NFT ownership is a hard product requirement.

The contract is deployed on Studio Dev at `0xFD073b95B530265d6E570Dc25a16e6165a0e5836`. To redeploy, use the GenLayer CLI (`genlayer network set studio-dev`, then `genlayer deploy --contract contracts/credscore.py`) or load the file into [GenLayer Studio Next](https://studio-next.genlayer.com/). Verify the deployment transaction before changing the frontend environment. The deployer is the initial snapshot aggregator. Use `set_aggregator(new_aggregator)` from the deployer wallet before running the worker under a separate key.

The contract stores ratings and computes score synchronously. Rater stake at submission sets the rating weight, with an unbonded reviewer assigned a weight of one. Disputes preserve both the original rating evidence and the challenge URI; `adjudicate_dispute` asks GenLayer validators to independently compare verdicts against those sources under the comparative Equivalence Principle. The contract does not slash funds: no evidence-based bond ownership or safe withdrawal policy is specified in this MVP.

## Snapshot aggregator

The worker polls the contract because GenLayer Intelligent Contract state changes are not Solidity event logs. It collects rating records, computes a check value, uploads an IPFS JSON snapshot using Pinata, and calls the access-controlled `publish_snapshot` method. Set the environment variables in a server environment only; never expose the signing key or Pinata JWT in frontend variables.

```sh
npm run aggregator
```

The worker account must be set as aggregator by the contract owner. Snapshots mirror the contract score and include the supporting rating IDs, rater addresses, evidence URIs, stake, and dispute outcomes.

## Contract interface

| Method | Type | Purpose |
|---|---|---|
| `register_agent(name, profile_uri)` | write | Register caller wallet as an agent |
| `stake()` | payable write | Add attached GEN to caller’s bond |
| `submit_rating(target, rating, evidence_uri)` | write | Sign a 1–5 task rating as the caller |
| `file_dispute(rating_id, evidence_uri)` | write | Attach a public challenge evidence URI |
| `adjudicate_dispute(rating_id)` | GenLayer write | Review evidence and apply a verdict |
| `get_agent(agent)` / `get_agents()` | view | Read a profile and the agent directory |
| `get_rating(rating_id)` / `get_rating_count()` | view | Read rating and dispute records |
| `set_aggregator(address)` / `publish_snapshot(agent, uri)` | owner / aggregator writes | Authorize and publish IPFS audit snapshots |

The score formula is `20 × weighted average(rating 1..5)`, rounded down. Successful disputes remove the invalidated rating from subsequent calculations.

## Routes

- `/dashboard` — network overview, top agents, recent activity
- `/agents` and `/agents/:address` — searchable directory and agent profile
- `/ratings` — rating stream and evidence links
- `/disputes` — open challenges and adjudication actions
- `/docs` — protocol and contract guide
- `/settings` — network, contract, and wallet configuration

## GenLayer references used

- [Your First Contract](https://docs.genlayer.com/developers/intelligent-contracts/first-contract) and [Storage](https://docs.genlayer.com/developers/intelligent-contracts/features/storage)
- [Non-deterministic operations](https://docs.genlayer.com/developers/intelligent-contracts/features/non-determinism), [LLM integration](https://docs.genlayer.com/developers/intelligent-contracts/examples/llm-hello-world), and [web access](https://docs.genlayer.com/developers/intelligent-contracts/features/web-access)
- [Value transfers](https://docs.genlayer.com/developers/intelligent-contracts/features/value-transfers)
- [GenLayerJS contract methods](https://docs.genlayer.com/api-references/genlayer-js/contracts) and [GenLayerJS reference](https://docs.genlayer.com/api-references/genlayer-js)
- [Reading contract data](https://docs.genlayer.com/developers/decentralized-applications/reading-data) and [writing contract data](https://docs.genlayer.com/developers/decentralized-applications/writing-data)

GenLayer publishes SDK and tooling skills through its [skills catalog](https://skills.genlayer.com/). There is no GenLayer-specific local skill installed in this workspace; the implementation follows the official contract, SDK, and API references linked above.

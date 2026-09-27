# CredScore

CredScore is a GenLayer-native reputation registry for autonomous agents. It records wallet-authored task ratings, tracks GEN bonds, computes stake-weighted scores, and uses GenLayer’s validator consensus to adjudicate evidence-backed disputes. Reputation audit snapshots can be pinned to IPFS by the optional TypeScript/Node aggregator.

## Run the frontend

```sh
npm install
cp .env.example .env.local
npm run dev
```

The dashboard connects to the deployed CredScore contract on Studio Dev. The illustrative network totals and trend charts stay labeled as sample metrics until an indexer is configured.

Connect a wallet through Reown on Studio Dev. GenLayerJS submits contract writes through chain ID 61997. The Reown project id is the public `VITE_REOWN_PROJECT_ID` value.

## Contract

`contracts/credscore.py` is a Python Intelligent Contract, not an ERC-721 Solidity contract. GenLayer Intelligent Contracts do not inherit Solidity token standards. Here each registered wallet is the portable profile identity; the current score, stake, task ratings, dispute state, and audit snapshot URI are readable through contract views. An EVM-layer NFT wrapper can be added later if interoperable NFT ownership is a hard product requirement.

The Studio Dev deployment is `0xd5c4D1D3D228001f97273ED2855277cC49eC9940` (chain 61997). It includes task acceptance, the rating-weight budget, and the dispute bond. Do not point the app at `0xFD073b95B530265d6E570Dc25a16e6165a0e5836`. The installed GenLayer CLI on this machine does not list the `studio-dev` network; deploy from a client pointed at `https://studio-dev.genlayer.com/api`. The contract's Depends line must be the only leading `#` line, because Studio reads every leading comment as the runner header. The deployer `0x9e87Cadef97d0BF53BD72f55242a37c21318a230` is the owner and the initial snapshot aggregator. Use `set_aggregator(new_aggregator)` before running the worker under a separate key.

## Cloudflare Pages

This repository includes `wrangler.toml`, SPA redirects, security headers, and a GitHub Actions deployment workflow. In Cloudflare Pages, use:

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node version:** `20`

The connected Cloudflare application is currently a Worker, so its **Deploy command** can remain `npx wrangler deploy`. `wrangler.toml` declares `dist` under `[assets]` for that deployment. If you recreate it as a Pages project, leave the Pages deploy command empty or use `npm run deploy:pages` instead.

For GitHub Actions, add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets. The workflow sets the public `VITE_REOWN_PROJECT_ID` and bakes `VITE_CREDSCORE_ADDRESS` into the Vite build. The workflow deploys the `main` branch to the Cloudflare Pages project named `credscore`.

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
| `open_task(task_id, counterparty, description)` | write | Agent records one task for one counterparty |
| `accept_task(task_id)` | write | Counterparty accepts that task |
| `cancel_task(task_id)` | write | Agent cancels a task that has no rating |
| `stake()` | payable write | Add GEN. The balance can fund rating weight once |
| `submit_rating(task_id, rating, evidence_uri)` | write | Accepted counterparty submits the only 1–5 rating |
| `file_dispute(rating_id, evidence_uri)` | payable write | Participant posts the bond and challenge evidence |
| `adjudicate_dispute(rating_id)` | GenLayer write | Exact APPROVE or REJECT; the first one is final |
| `transfer_ownership(address)` | owner write | Move the owner key |
| `add_evidence_host(host)` / `remove_evidence_host(host)` | owner writes | Maintain the evidence host allowlist |
| `get_agent(agent)` / `get_agents()` | view | Read a profile and the agent directory |
| `get_task(task_id)` | view | Read the authenticated task and its rating id |
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

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import { createAccount, createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const { AGGREGATOR_PRIVATE_KEY, VITE_CREDSCORE_ADDRESS, PINATA_JWT } = process.env;
if (!AGGREGATOR_PRIVATE_KEY || !VITE_CREDSCORE_ADDRESS || !PINATA_JWT) {
  throw new Error("Set AGGREGATOR_PRIVATE_KEY, VITE_CREDSCORE_ADDRESS, and PINATA_JWT before starting the aggregator.");
}

const contract = VITE_CREDSCORE_ADDRESS;
const client = createClient({ chain: studioDevnet, account: createAccount(AGGREGATOR_PRIVATE_KEY) });
const cache = new Map();
const lastSnapshot = new Map();
const zero = "0x0000000000000000000000000000000000000000";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function read(method, args = []) {
  return client.readContract({ address: contract, functionName: method, args, jsonSafeReturn: true });
}

async function uploadSnapshot(snapshot) {
  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ pinataContent: snapshot, pinataMetadata: { name: `credscore-${snapshot.agent}-${snapshot.generatedAt}` } }),
  });
  if (!response.ok) throw new Error(`Pinata upload failed (${response.status}): ${await response.text()}`);
  const result = await response.json();
  return `ipfs://${result.IpfsHash}`;
}

async function sync() {
  const agents = await read("get_agents");
  const count = Number(await read("get_rating_count"));
  for (let id = 1; id <= count; id++) {
    const r = await read("get_rating", [BigInt(id)]);
    cache.set(id, { id, target: String(r.target ?? zero), author: String(r.author ?? zero), rating: Number(r.rating ?? 0), weight: BigInt(String(r.weight ?? "1")), evidenceUri: String(r.evidence ?? ""), task: String(r.task ?? ""), disputed: Boolean(r.disputed), resolved: Boolean(r.resolved), approved: Boolean(r.approved) });
  }

  for (const agentAddress of agents ?? []) {
    const agent = String(agentAddress);
    const info = await read("get_agent", [agent]);
    const stake = BigInt(String(info.stake ?? "0"));
    const rows = [...cache.values()].filter(r => r.target.toLowerCase() === agent.toLowerCase());
    let weighted = 0n, weights = 0n;
    for (const row of rows) {
      if (row.rating < 1 || row.rating > 5) continue;
      const weight = row.weight;
      weighted += BigInt(row.rating) * weight;
      weights += weight;
    }
    const calculatedScore = weights ? Number(weighted * 20n / weights) : 50;
    const snapshotCore = {
      schema: "credscore.snapshot.v1", agent, score: Number(info.score ?? calculatedScore),
      calculatedScore, stakeWei: stake.toString(), ratingCount: rows.length,
      ratings: rows.map(({ id, author, rating, weight, evidenceUri, task, disputed, resolved, approved }) => ({ id, author, rating, weight: weight.toString(), evidenceUri, task, disputed, resolved, approved })),
      source: "credscore-aggregator",
    };
    const fingerprint = JSON.stringify(snapshotCore);
    if (lastSnapshot.get(agent) === fingerprint) continue;
    const snapshot = { ...snapshotCore, generatedAt: new Date().toISOString() };
    const snapshotUri = await uploadSnapshot(snapshot);
    const hash = await client.writeContract({ address: contract, functionName: "publish_snapshot", args: [agent, snapshotUri], value: 0n });
    await client.waitForTransactionReceipt({ hash });
    lastSnapshot.set(agent, fingerprint);
    console.log(`[CredScore] ${agent} · score ${snapshot.score} · ${rows.length} ratings · ${snapshotUri} · ${hash}`);
  }
}

console.log(`[CredScore] Aggregator online for ${contract} on Studio Dev`);
for (;;) {
  try { await sync(); }
  catch (error) { console.error("[CredScore] sync failed:", error); }
  await sleep(30_000);
}

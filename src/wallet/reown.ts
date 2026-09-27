import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { defineChain } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { QueryClient } from "@tanstack/react-query";
import { studioDevnet } from "genlayer-js/chains";

/** Public Reown client id. Override with VITE_REOWN_PROJECT_ID. */
export const reownProjectId = import.meta.env.VITE_REOWN_PROJECT_ID || "f0d6f8162be1beccf221b4e2f8bd7026";

const appOrigin = typeof window !== "undefined" ? window.location.origin : "https://credscore.alemzdelight.workers.dev";

export const studioDevNetwork = defineChain({
  id: studioDevnet.id,
  caipNetworkId: `eip155:${studioDevnet.id}`,
  chainNamespace: "eip155",
  name: studioDevnet.name,
  nativeCurrency: studioDevnet.nativeCurrency,
  rpcUrls: { default: { http: [...studioDevnet.rpcUrls.default.http] } },
  testnet: true,
});

const networks = [studioDevNetwork] as const;

export const wagmiAdapter = new WagmiAdapter({
  networks: [...networks],
  projectId: reownProjectId,
  ssr: false,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
export const queryClient = new QueryClient();

createAppKit({
  adapters: [wagmiAdapter],
  networks: [studioDevNetwork],
  defaultNetwork: studioDevNetwork,
  projectId: reownProjectId,
  metadata: {
    name: "CredScore",
    description: "Reputation records for autonomous agents on GenLayer.",
    url: appOrigin,
    icons: [`${appOrigin}/credscore-mark.svg`],
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
    onramp: false,
    swaps: false,
    history: false,
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#b47af1",
    "--w3m-color-mix": "#140d1e",
    "--w3m-color-mix-strength": 20,
  },
});

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

const STUDIO_CHAIN_HEX = `0x${studioDevnet.id.toString(16)}`;

/** Ask the connected wallet to use GenLayer Studio Dev before a write. */
export async function ensureStudioDev(provider: Eip1193Provider) {
  const current = await provider.request({ method: "eth_chainId" });
  if (typeof current === "string" && current.toLowerCase() === STUDIO_CHAIN_HEX) return;
  const chain = {
    chainId: STUDIO_CHAIN_HEX,
    chainName: studioDevnet.name,
    rpcUrls: [...studioDevnet.rpcUrls.default.http],
    nativeCurrency: studioDevnet.nativeCurrency,
  };
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: STUDIO_CHAIN_HEX }] });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? Number((error as { code: number }).code) : 0;
    if (code !== 4902 && code !== -32603) throw error;
    await provider.request({ method: "wallet_addEthereumChain", params: [chain] });
  }
}

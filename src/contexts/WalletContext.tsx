import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useAppKit, useAppKitAccount, useAppKitProvider, useDisconnect } from "@reown/appkit/react";
import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import type { Address } from "viem";
import { ensureStudioDev, type Eip1193Provider } from "@/wallet/reown";

interface WalletContextType {
  address: string;
  balance: number;
  isConnecting: boolean;
  isConnected: boolean;
  client: ReturnType<typeof createClient>;
  walletError: string;
  openWallet: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};

const readClient = () => createClient({ chain: studioDevnet });

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { open } = useAppKit();
  const { disconnect: reownDisconnect } = useDisconnect();
  const { address: connectedAddress, isConnected, status } = useAppKitAccount({ namespace: "eip155" });
  const { walletProvider } = useAppKitProvider<Eip1193Provider>("eip155");
  const [client, setClient] = useState(readClient);
  const [balance, setBalance] = useState(0);
  const [walletError, setWalletError] = useState("");

  const address = isConnected && connectedAddress ? connectedAddress : "";
  const isConnecting = status === "connecting" || status === "reconnecting";

  useEffect(() => {
    if (!address || !walletProvider) {
      setClient(readClient());
      setBalance(0);
      if (!address) setWalletError("");
      return;
    }
    let alive = true;
    (async () => {
      try {
        await ensureStudioDev(walletProvider);
        if (!alive) return;
        setWalletError("");
        setClient(createClient({
          chain: studioDevnet,
          account: address as Address,
          provider: walletProvider,
        }));
      } catch (error) {
        if (!alive) return;
        setWalletError(error instanceof Error ? error.message : "Switch the wallet to GenLayer Studio Dev (chain 61997).");
        setClient(createClient({
          chain: studioDevnet,
          account: address as Address,
          provider: walletProvider,
        }));
      }
    })();
    return () => { alive = false; };
  }, [address, walletProvider]);

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    try {
      const bal = await client.getBalance({ address: address as Address });
      setBalance(Number(bal) / 1e18);
    } catch (error) {
      console.warn("Balance fetch failed", error);
    }
  }, [client, address]);

  useEffect(() => {
    if (!address) return;
    void refreshBalance();
    const interval = window.setInterval(() => void refreshBalance(), 30000);
    return () => window.clearInterval(interval);
  }, [address, refreshBalance]);

  const openWallet = useCallback(async () => {
    await open(isConnected ? { view: "Account" } : { view: "Connect" });
  }, [open, isConnected]);

  const disconnect = useCallback(async () => {
    await reownDisconnect({ namespace: "eip155" });
    setClient(readClient());
    setBalance(0);
    setWalletError("");
  }, [reownDisconnect]);

  return (
    <WalletContext.Provider value={{ address, balance, isConnecting, isConnected, client, walletError, openWallet, disconnect, refreshBalance }}>
      {children}
    </WalletContext.Provider>
  );
};

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import type { Address } from "viem";

interface Transaction {
  id: string;
  type: "deposit" | "withdraw" | "bet" | "reward" | "payment" | "bounty" | "deploy" | "call";
  amount: number;
  description: string;
  timestamp: Date;
  hash?: string;
}

type ConnectionMode = "none" | "generated" | "injected";

interface WalletContextType {
  address: string;
  balance: number;
  transactions: Transaction[];
  connectionMode: ConnectionMode;
  isConnecting: boolean;
  isConnected: boolean;
  client: ReturnType<typeof createClient> | null;
  account: ReturnType<typeof createAccount> | null;
  privateKey: string | null;
  connectGenerated: () => Promise<void>;
  connectInjected: (providerName?: string) => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  deposit: (amount: number) => void;
  withdraw: (amount: number, description: string, type?: Transaction["type"]) => boolean;
  reward: (amount: number, description: string) => void;
  addTransaction: (tx: Omit<Transaction, "id" | "timestamp">) => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};

export function getAvailableWallets(): { name: string; icon: string; provider: any }[] {
  if (typeof window === "undefined") return [];
  const wallets: { name: string; icon: string; provider: any }[] = [];
  const ethereum = (window as any).ethereum;
  if (!ethereum) return wallets;

  if (ethereum.providers?.length) {
    for (const p of ethereum.providers) {
      if (p.isMetaMask) wallets.push({ name: "MetaMask", icon: "🦊", provider: p });
      else if (p.isCoinbaseWallet) wallets.push({ name: "Coinbase Wallet", icon: "🔵", provider: p });
      else if (p.isBraveWallet) wallets.push({ name: "Brave Wallet", icon: "🦁", provider: p });
      else if (p.isRabby) wallets.push({ name: "Rabby", icon: "🐰", provider: p });
      else wallets.push({ name: "Wallet", icon: "💳", provider: p });
    }
  } else {
    if (ethereum.isMetaMask) wallets.push({ name: "MetaMask", icon: "🦊", provider: ethereum });
    else if (ethereum.isCoinbaseWallet) wallets.push({ name: "Coinbase Wallet", icon: "🔵", provider: ethereum });
    else if (ethereum.isBraveWallet) wallets.push({ name: "Brave Wallet", icon: "🦁", provider: ethereum });
    else if (ethereum.isRabby) wallets.push({ name: "Rabby", icon: "🐰", provider: ethereum });
    else wallets.push({ name: "Browser Wallet", icon: "💳", provider: ethereum });
  }
  return wallets;
}

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("none");
  const [isConnecting, setIsConnecting] = useState(false);
  const [client, setClient] = useState<ReturnType<typeof createClient> | null>(() => createClient({ chain: studioDevnet }));
  const [account, setAccount] = useState<ReturnType<typeof createAccount> | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);

  const isConnected = connectionMode !== "none";

  const addTx = useCallback((tx: Omit<Transaction, "id" | "timestamp">) => {
    setTransactions((prev) => [
      { ...tx, id: Date.now().toString(), timestamp: new Date() },
      ...prev,
    ]);
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!client || !address) return;
    try {
      const bal = await client.getBalance({ address: address as Address });
      const numBal = Number(bal) / 1e18;
      console.log("[GenForge] Balance fetched:", numBal, "GEN for", address);
      setBalance(numBal);
    } catch (e) {
      console.warn("[GenForge] Balance fetch failed (this is normal if RPC is unreachable):", e);
      // Don't reset balance on error — keep last known value
    }
  }, [client, address]);

  const connectGenerated = useCallback(async () => {
    setIsConnecting(true);
    try {
      const pk = generatePrivateKey();
      const acc = createAccount(pk);
      const cl = createClient({ chain: studioDevnet, account: acc });

      setAccount(acc);
      setClient(cl);
      setAddress(acc.address);
      setPrivateKey(null);
      setConnectionMode("generated");
      addTx({ type: "deposit", amount: 0, description: "Connected via Generated Wallet (Studio Dev)" });
    } catch (e) {
      console.error("Generated wallet connection failed:", e);
    } finally {
      setIsConnecting(false);
    }
  }, [addTx]);

  const connectInjected = useCallback(async (providerName?: string) => {
    setIsConnecting(true);
    try {
      const wallets = getAvailableWallets();
      const wallet = providerName ? wallets.find(w => w.name === providerName) : wallets[0];
      if (!wallet) throw new Error("No compatible EVM wallet detected.");

      const provider = wallet.provider;
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const addr = accounts[0] as Address;

      // Provider-backed clients let GenLayerJS request signatures from the connected wallet.
      const cl = createClient({ chain: studioDevnet, account: addr, provider });
      await cl.connect("studioDevnet");

      setClient(cl);
      setAccount(null);
      setAddress(addr);
      setPrivateKey(null);
      setConnectionMode("injected");
      addTx({ type: "deposit", amount: 0, description: `Connected via ${wallet.name} (Studio Dev)` });
    } catch (e) {
      console.error("Injected wallet connection failed:", e);
      throw e;
    } finally {
      setIsConnecting(false);
    }
  }, [addTx]);

  const disconnect = useCallback(() => {
    setClient(null);
    setAccount(null);
    setAddress("");
    setBalance(0);
    setPrivateKey(null);
    setConnectionMode("none");
    setTransactions([]);
  }, []);

  useEffect(() => {
    if (isConnected && client && address) {
      refreshBalance();
      const interval = setInterval(refreshBalance, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, client, address, refreshBalance]);

  const deposit = (amount: number) => {
    setBalance((b) => b + amount);
    addTx({ type: "deposit", amount, description: "Deposit" });
  };

  const withdraw = (amount: number, description: string, type: Transaction["type"] = "withdraw") => {
    if (balance < amount) return false;
    setBalance((b) => b - amount);
    addTx({ type, amount: -amount, description });
    return true;
  };

  const reward = (amount: number, description: string) => {
    setBalance((b) => b + amount);
    addTx({ type: "reward", amount, description });
  };

  return (
    <WalletContext.Provider
      value={{
        address, balance, transactions, connectionMode, isConnecting, isConnected,
        client, account, privateKey,
        connectGenerated, connectInjected, disconnect, refreshBalance,
        deposit, withdraw, reward, addTransaction: addTx,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

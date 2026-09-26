import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Trophy, Brain, Gamepad2, Dice5, Home, Code2, Key, Eye, EyeOff, Copy, Check, ExternalLink, Wallet, Settings, BookOpen, Droplets, Loader2 } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import genForgeLogo from "@/assets/genforge-logo.png";
import WalletModal from "@/components/WalletModal";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/bounties", icon: Trophy, label: "Bounties" },
  { path: "/trivia", icon: Brain, label: "Trivia" },
  { path: "/rpg", icon: Gamepad2, label: "Game Master" },
  { path: "/betting", icon: Dice5, label: "Betting" },
  { path: "/deploy", icon: Code2, label: "Deploy" },
  { path: "/docs", icon: BookOpen, label: "Docs" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

const SidebarFaucetButton = ({ address }: { address: string }) => {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const { toast } = useToast();
  const { refreshBalance } = useWallet();

  const requestTokens = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch("https://genlayer-faucet.vercel.app/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, network: "Genlayer Testnet", token: "GEN", turnstileToken: "" }),
      });
      if (!res.ok) throw new Error(await res.text() || "Faucet request failed");
      toast({ title: "Tokens requested!", description: "GEN tokens should arrive shortly." });
      setCooldown(true);
      setTimeout(() => setCooldown(false), 60000);
      setTimeout(() => refreshBalance(), 5000);
    } catch (e: any) {
      toast({ title: "Faucet error", description: e.message || "Try again later.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={requestTokens}
      disabled={loading || cooldown}
      className="flex items-center gap-1.5 text-xs font-mono px-2 py-1.5 rounded bg-accent/50 text-accent-foreground hover:bg-accent transition-colors disabled:opacity-50 w-full"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Droplets className="w-3 h-3" />}
      {cooldown ? "Cooldown..." : loading ? "Requesting..." : "Get Testnet GEN"}
    </button>
  );
};

const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { address, balance, isConnected, connectionMode, disconnect, privateKey } = useWallet();
  const [showPK, setShowPK] = useState(false);
  const [copied, setCopied] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const { toast } = useToast();

  const copyPK = () => {
    if (privateKey) {
      navigator.clipboard.writeText(privateKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Private key copied", description: "Keep it safe! Never share it." });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex flex-1">
        <aside className="w-56 border-r border-border bg-card/50 flex flex-col shrink-0 sticky top-0 h-screen">
          <div className="p-4 border-b border-border">
            <Link to="/" className="flex items-center gap-2">
              <img src={genForgeLogo} alt="GenForge" className="w-6 h-6 rounded" />
              <span className="font-mono font-bold text-foreground text-sm">GenForge</span>
            </Link>
          </div>
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-border space-y-2">
            {isConnected ? (
              <>
                <div className="flex items-center gap-2 px-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-bold text-foreground">{balance.toFixed(4)} GEN</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono px-2 truncate">{address}</p>
                <p className="text-xs text-muted-foreground font-mono px-2">Studio Dev · 61997</p>

                <SidebarFaucetButton address={address} />

                {connectionMode === "generated" && privateKey && (
                  <div className="px-2 space-y-1">
                    <button
                      onClick={() => setShowPK(!showPK)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
                    >
                      <Key className="w-3 h-3" />
                      {showPK ? "Hide" : "Show"} Private Key
                      {showPK ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    {showPK && (
                      <div className="bg-destructive/10 border border-destructive/30 rounded p-1.5 relative">
                        <p className="text-[9px] text-destructive font-mono break-all pr-5">{privateKey}</p>
                        <button onClick={copyPK} className="absolute top-1 right-1">
                          {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button onClick={disconnect} className="text-xs text-destructive hover:underline px-2 font-mono">
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => setWalletModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 text-xs font-mono px-2 py-2 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5" />
                Connect Wallet
              </button>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1">{children}</div>
        </main>
      </div>

      <footer className="border-t border-border py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-mono">
            <img src={genForgeLogo} alt="GenForge" className="w-4 h-4 rounded" />
            <span>GenForge</span>
          </div>
          <a
            href="https://x.com/linoxbt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors font-mono flex items-center gap-1"
          >
            Made by Lino <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>

      <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
    </div>
  );
};

export default AppLayout;

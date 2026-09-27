import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wallet, Zap, ChevronRight } from "lucide-react";
import { getAvailableWallets, useWallet } from "@/contexts/WalletContext";

interface WalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WalletModal = ({ open, onOpenChange }: WalletModalProps) => {
  const { connectGenerated, connectInjected, isConnecting } = useWallet();
  const [error, setError] = useState("");
  const availableWallets = getAvailableWallets();

  const handleGenerate = async () => {
    setError("");
    try {
      await connectGenerated();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate wallet");
    }
  };

  const handleInjected = async (name: string) => {
    setError("");
    try {
      await connectInjected(name);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect wallet");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Wallet className="w-5 h-5 text-primary" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
              Choose a wallet to connect to GenLayer Studio Dev
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          {/* Generate wallet option */}
          <button
            onClick={handleGenerate}
            disabled={isConnecting}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Generate Wallet</p>
              <p className="text-xs text-muted-foreground">Session-only key. It is not saved, and disconnect or refresh drops it.</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Detected wallets */}
          {availableWallets.length > 0 && (
            <>
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-mono">Detected Wallets</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {availableWallets.map((wallet) => (
                <button
                  key={wallet.name}
                  onClick={() => handleInjected(wallet.name)}
                  disabled={isConnecting}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-secondary/50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl">
                    {wallet.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{wallet.name}</p>
                    <p className="text-xs text-muted-foreground">Connect via browser extension</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </>
          )}

          {availableWallets.length === 0 && (
            <div className="text-center py-3">
              <p className="text-xs text-muted-foreground">No browser wallets detected.</p>
              <p className="text-xs text-muted-foreground">Install MetaMask, Rabby, or another EVM wallet.</p>
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}

          {isConnecting && (
            <p className="text-xs text-primary text-center font-mono animate-pulse">Connecting...</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletModal;

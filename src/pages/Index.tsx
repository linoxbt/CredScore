import { motion } from "framer-motion";
import {
  Trophy, Brain, Gamepad2, Dice5, ArrowRight,
  Code2, GitBranch, Cpu, Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useWallet } from "@/contexts/WalletContext";
import { useState } from "react";
import genForgeLogo from "@/assets/genforge-logo.png";
import WalletModal from "@/components/WalletModal";

const products = [
  {
    icon: Trophy,
    title: "Bounty Review",
    description: "Post bounties with on-chain escrow. AI evaluates submissions and triggers payouts automatically.",
    tags: ["Bounties", "On-Chain"],
    path: "/bounties",
  },
  {
    icon: Brain,
    title: "Trivia Games",
    description: "AI generates unique questions live and verifies answers from real sources in real-time.",
    tags: ["Gaming", "AI"],
    path: "/trivia",
  },
  {
    icon: Gamepad2,
    title: "Game Master",
    description: "Text-based RPG with real AI narration. Every choice and outcome is AI-generated live.",
    tags: ["RPG", "AI"],
    path: "/rpg",
  },
  {
    icon: Dice5,
    title: "P2P Betting",
    description: "Create bets confirmed on-chain. AI resolves outcomes from live data with consensus.",
    tags: ["Betting", "On-Chain"],
    path: "/betting",
  },
  {
    icon: Code2,
    title: "Deploy Contracts",
    description: "Write Python Intelligent Contracts and deploy them directly to GenLayer Asimov Testnet.",
    tags: ["Deploy", "Python"],
    path: "/deploy",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const Index = () => {
  const { balance, isConnected, address } = useWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={genForgeLogo} alt="GenForge" className="w-7 h-7 rounded" />
            <span className="font-mono font-bold text-foreground text-lg">GenForge</span>
            <Badge variant="outline" className="text-xs font-mono">testnet</Badge>
          </div>
          <div className="flex items-center gap-4">
            {isConnected ? (
              <>
                <span className="text-sm font-mono text-muted-foreground">{balance.toFixed(4)} GEN</span>
                <span className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">{address}</span>
              </>
            ) : (
              <Button variant="default" size="sm" className="font-mono text-xs" onClick={() => setWalletModalOpen(true)}>
                <Wallet className="w-3.5 h-3.5 mr-1.5" />
                Connect Wallet
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs"
              onClick={() => window.open("https://docs.genlayer.com", "_blank")}
            >
              Docs
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-mono text-primary">Live on Asimov Testnet</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-tight">
              Build & Play on the
              <br />
              <span className="text-primary text-glow">GenLayer Blockchain</span>
            </h1>
            <p className="text-lg text-muted-foreground mt-6 max-w-2xl leading-relaxed">
              Five production-ready tools powered by Intelligent Contracts — deploy contracts,
              play AI games, create bounties, and bet P2P — all on-chain.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground font-mono"
          >
            {[
              { icon: Cpu, text: "LLM Consensus" },
              { icon: Code2, text: "Python Contracts" },
              { icon: GitBranch, text: "Web Browsing" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-2">
                <f.icon className="w-4 h-4 text-primary" />
                <span>{f.text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {products.map((product) => (
              <motion.div key={product.title} variants={item}>
                <Link
                  to={product.path}
                  className="group block rounded-lg bg-card border border-border p-5 hover:border-primary/40 transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <product.icon className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground text-sm">{product.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {product.tags.map((tag) => (
                        <span key={tag} className="text-xs font-mono px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-mono">
            <img src={genForgeLogo} alt="GenForge" className="w-4 h-4 rounded" />
            <span>GenForge</span>
          </div>
          <a
            href="https://x.com/linoxbt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors font-mono"
          >
            Made by Lino
          </a>
        </div>
      </footer>

      <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
    </div>
  );
};

export default Index;

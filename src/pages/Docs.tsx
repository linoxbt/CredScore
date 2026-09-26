import { BookOpen, Code2, Trophy, Brain, Gamepad2, Dice5, Wallet, Shield, ExternalLink, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/AppLayout";

const sections = [
  {
    icon: Zap,
    title: "Getting Started",
    content: [
      "**GenForge** is a suite of decentralized applications built on the GenLayer Asimov Testnet — an AI-powered Layer 1 blockchain that uses Python-based Intelligent Contracts.",
      "To begin, connect your wallet using the sidebar or homepage. You can either generate a new testnet wallet instantly or connect an existing EVM-compatible browser wallet (MetaMask, Rabby, Coinbase Wallet, etc.).",
      "Generated wallets provide a private key you can export from the **Settings** page. All operations use GEN tokens on the Asimov Testnet.",
    ],
  },
  {
    icon: Wallet,
    title: "Wallet & Tokens",
    content: [
      "GenForge supports two connection modes:",
      "• **Generated Wallet** — A testnet wallet created instantly in your browser. Your private key is stored locally and visible in Settings. Use this for quick testing.",
      "• **Browser Wallet** — Connect MetaMask, Rabby, Coinbase Wallet, Brave Wallet, or any injected EVM provider. The app detects all installed wallets automatically.",
      "Your GEN balance is fetched directly from the GenLayer Asimov Testnet RPC and refreshes every 30 seconds. Creating bounties and bets requires allocating GEN tokens to an escrow pool.",
    ],
  },
  {
    icon: Trophy,
    title: "Bounty Review",
    content: [
      "Post bounties with on-chain escrow. When you create a bounty, the reward amount is locked from your wallet balance into a pool.",
      "Anyone can submit work against open bounties by providing a description and link. The bounty creator (or anyone) can trigger an **AI Review** on any submission.",
      "The AI evaluates submissions against the specified criteria, providing a score (0-100), feedback, strengths, and weaknesses. Submissions scoring ≥70 are automatically accepted and the escrowed reward is released to the submitter.",
    ],
  },
  {
    icon: Brain,
    title: "Trivia Games",
    content: [
      "Every trivia question is generated in real-time by AI — there are zero hardcoded questions. Select a category and question count, then the AI creates unique, fact-based questions on demand.",
      "After selecting an answer, a separate AI verification step confirms the correct answer from trusted sources, providing an explanation and citation.",
      "Correct answers earn points (base 100 + time bonus). At the end, GEN rewards are distributed based on performance. A wallet connection is required to play.",
    ],
  },
  {
    icon: Gamepad2,
    title: "Game Master (RPG)",
    content: [
      "A fully AI-narrated text RPG. Every scene, encounter, and outcome is generated live by the AI Game Master — no scripted content.",
      "You have stats (HP, Attack, Defense, Gold, XP) that change based on AI-determined outcomes. Level up by earning XP. The game ends when HP reaches 0.",
      "You can choose from AI-suggested actions or type custom commands. The AI responds contextually to any input. A wallet connection is required to play.",
    ],
  },
  {
    icon: Dice5,
    title: "P2P Betting",
    content: [
      "Create prediction markets on any topic. Each betting event is recorded on-chain with a transaction hash.",
      "Users bet GEN tokens on YES or NO outcomes. The odds bar updates in real-time based on the betting pool distribution.",
      "When enough bets are placed, anyone can trigger **AI Resolution** — the AI analyzes the event from multiple sources and determines the outcome. Winners receive proportional payouts from the total pool.",
    ],
  },
  {
    icon: Code2,
    title: "Deploy Contracts",
    content: [
      "Write Python Intelligent Contracts directly in the browser and deploy them to the GenLayer Asimov Testnet.",
      "Intelligent Contracts are Python classes that inherit from `Contract`. They support `@callable` methods, can browse the web, and use LLM consensus for validation.",
      "Deployed contracts are recorded with their address, transaction hash, and deployment status. The contract list persists across sessions.",
    ],
  },
  {
    icon: Shield,
    title: "Security & Privacy",
    content: [
      "• Private keys for generated wallets are stored only in your browser's localStorage. GenForge servers never have access to your keys.",
      "• All on-chain transactions are signed locally before being broadcast to the GenLayer network.",
      "• The escrow system locks tokens at the application level. Smart contract escrow will be available when GenLayer mainnet launches.",
      "• This is a testnet application. Do not use real funds or sensitive data.",
    ],
  },
];

const Docs = () => {
  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Documentation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete guide to using GenForge — the GenLayer testnet toolkit.
          </p>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Quick Start</p>
                <p className="text-xs text-muted-foreground mt-1">
                  1. Connect your wallet → 2. Choose a tool → 3. Start building or playing. All AI content is generated live. All actions are recorded on-chain.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {sections.map((section) => (
            <Card key={section.title} className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <section.icon className="w-4 h-4 text-primary" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {section.content.map((paragraph, i) => (
                  <p
                    key={i}
                    className="text-sm text-muted-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>'),
                    }}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Need more help?</p>
              <p className="text-xs text-muted-foreground">Check the official GenLayer documentation.</p>
            </div>
            <a
              href="https://docs.genlayer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline font-mono"
            >
              docs.genlayer.com <ExternalLink className="w-3 h-3" />
            </a>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Docs;

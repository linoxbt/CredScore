import { useState, useRef, useEffect } from "react";
import { Gamepad2, Sword, Shield, Heart, Skull, Sparkles, Send, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { useWallet } from "@/contexts/WalletContext";
import { supabase } from "@/integrations/supabase/client";
import WalletModal from "@/components/WalletModal";

interface GameMessage {
  id: string;
  type: "narrator" | "player" | "system" | "combat";
  text: string;
}

interface PlayerStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  gold: number;
  level: number;
  xp: number;
}

type GamePhase = "idle" | "playing" | "gameover";

const GameMaster = () => {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [stats, setStats] = useState<PlayerStats>({ hp: 100, maxHp: 100, attack: 10, defense: 5, gold: 0, level: 1, xp: 0 });
  const [choices, setChoices] = useState<string[]>([]);
  const [customAction, setCustomAction] = useState("");
  const [processing, setProcessing] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { isConnected } = useWallet();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (type: GameMessage["type"], text: string) => {
    setMessages((prev) => [...prev, { id: Date.now().toString() + Math.random(), type, text }]);
  };

  const parseAIResponse = (content: string) => {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
    let statsChange = { hpChange: 0, goldChange: 0, xpGain: 0, outcome: "neutral" };
    if (jsonMatch) {
      try { statsChange = JSON.parse(jsonMatch[1]); } catch {}
    }

    const choicesMatch = content.match(/```choices\s*([\s\S]*?)```/);
    let newChoices: string[] = [];
    if (choicesMatch) {
      try { newChoices = JSON.parse(choicesMatch[1]); } catch {}
    }

    const narrative = content
      .replace(/```json[\s\S]*?```/g, "")
      .replace(/```choices[\s\S]*?```/g, "")
      .trim();

    return { narrative, statsChange, newChoices };
  };

  const callAI = async (playerAction: string) => {
    const newHistory = [...chatHistory, { role: "user", content: playerAction }];

    const { data, error } = await supabase.functions.invoke("ai-game-master", {
      body: { messages: newHistory, playerStats: stats },
    });

    if (error || data?.error) {
      const errMsg = data?.error || error?.message || "AI error";
      toast({ title: "AI Error", description: errMsg, variant: "destructive" });
      throw new Error(errMsg);
    }

    const content = data.content;
    setChatHistory([...newHistory, { role: "assistant", content }]);
    return content;
  };

  const startGame = async () => {
    if (!isConnected) {
      setWalletModalOpen(true);
      toast({ title: "Wallet required", description: "Connect your wallet to play the RPG.", variant: "destructive" });
      return;
    }

    setPhase("playing");
    setMessages([]);
    setChatHistory([]);
    setStats({ hp: 100, maxHp: 100, attack: 10, defense: 5, gold: 0, level: 1, xp: 0 });
    setChoices([]);
    setProcessing(true);

    addMessage("system", "⚔️ Connecting to AI Game Master...");

    try {
      const content = await callAI("Start a new dungeon crawl adventure. Set the scene and give me choices.");
      const { narrative, newChoices } = parseAIResponse(content);
      addMessage("narrator", narrative || content);
      if (newChoices.length > 0) setChoices(newChoices);
      else setChoices(["Explore ahead", "Search for traps", "Rest and prepare"]);
    } catch {
      addMessage("system", "Failed to connect to AI. Using offline mode.");
      addMessage("narrator", "You awaken in a dimly lit cavern. Water drips from stalactites above. Three tunnels branch ahead.");
      setChoices(["Enter the glowing tunnel", "Investigate the growling sounds", "Take the silent path"]);
    }
    setProcessing(false);
  };

  const processChoice = async (choiceText: string) => {
    if (processing) return;
    setProcessing(true);
    setChoices([]);
    addMessage("player", choiceText);
    addMessage("system", "🔮 AI Game Master processing...");

    try {
      const content = await callAI(choiceText);
      const { narrative, statsChange, newChoices } = parseAIResponse(content);

      const newStats = { ...stats };
      newStats.hp = Math.max(0, Math.min(newStats.maxHp, newStats.hp + (statsChange.hpChange || 0)));
      newStats.gold = Math.max(0, newStats.gold + (statsChange.goldChange || 0));
      newStats.xp += statsChange.xpGain || 0;

      const xpNeeded = newStats.level * 50;
      if (newStats.xp >= xpNeeded) {
        newStats.level += 1;
        newStats.xp -= xpNeeded;
        newStats.maxHp += 20;
        newStats.hp = newStats.maxHp;
        newStats.attack += 3;
        newStats.defense += 2;
        addMessage("system", `⚡ LEVEL UP! Now Level ${newStats.level}!`);
      }

      if (statsChange.hpChange && statsChange.hpChange < 0) {
        addMessage("combat", narrative || content);
      } else {
        addMessage("narrator", narrative || content);
      }

      setStats(newStats);

      if (newStats.hp <= 0) {
        addMessage("system", "💀 YOU HAVE FALLEN.");
        setPhase("gameover");
      } else {
        setChoices(newChoices.length > 0 ? newChoices : ["Continue exploring", "Rest", "Search the area"]);
      }
    } catch {
      addMessage("narrator", "The dungeon shifts around you... (AI unavailable, try again)");
      setChoices(["Try again", "Explore", "Rest"]);
    }

    setProcessing(false);
  };

  const handleCustomAction = () => {
    if (!customAction.trim() || processing) return;
    processChoice(customAction);
    setCustomAction("");
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-primary" />
            Game Master
          </h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered text RPG. Real AI narration via Intelligent Contracts.</p>
        </div>

        {!isConnected && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-primary" />
                <p className="text-sm text-foreground">Connect your wallet to play the RPG.</p>
              </div>
              <Button size="sm" onClick={() => setWalletModalOpen(true)} className="bg-primary text-primary-foreground text-xs">
                <Wallet className="w-3 h-3 mr-1" /> Connect
              </Button>
            </CardContent>
          </Card>
        )}

        {phase === "idle" && (
          <Card className="text-center p-10 border-border">
            <Sword className="w-12 h-12 text-primary mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Enter the Dungeon</h2>
            <p className="text-muted-foreground text-sm mb-4">Real AI narrates your adventure. Every outcome is unique.</p>
            <Button onClick={startGame} className="bg-primary text-primary-foreground">
              <Sparkles className="w-4 h-4 mr-2" /> {isConnected ? "Begin Adventure" : "Connect Wallet to Play"}
            </Button>
          </Card>
        )}

        {(phase === "playing" || phase === "gameover") && (
          <>
            <div className="grid grid-cols-5 gap-2">
              <div className="bg-card border border-border rounded-md p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Heart className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-muted-foreground">HP</span>
                </div>
                <Progress value={(stats.hp / stats.maxHp) * 100} className="h-1.5" />
                <span className="text-xs font-mono text-foreground">{stats.hp}/{stats.maxHp}</span>
              </div>
              <div className="bg-card border border-border rounded-md p-2 text-center">
                <Sword className="w-3 h-3 text-primary mx-auto" />
                <span className="text-xs text-muted-foreground block">ATK</span>
                <span className="text-sm font-bold text-foreground">{stats.attack}</span>
              </div>
              <div className="bg-card border border-border rounded-md p-2 text-center">
                <Shield className="w-3 h-3 text-accent mx-auto" />
                <span className="text-xs text-muted-foreground block">DEF</span>
                <span className="text-sm font-bold text-foreground">{stats.defense}</span>
              </div>
              <div className="bg-card border border-border rounded-md p-2 text-center">
                <span className="text-sm">🪙</span>
                <span className="text-xs text-muted-foreground block">Gold</span>
                <span className="text-sm font-bold text-foreground">{stats.gold}</span>
              </div>
              <div className="bg-card border border-border rounded-md p-2 text-center">
                <Sparkles className="w-3 h-3 text-primary mx-auto" />
                <span className="text-xs text-muted-foreground block">Lv.{stats.level}</span>
                <span className="text-xs font-mono text-foreground">{stats.xp}/{stats.level * 50}</span>
              </div>
            </div>

            <Card className="border-border">
              <CardContent className="p-4 max-h-[400px] overflow-y-auto space-y-2">
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded text-sm ${
                        msg.type === "narrator"
                          ? "bg-secondary/40 border-l-2 border-primary text-foreground"
                          : msg.type === "player"
                          ? "bg-primary/5 border-l-2 border-accent text-foreground ml-6"
                          : msg.type === "combat"
                          ? "bg-destructive/10 border-l-2 border-destructive text-foreground"
                          : "bg-muted/50 text-muted-foreground text-center text-xs italic"
                      }`}
                    >
                      {msg.text}
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </CardContent>
            </Card>

            {choices.length > 0 && !processing && phase === "playing" && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {choices.map((choice, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="justify-start text-left h-auto py-2.5 px-3 text-sm hover:border-primary/40"
                      onClick={() => processChoice(choice)}
                    >
                      <span className="font-mono text-primary mr-2 text-xs">{i + 1}.</span>
                      {choice}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a custom action..."
                    value={customAction}
                    onChange={(e) => setCustomAction(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCustomAction()}
                    className="text-sm"
                  />
                  <Button onClick={handleCustomAction} className="bg-primary text-primary-foreground" disabled={!customAction.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {processing && (
              <div className="text-center py-3">
                <div className="animate-pulse text-primary text-sm font-mono">Processing...</div>
              </div>
            )}

            {phase === "gameover" && (
              <div className="text-center">
                <Button onClick={startGame} className="bg-primary text-primary-foreground">
                  <Skull className="w-4 h-4 mr-2" /> Try Again
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
    </AppLayout>
  );
};

export default GameMaster;

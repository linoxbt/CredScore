import { useState, useEffect, useCallback } from "react";
import { Brain, Play, Trophy, Clock, CheckCircle2, XCircle, RotateCcw, Zap, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { useWallet } from "@/contexts/WalletContext";
import { supabase } from "@/integrations/supabase/client";
import WalletModal from "@/components/WalletModal";

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  source: string;
  category: string;
  explanation?: string;
}

type GameState = "menu" | "loading" | "playing" | "results";

const CATEGORIES = ["all", "GenLayer", "Blockchain", "Crypto", "Science", "History", "Geography", "Technology", "Sports", "Music"];

const TriviaGame = () => {
  const [gameState, setGameState] = useState<GameState>("menu");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(20);
  const [answers, setAnswers] = useState<{ question: Question; selected: number | null; correct: boolean }[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [questionCount, setQuestionCount] = useState(5);
  const [verifying, setVerifying] = useState(false);
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiSource, setAiSource] = useState("");
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const { toast } = useToast();
  const { isConnected, reward } = useWallet();

  const startGame = async () => {
    if (!isConnected) {
      setWalletModalOpen(true);
      toast({ title: "Wallet required", description: "Connect your wallet to play and earn GEN rewards.", variant: "destructive" });
      return;
    }

    setGameState("loading");

    try {
      const { data, error } = await supabase.functions.invoke("ai-trivia-generate", {
        body: { category: selectedCategory, count: questionCount },
      });

      if (error || data?.error) throw new Error(data?.error || error?.message);
      if (!data.questions?.length) throw new Error("No questions generated");

      setQuestions(data.questions);
      setCurrentIndex(0);
      setScore(0);
      setAnswers([]);
      setStreak(0);
      setBestStreak(0);
      setSelectedAnswer(null);
      setAnswered(false);
      setTimer(20);
      setAiExplanation("");
      setAiSource("");
      setGameState("playing");
    } catch (e) {
      toast({ title: "Failed to generate questions", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
      setGameState("menu");
    }
  };

  const selectAnswer = async (index: number) => {
    if (answered) return;
    setSelectedAnswer(index);
    setAnswered(true);
    setVerifying(true);
    setAiExplanation("");
    setAiSource("");

    const q = questions[currentIndex];

    try {
      const { data, error } = await supabase.functions.invoke("ai-trivia-verify", {
        body: { question: q.question, selectedAnswer: q.options[index], allOptions: q.options },
      });

      if (error || data?.error) throw new Error(data?.error || error?.message);

      const aiCorrectIndex = data.correctIndex;
      const correct = index === aiCorrectIndex;

      setAiExplanation(data.explanation || q.explanation || "");
      setAiSource(data.source || q.source);

      questions[currentIndex] = { ...q, correctIndex: aiCorrectIndex };

      if (correct) {
        const points = 100 + timer * 10;
        setScore((s) => s + points);
        setStreak((s) => { const next = s + 1; setBestStreak((b) => Math.max(b, next)); return next; });
      } else {
        setStreak(0);
      }

      setAnswers((prev) => [...prev, { question: { ...q, correctIndex: aiCorrectIndex }, selected: index, correct }]);
    } catch {
      const correct = index === q.correctIndex;
      if (correct) {
        setScore((s) => s + (100 + timer * 10));
        setStreak((s) => { const next = s + 1; setBestStreak((b) => Math.max(b, next)); return next; });
      } else {
        setStreak(0);
      }
      setAiExplanation(q.explanation || "");
      setAiSource(q.source);
      setAnswers((prev) => [...prev, { question: q, selected: index, correct }]);
      toast({ title: "AI verification unavailable", description: "Using generated answer key.", variant: "destructive" });
    }

    setVerifying(false);
  };

  const timeUp = useCallback(() => {
    if (!answered) {
      setAnswered(true);
      setStreak(0);
      setAnswers((prev) => [...prev, { question: questions[currentIndex], selected: null, correct: false }]);
    }
  }, [answered, currentIndex, questions]);

  const nextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      const correctCount = answers.filter((a) => a.correct).length;
      if (correctCount > 0) {
        reward(correctCount * 0.01, `Trivia: ${correctCount}/${answers.length} correct`);
      }
      setGameState("results");
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setAnswered(false);
      setTimer(20);
      setAiExplanation("");
      setAiSource("");
    }
  };

  useEffect(() => {
    if (gameState !== "playing" || answered) return;
    if (timer <= 0) { timeUp(); return; }
    const t = setTimeout(() => setTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, gameState, answered, timeUp]);

  const currentQ = questions[currentIndex];

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Trivia Games
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Every question is AI-generated live. Answers verified in real-time. Earn GEN for correct answers.</p>
        </div>

        {!isConnected && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-primary" />
                <p className="text-sm text-foreground">Connect your wallet to play trivia and earn GEN rewards.</p>
              </div>
              <Button size="sm" onClick={() => setWalletModalOpen(true)} className="bg-primary text-primary-foreground text-xs">
                <Wallet className="w-3 h-3 mr-1" /> Connect
              </Button>
            </CardContent>
          </Card>
        )}

        {gameState === "menu" && (
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">Game Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat)}
                      className={selectedCategory === cat ? "bg-primary text-primary-foreground" : ""}>
                      {cat === "all" ? "All Categories" : cat}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Number of Questions</label>
                <div className="flex gap-2">
                  {[5, 8, 10, 15].map((n) => (
                    <Button key={n} variant={questionCount === n ? "default" : "outline"} size="sm" onClick={() => setQuestionCount(n)}
                      className={questionCount === n ? "bg-primary text-primary-foreground" : ""}>{n}</Button>
                  ))}
                </div>
              </div>
              <Button onClick={startGame} className="bg-primary text-primary-foreground w-full">
                <Play className="w-4 h-4 mr-2" /> {isConnected ? "Generate & Start" : "Connect Wallet to Play"}
              </Button>
            </CardContent>
          </Card>
        )}

        {gameState === "loading" && (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground font-mono">AI is generating {questionCount} unique questions...</p>
              <p className="text-xs text-muted-foreground">Questions are sourced from verified facts</p>
            </CardContent>
          </Card>
        )}

        {gameState === "playing" && currentQ && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className="bg-secondary text-secondary-foreground font-mono">{currentIndex + 1}/{questions.length}</Badge>
                <Badge variant="outline" className="text-xs font-mono">{currentQ.category}</Badge>
                {streak > 1 && <Badge className="bg-primary/20 text-primary"><Zap className="w-3 h-3 mr-1" />{streak}x streak</Badge>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-foreground font-mono">{score} pts</span>
                <span className={`font-mono text-sm font-bold ${timer <= 5 ? "text-destructive animate-pulse" : "text-foreground"}`}>
                  <Clock className="w-3 h-3 inline mr-1" />{timer}s
                </span>
              </div>
            </div>

            <Progress value={((currentIndex) / questions.length) * 100} className="h-1" />

            <Card className="border-border">
              <CardContent className="pt-6">
                <h2 className="text-xl font-bold text-foreground mb-5">{currentQ.question}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {currentQ.options.map((option, i) => {
                    const isSelected = selectedAnswer === i;
                    const isCorrect = i === currentQ.correctIndex;
                    let cls = "p-3 rounded border text-left text-sm transition-all cursor-pointer ";
                    if (answered) {
                      if (isCorrect) cls += "border-primary bg-primary/10 text-primary";
                      else if (isSelected && !isCorrect) cls += "border-destructive bg-destructive/10 text-destructive";
                      else cls += "border-border text-muted-foreground opacity-40";
                    } else {
                      cls += "border-border hover:border-primary/40 text-foreground";
                    }
                    return (
                      <motion.button key={i} whileHover={!answered ? { scale: 1.01 } : {}} onClick={() => selectAnswer(i)} disabled={answered} className={cls}>
                        <span className="font-mono text-xs text-muted-foreground mr-2">{String.fromCharCode(65 + i)}</span>
                        {option}
                        {answered && isCorrect && <CheckCircle2 className="w-3 h-3 inline ml-1" />}
                        {answered && isSelected && !isCorrect && <XCircle className="w-3 h-3 inline ml-1" />}
                      </motion.button>
                    );
                  })}
                </div>

                {verifying && (
                  <div className="mt-3 bg-primary/5 rounded p-2 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 text-primary animate-spin" />
                    <span className="text-xs text-primary font-mono">AI verifying answer from trusted sources...</span>
                  </div>
                )}

                {answered && !verifying && (
                  <div className="mt-3 space-y-2">
                    {aiExplanation && (
                      <div className="bg-secondary/40 rounded p-2 text-xs text-foreground">
                        <span className="font-semibold text-primary">AI Explanation: </span>{aiExplanation}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground font-mono">
                        Source: <span className="text-primary">{aiSource || currentQ.source}</span>
                      </p>
                      <Button size="sm" onClick={nextQuestion} className="bg-primary text-primary-foreground">
                        {currentIndex + 1 >= questions.length ? "View Results" : "Next →"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {gameState === "results" && (
          <div className="space-y-4">
            <Card className="text-center p-6 border-border">
              <Trophy className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-3xl font-bold text-foreground font-mono">{score} pts</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {answers.filter((a) => a.correct).length}/{answers.length} correct · Best Streak: {bestStreak}
              </p>
              {answers.filter((a) => a.correct).length > 0 && (
                <p className="text-primary text-sm mt-1 font-mono">
                  +{(answers.filter((a) => a.correct).length * 0.01).toFixed(2)} GEN earned
                </p>
              )}
              <div className="flex gap-2 justify-center mt-4">
                <Button onClick={startGame} className="bg-primary text-primary-foreground"><RotateCcw className="w-3 h-3 mr-1" />Play Again</Button>
                <Button variant="outline" onClick={() => setGameState("menu")}>Settings</Button>
              </div>
            </Card>

            <div className="space-y-1">
              {answers.map((a, i) => (
                <div key={i} className={`flex items-center justify-between p-2 rounded border text-sm ${a.correct ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {a.correct ? <CheckCircle2 className="w-3 h-3 text-primary shrink-0" /> : <XCircle className="w-3 h-3 text-destructive shrink-0" />}
                    <span className="text-foreground text-xs truncate">{a.question.question}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono ml-2 shrink-0">{a.question.options[a.question.correctIndex]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
    </AppLayout>
  );
};

export default TriviaGame;

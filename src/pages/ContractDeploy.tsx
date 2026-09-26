import { useState, useEffect } from "react";
import { Code2, Play, Loader2, CheckCircle2, Copy, Check, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { useWallet } from "@/contexts/WalletContext";
import { supabase } from "@/integrations/supabase/client";

const SAMPLE_CONTRACT = `# GenLayer Intelligent Contract
from genlayer import *

class HelloWorld(Contract):
    greeting: str

    def __init__(self, initial_greeting: str):
        self.greeting = initial_greeting

    @callable
    def get_greeting(self) -> str:
        return self.greeting

    @callable
    def set_greeting(self, new_greeting: str) -> None:
        self.greeting = new_greeting
`;

interface DeployedContract {
  id: string;
  contract_address: string | null;
  name: string;
  code: string;
  created_at: string;
  status: string;
  tx_hash: string | null;
  deployer_address: string;
}

const ContractDeploy = () => {
  const [code, setCode] = useState(SAMPLE_CONTRACT);
  const [contractName, setContractName] = useState("HelloWorld");
  const [constructorArgs, setConstructorArgs] = useState('["Hello GenLayer!"]');
  const [deploying, setDeploying] = useState(false);
  const [deployedContracts, setDeployedContracts] = useState<DeployedContract[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isConnected, client, address, addTransaction } = useWallet();

  const fetchContracts = async () => {
    const { data } = await supabase
      .from("deployed_contracts")
      .select("*")
      .order("created_at", { ascending: false });
    setDeployedContracts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchContracts(); }, []);

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(addr);
    setTimeout(() => setCopied(null), 2000);
  };

  const deployContract = async () => {
    if (!isConnected || !client) {
      toast({ title: "Connect wallet first", variant: "destructive" });
      return;
    }
    if (!code.trim()) return;

    setDeploying(true);

    // Insert pending record
    const { data: inserted, error: insertError } = await supabase.from("deployed_contracts").insert({
      deployer_address: address,
      name: contractName,
      code,
      status: "deploying",
    }).select().single();

    if (insertError || !inserted) {
      toast({ title: "Failed to save contract", variant: "destructive" });
      setDeploying(false);
      return;
    }

    try {
      let args: any[] = [];
      try { args = JSON.parse(constructorArgs); } catch { args = [constructorArgs]; }

      const result: any = await client.deployContract({ code, args });

      const contractAddr = result?.contractAddress || result?.result?.contractAddress || null;
      const txHash = result?.transactionHash || undefined;

      await supabase.from("deployed_contracts").update({
        contract_address: contractAddr ? String(contractAddr) : null,
        status: "deployed",
        tx_hash: txHash,
      }).eq("id", inserted.id);

      addTransaction({ type: "deploy", amount: 0, description: `Deployed ${contractName}`, hash: txHash });
      toast({ title: "Contract deployed!", description: contractAddr ? `Address: ${String(contractAddr).slice(0, 10)}...` : "Deployed successfully" });
    } catch (e) {
      console.error("Deploy failed:", e);
      await supabase.from("deployed_contracts").update({ status: "failed" }).eq("id", inserted.id);
      toast({ title: "Deployment failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    }

    setDeploying(false);
    fetchContracts();
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Code2 className="w-6 h-6 text-primary" />
            Deploy Intelligent Contract
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Write Python contracts and deploy them to GenLayer Studio Dev.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Contract Code</span>
                <Badge variant="outline" className="text-xs font-mono">Python</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Contract name" value={contractName} onChange={(e) => setContractName(e.target.value)} className="text-sm font-mono" />
              <Textarea value={code} onChange={(e) => setCode(e.target.value)} className="font-mono text-xs min-h-[350px] bg-background" spellCheck={false} />
              <Input placeholder='Constructor args (JSON array)' value={constructorArgs} onChange={(e) => setConstructorArgs(e.target.value)} className="text-sm font-mono" />
              <Button onClick={deployContract} disabled={deploying || !isConnected} className="w-full bg-primary text-primary-foreground">
                {deploying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deploying...</> : <><Play className="w-4 h-4 mr-2" /> Deploy to Studio Dev</>}
              </Button>
              {!isConnected && <p className="text-xs text-muted-foreground text-center">Connect your wallet to deploy</p>}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Deployed Contracts</h3>
            {loading ? (
              <div className="text-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" /></div>
            ) : deployedContracts.length === 0 ? (
              <Card className="border-border">
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Code2 className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No contracts deployed yet</p>
                </CardContent>
              </Card>
            ) : (
              deployedContracts.map((contract) => (
                <motion.div key={contract.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-border">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">{contract.name}</span>
                        <Badge variant="outline" className={
                          contract.status === "deployed" ? "text-primary" :
                          contract.status === "deploying" ? "text-accent" : "text-destructive"
                        }>
                          {contract.status === "deploying" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                          {contract.status === "deployed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {contract.status === "failed" && <XCircle className="w-3 h-3 mr-1" />}
                          {contract.status}
                        </Badge>
                      </div>
                      {contract.contract_address && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono text-muted-foreground truncate">{contract.contract_address}</span>
                          <button onClick={() => copyAddress(contract.contract_address!)}>
                            {copied === contract.contract_address ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />}
                          </button>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground font-mono">{contract.deployer_address.slice(0, 8)}...{contract.deployer_address.slice(-4)}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(contract.created_at).toLocaleString()}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ContractDeploy;

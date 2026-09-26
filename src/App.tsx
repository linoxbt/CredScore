import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { WalletProvider } from "@/contexts/WalletContext";
import CredScoreApp from "@/credscore/CredScoreApp";
import Index from "@/pages/Index";

export default function App() {
  return <WalletProvider><BrowserRouter><Routes>
    <Route path="/" element={<Index />} />
    <Route path="/dashboard" element={<CredScoreApp page="dashboard" />} />
    <Route path="/agents" element={<CredScoreApp page="agents" />} />
    <Route path="/agents/:address" element={<CredScoreApp page="agent" />} />
    <Route path="/ratings" element={<CredScoreApp page="ratings" />} />
    <Route path="/disputes" element={<CredScoreApp page="disputes" />} />
    <Route path="/docs" element={<CredScoreApp page="docs" />} />
    <Route path="/settings" element={<CredScoreApp page="settings" />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes></BrowserRouter></WalletProvider>;
}

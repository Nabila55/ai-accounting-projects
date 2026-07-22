import { useState } from "react";
import { BarChart3, AlertCircle, CheckCircle2, Info } from "lucide-react";
import UploadCard from "./components/UploadCard.jsx";
import SummaryCard from "./components/SummaryCard.jsx";
import AnomaliesList from "./components/AnomaliesList.jsx";
import VarianceChart from "./components/VarianceChart.jsx";
import ChatWidget from "./components/ChatWidget.jsx";
import TransactionsTable from "./components/TransactionsTable.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleAnalyze = async () => {
    if (!file) return;
    setStatus("processing");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_URL}/api/analyze`, { method: "POST", body: formData });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.detail || "Something went wrong during analysis.");
      }

      const data = await response.json();
      setResult(data);
      setStatus("done");
    } catch (err) {
      setErrorMessage(err.message);
      setStatus("error");
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setStatus("idle");
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-brand/10">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <BarChart3 className="w-4.5 h-4.5 text-white" strokeWidth={2} />
          </div>
          <span className="font-display font-semibold text-ink">AI General Ledger Analyzer</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 sm:py-16">
        <div className="text-center mb-10">
          <h1 className="font-display font-semibold text-3xl sm:text-4xl text-ink mb-3">
            Review your books like a controller would
          </h1>
          <p className="text-muted max-w-xl mx-auto">
            Upload a general ledger export. Get flagged anomalies, month-over-month
            variance, and a written summary — then ask follow-up questions.
          </p>
        </div>

        <UploadCard onFileSelected={setFile} selectedFile={file} disabled={status === "processing"} />

        {file && status === "idle" && (
          <div className="mt-5 flex justify-center">
            <button
              onClick={handleAnalyze}
              className="bg-brand hover:bg-brand-dark text-white font-display font-semibold rounded-xl px-8 py-3.5 text-base transition-colors shadow-sm"
            >
              Analyze ledger
            </button>
          </div>
        )}

        {status === "processing" && (
          <div className="mt-8 rounded-2xl bg-panel border border-brand/10 p-8 text-center">
            <p className="font-display font-semibold text-ink">Analyzing transactions…</p>
            <p className="text-sm text-muted mt-1">Checking for anomalies and building the variance table.</p>
          </div>
        )}

        {status === "error" && (
          <div className="mt-8 rounded-xl bg-red-50 border border-red-100 p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Couldn't complete analysis</p>
              <p className="text-sm text-red-600 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {status === "done" && result && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-5">
              <div className="inline-flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-full px-3 py-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Analysis complete — {result.transaction_count} transactions
              </div>
              <button onClick={reset} className="text-sm text-brand underline underline-offset-2 hover:text-brand-dark">
                Start over
              </button>
            </div>

            {result.mode === "demo" && (
              <div className="rounded-xl bg-panel border border-brand/15 p-4 flex items-start gap-3 mb-6">
                <Info className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <p className="text-sm text-ink">
                  <span className="font-semibold">Demo mode:</span> the summary and chat use
                  free template/pattern matching, not real AI reasoning. Add a funded Anthropic
                  API key to your backend's <code className="bg-white px-1 py-0.5 rounded border border-brand/10 text-xs">.env</code> to switch on full AI analysis.
                </p>
              </div>
            )}

            <SummaryCard summary={result.summary} mode={result.mode} />
            <VarianceChart varianceTable={result.variance_table} months={result.months} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="font-display font-semibold text-ink mb-3">
                  Flagged items ({result.anomalies.length})
                </p>
                <AnomaliesList anomalies={result.anomalies} />
              </div>
              <div>
                <p className="font-display font-semibold text-ink mb-3">Ask about this data</p>
                <ChatWidget />
              </div>
            </div>

            <TransactionsTable transactions={result.transactions} />
          </div>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-10 text-center text-xs text-muted">
        Built for accountants who'd rather review a summary than every line, by hand.
      </footer>
    </div>
  );
}

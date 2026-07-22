import { useState } from "react";
import { Scale, AlertCircle, CheckCircle2 } from "lucide-react";
import DualUpload from "./components/DualUpload.jsx";
import SummaryCards from "./components/SummaryCards.jsx";
import ResultsSections from "./components/ResultsSections.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  const [bankFile, setBankFile] = useState(null);
  const [glFile, setGlFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | processing | done | error
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleReconcile = async () => {
    if (!bankFile || !glFile) return;
    setStatus("processing");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("bank_statement", bankFile);
      formData.append("general_ledger", glFile);

      const response = await fetch(`${API_URL}/api/reconcile`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.detail || "Something went wrong during reconciliation.");
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
    setBankFile(null);
    setGlFile(null);
    setResult(null);
    setStatus("idle");
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-brand/10">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <Scale className="w-4.5 h-4.5 text-white" strokeWidth={2} />
          </div>
          <span className="font-display font-semibold text-ink">
            Bank Reconciliation & Month-End Close Assistant
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
        <div className="text-center mb-10">
          <h1 className="font-display font-semibold text-3xl sm:text-4xl text-ink mb-3">
            Match your books to your bank, automatically
          </h1>
          <p className="text-muted max-w-xl mx-auto">
            Upload a bank statement and a general ledger export. Every transaction
            is matched, flagged, or explained — ready for month-end close.
          </p>
        </div>

        <DualUpload
          bankFile={bankFile}
          glFile={glFile}
          onBankSelected={setBankFile}
          onGlSelected={setGlFile}
          disabled={status === "processing"}
        />

        {bankFile && glFile && status === "idle" && (
          <div className="mt-5 flex justify-center">
            <button
              onClick={handleReconcile}
              className="bg-brand hover:bg-brand-dark text-white font-display font-semibold rounded-xl px-8 py-3.5 text-base transition-colors shadow-sm"
            >
              Run reconciliation
            </button>
          </div>
        )}

        {status === "processing" && (
          <div className="mt-8 rounded-2xl bg-panel border border-brand/10 p-8 text-center">
            <p className="font-display font-semibold text-ink">Matching transactions…</p>
            <p className="text-sm text-muted mt-1">Comparing dates, amounts, and descriptions.</p>
          </div>
        )}

        {status === "error" && (
          <div className="mt-8 rounded-xl bg-red-50 border border-red-100 p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Couldn't complete reconciliation</p>
              <p className="text-sm text-red-600 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {status === "done" && result && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-5">
              <div className="inline-flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-full px-3 py-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Reconciliation complete
              </div>
              <button onClick={reset} className="text-sm text-brand underline underline-offset-2 hover:text-brand-dark">
                Start over
              </button>
            </div>
            <SummaryCards summary={result.summary} />
            <div className="mt-6">
              <ResultsSections result={result} />
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-4xl mx-auto px-6 py-10 text-center text-xs text-muted">
        Built for accounting professionals who'd rather not reconcile line by line, by hand.
      </footer>
    </div>
  );
}

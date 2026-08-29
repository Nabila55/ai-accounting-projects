import { useState } from "react";
import { CheckCircle2, LayoutGrid, AlertCircle, Sparkles } from "lucide-react";
import UploadCard from "./components/UploadCard.jsx";
import ProgressIndicator from "./components/ProgressIndicator.jsx";
import ResultsTable from "./components/ResultsTable.jsx";
import SummaryCards from "./components/SummaryCards.jsx";
import SpendingChart from "./components/SpendingChart.jsx";
import Toast from "./components/Toast.jsx";

// In development this points at your local FastAPI server.
// In production, set VITE_API_URL to your real AWS API endpoint
// (create a .env file — see README for details).
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Rough estimate of row count from the raw file, purely for the
// progress animation — the real count comes back from the server.
function estimateRowCount(text) {
  return Math.max(text.trim().split("\n").length - 1, 1);
}

export default function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | processing | done | error
  const [estimatedRows, setEstimatedRows] = useState(0);
  const [results, setResults] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  const handleFileSelected = async (selectedFile) => {
    setFile(selectedFile);
    setStatus("idle");
    setResults([]);
    const text = await selectedFile.text();
    setEstimatedRows(estimateRowCount(text));
  };

  const handleCategorize = async () => {
    if (!file) return;
    setStatus("processing");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/api/categorize`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.detail || "Something went wrong while categorizing.");
      }

      const data = await response.json();
      setResults(data.transactions);
      setStatus("done");
      setShowToast(true);
    } catch (err) {
      setErrorMessage(err.message);
      setStatus("error");
    }
  };

  const reset = () => {
    setFile(null);
    setResults([]);
    setStatus("idle");
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-brand/10">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <LayoutGrid className="w-4.5 h-4.5 text-white" strokeWidth={2} />
          </div>
          <span className="font-display font-semibold text-ink">
            AI Expense Categorization Tool
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="font-display font-semibold text-3xl sm:text-4xl text-ink mb-3">
            Turn a spreadsheet into a categorized ledger
          </h1>
          <p className="text-muted max-w-xl mx-auto">
            Upload a CSV of expenses. The AI reads every row and sorts it into
            a bookkeeping category — no manual tagging, no spreadsheet formulas.
          </p>
        </div>

        {/* Upload */}
        <UploadCard
          onFileSelected={handleFileSelected}
          selectedFile={file}
          disabled={status === "processing"}
        />

        {file && status === "idle" && (
          <div className="mt-5 flex justify-center">
            <button
              onClick={handleCategorize}
              className="bg-brand hover:bg-brand-dark text-white font-display font-semibold rounded-xl px-8 py-3.5 text-base transition-colors shadow-sm"
            >
              Categorize expenses
            </button>
          </div>
        )}

        {/* Progress */}
        {status === "processing" && (
          <div className="mt-8">
            <ProgressIndicator totalRows={estimatedRows} isDone={false} />
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="mt-8 rounded-xl bg-red-50 border border-red-100 p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Couldn't categorize this file</p>
              <p className="text-sm text-red-600 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Results dashboard */}
        {status === "done" && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-5">
              <div className="inline-flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-full px-3 py-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Categorization complete
              </div>
              <button
                onClick={reset}
                className="text-sm text-brand underline underline-offset-2 hover:text-brand-dark"
              >
                Start over
              </button>
            </div>

            <SummaryCards transactions={results} />
            <SpendingChart transactions={results} />
            <ResultsTable transactions={results} />
          </div>
        )}
      </main>

      <footer className="max-w-4xl mx-auto px-6 py-10 text-center">
        <p className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Sparkles className="w-3.5 h-3.5 text-brand" />
          Categorized with Claude AI
        </p>
        <p className="text-xs text-muted mt-1">
          Built for small businesses, freelancers, and agencies who'd rather not
          tag expenses by hand.
        </p>
      </footer>

      {showToast && (
        <Toast
          message={`${results.length} expenses categorized successfully.`}
          onDismiss={() => setShowToast(false)}
        />
      )}
    </div>
  );
}

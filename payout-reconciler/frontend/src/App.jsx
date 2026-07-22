import { useState } from "react";
import { Layers, AlertCircle, CheckCircle2 } from "lucide-react";
import DualUpload from "./components/DualUpload.jsx";
import { SummaryCard, FeeRateChart } from "./components/SummaryAndChart.jsx";
import PayoutsTable from "./components/PayoutsTable.jsx";
import { AnomaliesList, UnpaidOrdersList } from "./components/AnomaliesAndUnpaid.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  const [ordersFile, setOrdersFile] = useState(null);
  const [payoutsFile, setPayoutsFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleReconcile = async () => {
    if (!ordersFile || !payoutsFile) return;
    setStatus("processing");
    setErrorMessage("");
    try {
      const formData = new FormData();
      formData.append("orders_file", ordersFile);
      formData.append("payouts_file", payoutsFile);
      const response = await fetch(`${API_URL}/api/reconcile`, { method: "POST", body: formData });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.detail || "Something went wrong.");
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
    setOrdersFile(null);
    setPayoutsFile(null);
    setResult(null);
    setStatus("idle");
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-brand/10">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <Layers className="w-4.5 h-4.5 text-white" strokeWidth={2} />
          </div>
          <span className="font-display font-semibold text-ink">Multi-Channel Payout Reconciler</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 sm:py-16">
        <div className="text-center mb-10">
          <h1 className="font-display font-semibold text-3xl sm:text-4xl text-ink mb-3">
            Know exactly why your payout doesn't match your sales
          </h1>
          <p className="text-muted max-w-xl mx-auto">
            Upload your orders and your payout export. Every payout gets matched back
            to its orders, with fees checked against what each channel should actually charge.
          </p>
        </div>

        <DualUpload
          ordersFile={ordersFile} payoutsFile={payoutsFile}
          onOrdersSelected={setOrdersFile} onPayoutsSelected={setPayoutsFile}
          disabled={status === "processing"}
        />

        {ordersFile && payoutsFile && status === "idle" && (
          <div className="mt-5 flex justify-center">
            <button onClick={handleReconcile}
              className="bg-brand hover:bg-brand-dark text-white font-display font-semibold rounded-xl px-8 py-3.5 text-base transition-colors shadow-sm">
              Reconcile payouts
            </button>
          </div>
        )}

        {status === "processing" && (
          <div className="mt-8 rounded-2xl bg-panel border border-brand/10 p-8 text-center">
            <p className="font-display font-semibold text-ink">Matching orders to payouts…</p>
            <p className="text-sm text-muted mt-1">Checking fee structures per channel.</p>
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

            <SummaryCard summary={result.summary} mode={result.mode} />
            <FeeRateChart payouts={result.payouts} />

            <p className="font-display font-semibold text-ink mb-3">Payouts</p>
            <PayoutsTable payouts={result.payouts} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="font-display font-semibold text-ink mb-3">
                  Flagged items ({result.anomalies.length})
                </p>
                <AnomaliesList anomalies={result.anomalies} />
              </div>
              <div>
                <p className="font-display font-semibold text-ink mb-3">
                  Orders not yet paid out ({result.unpaid_orders.length})
                </p>
                <UnpaidOrdersList unpaidOrders={result.unpaid_orders} />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-10 text-center text-xs text-muted">
        Built for e-commerce sellers who'd rather not guess why the deposit looks short.
      </footer>
    </div>
  );
}

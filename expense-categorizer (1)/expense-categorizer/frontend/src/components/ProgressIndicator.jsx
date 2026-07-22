import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * ProgressIndicator
 * The "signature" visual moment of the app: while the backend is busy
 * calling the AI model, we animate a ledger/receipt-tape effect —
 * rows appear to print one at a time, echoing the accounting theme
 * instead of a generic spinner.
 *
 * NOTE: the AI call itself happens as one batched request per 25 rows
 * on the backend, so we don't get true per-row progress from the server.
 * We simulate a steady climb toward ~90% and then snap to 100% the
 * instant the real response comes back — a common, honest pattern for
 * indeterminate operations that still feels alive rather than frozen.
 */
export default function ProgressIndicator({ totalRows, isDone }) {
  const [progress, setProgress] = useState(4);

  useEffect(() => {
    if (isDone) {
      setProgress(100);
      return;
    }
    const interval = setInterval(() => {
      setProgress((p) => (p < 90 ? p + Math.max(1, (90 - p) * 0.08) : p));
    }, 180);
    return () => clearInterval(interval);
  }, [isDone]);

  const rowsShown = Math.round((progress / 100) * totalRows);

  return (
    <div className="rounded-2xl bg-panel border border-brand/10 p-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-brand" />
        <p className="font-display font-semibold text-ink">
          AI is categorizing your expenses…
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-brand/10">
        <div
          className="h-full bg-brand transition-all duration-200 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-sm text-muted mt-2 font-mono">
        {rowsShown} / {totalRows} transactions processed
      </p>

      {/* Receipt-tape effect: a scrolling strip of faint row markers "printing" */}
      <div className="mt-6 h-24 overflow-hidden relative rounded-lg bg-white border border-dashed border-brand/20">
        <div className="absolute inset-0 flex flex-col justify-end gap-1 p-2">
          {Array.from({ length: Math.min(rowsShown, 6) }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs font-mono text-brand/70 animate-[fadeIn_0.3s_ease-out]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand/50" />
              row {rowsShown - (Math.min(rowsShown, 6) - 1 - i)} categorized
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

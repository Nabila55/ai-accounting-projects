import { Scale, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export default function SummaryCards({ summary }) {
  const matchRate = summary.bank_count > 0
    ? Math.round((summary.matched_count / summary.bank_count) * 100)
    : 0;

  const cards = [
    {
      label: "Difference",
      value: summary.difference.toLocaleString(undefined, { style: "currency", currency: "USD" }),
      icon: Scale,
      tone: Math.abs(summary.difference) < 0.01 ? "text-emerald-600" : "text-ink",
    },
    { label: "Matched", value: summary.matched_count, icon: CheckCircle2, tone: "text-emerald-600" },
    { label: "Mismatches", value: summary.mismatch_count, icon: AlertTriangle, tone: "text-amber-600" },
    { label: "Unmatched", value: summary.unmatched_bank_count + summary.unmatched_gl_count, icon: XCircle, tone: "text-red-600" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-xl border border-brand/10 bg-white p-4 flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg bg-panel flex items-center justify-center">
              <Icon className={`w-4 h-4 ${tone}`} />
            </div>
            <p className="text-xs text-muted">{label}</p>
            <p className={`font-display font-semibold text-lg truncate ${tone}`}>{value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted font-mono">
        {matchRate}% of bank transactions matched cleanly to the general ledger
      </p>
    </div>
  );
}

import { AlertTriangle, AlertCircle } from "lucide-react";

const TYPE_ORDER = ["Statistical outlier", "Possible duplicate", "Round-number entry", "Weekend posting"];

export default function AnomaliesList({ anomalies }) {
  if (anomalies.length === 0) {
    return (
      <div className="rounded-xl border border-brand/10 bg-white p-6 text-center text-muted text-sm">
        No anomalies flagged in this period.
      </div>
    );
  }

  const sorted = [...anomalies].sort(
    (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
  );

  return (
    <div className="rounded-xl border border-brand/10 bg-white overflow-hidden">
      {sorted.map((a, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 px-4 py-3 ${i !== sorted.length - 1 ? "border-b border-brand/5" : ""}`}
        >
          {a.severity === "high" ? (
            <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
          )}
          <div>
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${
                a.severity === "high" ? "text-red-600" : "text-amber-600"
              }`}
            >
              {a.type}
            </span>
            <p className="text-sm text-ink mt-0.5">{a.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

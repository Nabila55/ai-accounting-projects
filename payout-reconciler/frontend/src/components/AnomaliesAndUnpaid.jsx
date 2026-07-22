import { AlertCircle, AlertTriangle, Clock } from "lucide-react";

export function AnomaliesList({ anomalies }) {
  if (anomalies.length === 0) {
    return (
      <div className="rounded-xl border border-brand/10 bg-white p-6 text-center text-muted text-sm">
        No anomalies flagged.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-brand/10 bg-white overflow-hidden">
      {anomalies.map((a, i) => (
        <div key={i} className={`flex items-start gap-3 px-4 py-3 ${i !== anomalies.length - 1 ? "border-b border-brand/5" : ""}`}>
          {a.severity === "high" ? (
            <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
          )}
          <div>
            <span className={`text-xs font-semibold uppercase tracking-wide ${a.severity === "high" ? "text-red-600" : "text-amber-600"}`}>
              {a.type}
            </span>
            <p className="text-sm text-ink mt-0.5">{a.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function UnpaidOrdersList({ unpaidOrders }) {
  if (unpaidOrders.length === 0) {
    return (
      <div className="rounded-xl border border-brand/10 bg-white p-6 text-center text-muted text-sm">
        All orders have been paid out.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-brand/10 bg-white overflow-hidden">
      {unpaidOrders.map((o, i) => (
        <div key={i} className={`flex items-center justify-between px-4 py-3 ${i !== unpaidOrders.length - 1 ? "border-b border-brand/5" : ""}`}>
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${o.overdue ? "text-red-500" : "text-muted"}`} />
            <div>
              <p className="text-sm text-ink">{o.order_id} · {o.channel}</p>
              <p className="text-xs text-muted">
                {o.days_pending} day(s) pending {o.overdue && <span className="text-red-600 font-semibold">· OVERDUE</span>}
              </p>
            </div>
          </div>
          <span className="font-mono text-sm text-ink">
            {o.gross.toLocaleString(undefined, { style: "currency", currency: "USD" })}
          </span>
        </div>
      ))}
    </div>
  );
}

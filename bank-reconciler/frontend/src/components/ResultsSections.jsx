import { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, Download } from "lucide-react";

function fmt(amount) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function Section({ title, count, icon: Icon, tone, bgTone, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-brand/10 overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 ${bgTone}`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4.5 h-4.5 ${tone}`} />
          <span className="font-display font-semibold text-ink">{title}</span>
          <span className="text-xs bg-white/70 rounded-full px-2 py-0.5 text-ink font-mono">{count}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
}

export default function ResultsSections({ result }) {
  const { matched, mismatches, unmatched_bank, unmatched_gl } = result;

  const handleDownload = () => {
    const rows = [["Status", "Bank Date", "Bank Description", "Bank Amount", "GL Date", "GL Description", "GL Amount"]];
    matched.forEach((m) => rows.push(["Matched", m.bank.date, m.bank.description, m.bank.amount, m.gl.date, m.gl.description, m.gl.amount]));
    mismatches.forEach((m) => rows.push(["Amount Mismatch", m.bank.date, m.bank.description, m.bank.amount, m.gl.date, m.gl.description, m.gl.amount]));
    unmatched_bank.forEach((t) => rows.push(["Unmatched (Bank only)", t.date, t.description, t.amount, "", "", ""]));
    unmatched_gl.forEach((t) => rows.push(["Unmatched (GL only)", "", "", "", t.date, t.description, t.amount]));

    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reconciliation_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download reconciliation report
        </button>
      </div>

      {mismatches.length > 0 && (
        <Section title="Amount Mismatches — needs review" count={mismatches.length}
          icon={AlertTriangle} tone="text-amber-600" bgTone="bg-amber-50" defaultOpen>
          {mismatches.map((m, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-brand/5 py-3 last:border-0 gap-1">
              <div className="text-sm">
                <p className="text-ink">{m.bank.description}</p>
                <p className="text-xs text-muted font-mono">Bank: {m.bank.date} · {fmt(m.bank.amount)}  —  GL: {m.gl.date} · {fmt(m.gl.amount)}</p>
              </div>
              <span className="text-sm font-mono font-semibold text-amber-700 whitespace-nowrap">
                Δ {fmt(m.difference)}
              </span>
            </div>
          ))}
        </Section>
      )}

      {(unmatched_bank.length > 0 || unmatched_gl.length > 0) && (
        <Section title="Unmatched" count={unmatched_bank.length + unmatched_gl.length}
          icon={XCircle} tone="text-red-600" bgTone="bg-red-50" defaultOpen>
          {unmatched_bank.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted uppercase mb-2 mt-1">In bank statement, not in GL</p>
              {unmatched_bank.map((t, i) => (
                <div key={i} className="flex justify-between text-sm border-b border-brand/5 py-2 last:border-0">
                  <span className="text-ink">{t.description}</span>
                  <span className="font-mono text-muted">{t.date} · {fmt(t.amount)}</span>
                </div>
              ))}
            </>
          )}
          {unmatched_gl.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted uppercase mb-2 mt-4">In general ledger, not in bank statement</p>
              {unmatched_gl.map((t, i) => (
                <div key={i} className="flex justify-between text-sm border-b border-brand/5 py-2 last:border-0">
                  <span className="text-ink">{t.description}</span>
                  <span className="font-mono text-muted">{t.date} · {fmt(t.amount)}</span>
                </div>
              ))}
            </>
          )}
        </Section>
      )}

      <Section title="Cleanly Matched" count={matched.length}
        icon={CheckCircle2} tone="text-emerald-600" bgTone="bg-emerald-50">
        {matched.map((m, i) => (
          <div key={i} className="flex justify-between text-sm border-b border-brand/5 py-2 last:border-0">
            <span className="text-ink">{m.bank.description}</span>
            <span className="font-mono text-muted">{m.bank.date} · {fmt(m.bank.amount)}</span>
          </div>
        ))}
      </Section>
    </div>
  );
}

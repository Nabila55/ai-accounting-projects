import { useMemo, useState } from "react";
import { Search, ChevronDown } from "lucide-react";

export default function TransactionsTable({ transactions }) {
  const [query, setQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState("All");
  const [open, setOpen] = useState(true);

  const accounts = useMemo(
    () => ["All", ...Array.from(new Set(transactions.map((t) => t.account))).sort()],
    [transactions]
  );

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesQuery = t.description.toLowerCase().includes(query.toLowerCase());
      const matchesAccount = accountFilter === "All" || t.account === accountFilter;
      return matchesQuery && matchesAccount;
    });
  }, [transactions, query, accountFilter]);

  return (
    <div className="rounded-xl border border-brand/10 overflow-hidden mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-panel"
      >
        <span className="font-display font-semibold text-ink">
          All Transactions <span className="text-xs bg-white/70 rounded-full px-2 py-0.5 ml-1 font-mono">{transactions.length}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="bg-white p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by description…"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-brand/15 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="rounded-lg border border-brand/15 text-sm px-3 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            >
              {accounts.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-brand/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-panel text-left text-muted font-medium">
                  <th className="px-4 py-2.5 font-display">Date</th>
                  <th className="px-4 py-2.5 font-display">Account</th>
                  <th className="px-4 py-2.5 font-display">Description</th>
                  <th className="px-4 py-2.5 font-display text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">No transactions match.</td></tr>
                )}
                {filtered.map((t, i) => (
                  <tr key={i} className={`border-t border-brand/5 ${i % 2 === 1 ? "bg-panel/40" : "bg-white"}`}>
                    <td className="px-4 py-2.5 text-muted font-mono whitespace-nowrap">{t.date}</td>
                    <td className="px-4 py-2.5 text-ink">{t.account}</td>
                    <td className="px-4 py-2.5 text-ink">{t.description}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-ink">
                      {Math.abs(t.amount).toLocaleString(undefined, { style: "currency", currency: "USD" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

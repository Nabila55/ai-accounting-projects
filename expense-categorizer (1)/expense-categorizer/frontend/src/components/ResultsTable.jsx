import { useMemo, useState } from "react";
import {
  Megaphone, TrendingUp, Package, Truck, MonitorSmartphone,
  Paperclip, Zap, Landmark, Receipt, Plane, Users, Building2,
  MoreHorizontal, Download, Search,
} from "lucide-react";

// Each category gets its own icon so the table is scannable at a glance
// without leaving the white/purple palette — differentiation comes from
// iconography, not a rainbow of unrelated colors.
const CATEGORY_ICONS = {
  Advertising: Megaphone,
  Marketing: TrendingUp,
  Inventory: Package,
  Shipping: Truck,
  Software: MonitorSmartphone,
  "Office Supplies": Paperclip,
  Utilities: Zap,
  "Bank Fees": Landmark,
  Taxes: Receipt,
  Travel: Plane,
  Salaries: Users,
  Rent: Building2,
  Other: MoreHorizontal,
};

function CategoryBadge({ category }) {
  const Icon = CATEGORY_ICONS[category] || MoreHorizontal;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-panel text-brand-dark px-3 py-1 text-xs font-medium">
      <Icon className="w-3.5 h-3.5" />
      {category}
    </span>
  );
}

function toCSV(rows) {
  const header = "Date,Description,Amount,AI Category";
  const lines = rows.map((r) =>
    [r.date, `"${r.description.replace(/"/g, '""')}"`, r.amount, r.category].join(",")
  );
  return [header, ...lines].join("\n");
}

export default function ResultsTable({ transactions }) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(transactions.map((t) => t.category))).sort()],
    [transactions]
  );

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesQuery = t.description.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = categoryFilter === "All" || t.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [transactions, query, categoryFilter]);

  const totalSpend = filtered.reduce((sum, t) => sum + t.amount, 0);

  const handleDownload = () => {
    // Downloads ALL categorized transactions, not just the filtered view —
    // filters are for browsing on-screen, not for scoping the export.
    const blob = new Blob([toCSV(transactions)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "categorized_expenses.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display font-semibold text-lg text-ink">
            {transactions.length} expenses categorized
          </h2>
          <p className="text-sm text-muted font-mono">
            Showing total: {totalSpend.toLocaleString(undefined, { style: "currency", currency: "USD" })}
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-medium rounded-lg px-4 py-2.5 transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Download categorized CSV
        </button>
      </div>

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
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-brand/15 text-sm px-3 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-panel text-left text-muted font-medium">
              <th className="px-4 py-3 font-display">Date</th>
              <th className="px-4 py-3 font-display">Description</th>
              <th className="px-4 py-3 font-display text-right">Amount</th>
              <th className="px-4 py-3 font-display">AI Category</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  No transactions match your search.
                </td>
              </tr>
            )}
            {filtered.map((t, i) => (
              <tr
                key={i}
                className={`border-t border-brand/5 ${i % 2 === 1 ? "bg-panel/40" : "bg-white"}`}
              >
                <td className="px-4 py-3 text-muted font-mono whitespace-nowrap">{t.date}</td>
                <td className="px-4 py-3 text-ink">{t.description}</td>
                <td
                  className={`px-4 py-3 text-right font-mono tabular-nums ${
                    t.amount < 0 ? "text-ink" : "text-emerald-600"
                  }`}
                >
                  {t.amount.toLocaleString(undefined, { style: "currency", currency: "USD" })}
                </td>
                <td className="px-4 py-3">
                  <CategoryBadge category={t.category} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

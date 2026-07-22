import { Wallet, Hash, Trophy, TrendingUp } from "lucide-react";

/**
 * SummaryCards
 * Gives the results screen an actual "dashboard" feel — a business owner
 * glancing at this for two seconds should immediately know their total
 * spend and where most of it went, before ever reading the table.
 */
export default function SummaryCards({ transactions }) {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const spendOnly = transactions.filter((t) => t.amount < 0);
  const totalSpend = Math.abs(spendOnly.reduce((sum, t) => sum + t.amount, 0));
  const average = spendOnly.length ? totalSpend / spendOnly.length : 0;

  const byCategory = {};
  for (const t of spendOnly) {
    byCategory[t.category] = (byCategory[t.category] || 0) + Math.abs(t.amount);
  }
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  const cards = [
    {
      label: "Total spend",
      value: totalSpend.toLocaleString(undefined, { style: "currency", currency: "USD" }),
      icon: Wallet,
    },
    {
      label: "Transactions",
      value: transactions.length,
      icon: Hash,
    },
    {
      label: "Top category",
      value: topCategory ? topCategory[0] : "—",
      icon: Trophy,
    },
    {
      label: "Avg. transaction",
      value: average.toLocaleString(undefined, { style: "currency", currency: "USD" }),
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {cards.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="rounded-xl border border-brand/10 bg-white p-4 flex flex-col gap-2"
        >
          <div className="w-8 h-8 rounded-lg bg-panel flex items-center justify-center">
            <Icon className="w-4 h-4 text-brand" />
          </div>
          <p className="text-xs text-muted">{label}</p>
          <p className="font-display font-semibold text-ink text-lg truncate">{value}</p>
        </div>
      ))}
    </div>
  );
}

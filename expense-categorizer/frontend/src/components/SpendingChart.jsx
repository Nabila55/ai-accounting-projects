import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

/**
 * SpendingChart
 * Visual breakdown of spend by category. Bars use a single purple hue at
 * varying opacity (not a rainbow) so the chart stays inside the white/
 * purple brief — the tallest bar draws the eye first, which is exactly
 * the point: "where did most of the money go?"
 */
export default function SpendingChart({ transactions }) {
  const spendOnly = transactions.filter((t) => t.amount < 0);
  const totals = {};
  for (const t of spendOnly) {
    totals[t.category] = (totals[t.category] || 0) + Math.abs(t.amount);
  }

  const data = Object.entries(totals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  if (data.length === 0) return null;

  const maxTotal = data[0].total;

  return (
    <div className="rounded-xl border border-brand/10 bg-white p-5 mb-6">
      <p className="font-display font-semibold text-ink mb-4">Spending by category</p>
      <ResponsiveContainer width="100%" height={Math.max(data.length * 34, 120)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="category"
            width={110}
            tick={{ fontSize: 12, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "#F5F3FF" }}
            formatter={(value) =>
              value.toLocaleString(undefined, { style: "currency", currency: "USD" })
            }
            contentStyle={{ borderRadius: 8, border: "1px solid #E9E3FB", fontSize: 13 }}
          />
          <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={18}>
            {data.map((entry, i) => (
              <Cell
                key={entry.category}
                fill="#6D28D9"
                fillOpacity={0.35 + 0.65 * (entry.total / maxTotal)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

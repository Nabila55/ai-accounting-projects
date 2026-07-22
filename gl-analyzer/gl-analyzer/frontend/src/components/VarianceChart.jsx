import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

// One bar series per month, grouped by account — lets you see at a glance
// which accounts grew, shrank, or stayed flat across the period.
export default function VarianceChart({ varianceTable, months }) {
  if (months.length === 0) return null;

  const data = varianceTable.map((row) => ({
    account: row.account,
    ...row.by_month,
  }));

  const monthColors = ["#C4B5FD", "#8B5CF6", "#6D28D9", "#5B21B6"];

  return (
    <div className="rounded-xl border border-brand/10 bg-white p-5 mb-6">
      <p className="font-display font-semibold text-ink mb-4">Spend by account, month over month</p>
      <ResponsiveContainer width="100%" height={Math.max(data.length * 48, 200)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0EBFC" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} />
          <YAxis type="category" dataKey="account" width={110} tick={{ fontSize: 12, fill: "#1E1B2E" }}
            axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value) => value.toLocaleString(undefined, { style: "currency", currency: "USD" })}
            contentStyle={{ borderRadius: 8, border: "1px solid #E9E3FB", fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {months.map((m, i) => (
            <Bar key={m} dataKey={m} name={m} fill={monthColors[i % monthColors.length]} radius={[0, 4, 4, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

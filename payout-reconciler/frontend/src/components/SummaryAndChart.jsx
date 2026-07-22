import { Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export function SummaryCard({ summary, mode }) {
  return (
    <div className="rounded-2xl bg-panel border border-brand/10 p-6 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4.5 h-4.5 text-brand" />
        <p className="font-display font-semibold text-ink">
          {mode === "ai" ? "Summary — AI-generated" : "Summary"}
        </p>
      </div>
      <p className="text-sm text-ink leading-relaxed">{summary}</p>
    </div>
  );
}

export function FeeRateChart({ payouts }) {
  const byChannel = {};
  for (const p of payouts) {
    if (!byChannel[p.channel]) byChannel[p.channel] = [];
    byChannel[p.channel].push(p.effective_fee_rate);
  }
  const data = Object.entries(byChannel).map(([channel, rates]) => ({
    channel,
    avgRate: Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) / 100,
  })).sort((a, b) => b.avgRate - a.avgRate);

  if (data.length === 0) return null;
  const maxRate = data[0].avgRate;

  return (
    <div className="rounded-xl border border-brand/10 bg-white p-5 mb-6">
      <p className="font-display font-semibold text-ink mb-4">Average effective fee rate by channel</p>
      <ResponsiveContainer width="100%" height={Math.max(data.length * 40, 140)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
          <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "#6B7280" }} />
          <YAxis type="category" dataKey="channel" width={80} tick={{ fontSize: 12, fill: "#1E1B2E" }}
            axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: 8, border: "1px solid #E9E3FB", fontSize: 13 }} />
          <Bar dataKey="avgRate" radius={[0, 6, 6, 0]} barSize={20}>
            {data.map((entry) => (
              <Cell key={entry.channel} fill="#6D28D9" fillOpacity={0.35 + 0.65 * (entry.avgRate / maxRate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

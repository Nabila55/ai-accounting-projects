function fmt(amount) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function PayoutsTable({ payouts }) {
  return (
    <div className="rounded-xl border border-brand/10 overflow-hidden mb-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-panel text-left text-muted font-medium">
              <th className="px-4 py-2.5 font-display">Payout</th>
              <th className="px-4 py-2.5 font-display">Channel</th>
              <th className="px-4 py-2.5 font-display">Date</th>
              <th className="px-4 py-2.5 font-display text-right">Gross</th>
              <th className="px-4 py-2.5 font-display text-right">Net</th>
              <th className="px-4 py-2.5 font-display text-right">Fee Variance</th>
              <th className="px-4 py-2.5 font-display text-right">Eff. Rate</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p, i) => {
              const flagged = Math.abs(p.fee_variance_pct) >= 15;
              return (
                <tr key={i} className={`border-t border-brand/5 ${i % 2 === 1 ? "bg-panel/40" : "bg-white"}`}>
                  <td className="px-4 py-2.5 font-mono text-ink whitespace-nowrap">{p.payout_id}</td>
                  <td className="px-4 py-2.5 text-ink">{p.channel}</td>
                  <td className="px-4 py-2.5 text-muted font-mono whitespace-nowrap">{p.date}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{fmt(p.expected_gross)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{fmt(p.net_amount)}</td>
                  <td className={`px-4 py-2.5 text-right font-mono font-semibold ${flagged ? "text-amber-600" : "text-emerald-600"}`}>
                    {p.fee_variance_pct > 0 ? "+" : ""}{p.fee_variance_pct}%
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted">{p.effective_fee_rate}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

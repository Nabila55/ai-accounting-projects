import { Sparkles } from "lucide-react";

export default function SummaryCard({ summary, mode }) {
  return (
    <div className="rounded-2xl bg-panel border border-brand/10 p-6 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4.5 h-4.5 text-brand" />
        <p className="font-display font-semibold text-ink">
          {mode === "demo" ? "Month-End Summary" : "Month-End Summary — AI-generated"}
        </p>
      </div>
      <p className="text-sm text-ink leading-relaxed">{summary}</p>
    </div>
  );
}

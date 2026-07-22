import { useState, useRef, useEffect } from "react";
import { Send, MessageCircle, Loader2 } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const SUGGESTIONS = [
  "What was the largest anomaly?",
  "Which account changed the most this month?",
  "What is the total spend?",
];

export default function ChatWidget() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Ask me anything about this general ledger — try one of the suggestions below, or type your own question." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendQuestion = async (question) => {
    if (!question.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();
      const answer = response.ok ? data.answer : (data.detail || "Something went wrong.");
      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Couldn't reach the server. Is the backend still running?" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-brand/10 bg-white flex flex-col h-[420px]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-brand/10 bg-panel rounded-t-xl">
        <MessageCircle className="w-4.5 h-4.5 text-brand" />
        <p className="font-display font-semibold text-ink text-sm">Ask about this data</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-xl px-3.5 py-2 text-sm ${
                m.role === "user" ? "bg-brand text-white" : "bg-panel text-ink"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-panel rounded-xl px-3.5 py-2 text-sm text-muted flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendQuestion(s)}
              className="text-xs bg-panel hover:bg-brand/10 text-brand-dark rounded-full px-3 py-1.5 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); sendQuestion(input); }}
        className="flex items-center gap-2 border-t border-brand/10 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 text-sm px-3 py-2 rounded-lg border border-brand/15 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-brand hover:bg-brand-dark disabled:opacity-50 text-white rounded-lg p-2.5 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

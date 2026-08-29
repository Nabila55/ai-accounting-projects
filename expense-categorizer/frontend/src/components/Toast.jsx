import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

/**
 * Toast
 * A small, auto-dismissing success notification — reads as more
 * "finished product" than a static banner that never goes away.
 * Still keeps a manual close button for accessibility (motion isn't
 * the only way to dismiss it).
 */
export default function Toast({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-[slideUp_0.25s_ease-out]">
      <div className="flex items-center gap-3 bg-ink text-white rounded-xl px-4 py-3.5 shadow-lg max-w-sm">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        <p className="text-sm">{message}</p>
        <button onClick={onDismiss} className="ml-2 text-white/50 hover:text-white shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

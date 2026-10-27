"use client";

import { useRef, useState, useEffect } from "react";

interface GuessInputProps {
  onGuess: (word: string) => Promise<void>;
  feedback?: "exact" | "hot" | "warm" | "cold" | null;
  similarity?: number;
  disabled?: boolean;
  lang?: string;
}

const FEEDBACK_CONFIG = {
  exact: {
    bg: "bg-green-900 border-green-400",
    text: "text-green-300",
    icon: "🎯",
    msg: { fr: "Exactement !", en: "Exact!" },
    glow: "shadow-green-500/50",
  },
  hot: {
    bg: "bg-orange-900 border-orange-400",
    text: "text-orange-300",
    icon: "🔥",
    msg: { fr: "Très proche !", en: "Very close!" },
    glow: "shadow-orange-500/50",
  },
  warm: {
    bg: "bg-yellow-900 border-yellow-500",
    text: "text-yellow-300",
    icon: "🌡️",
    msg: { fr: "Dans la bonne direction", en: "Getting warmer" },
    glow: "shadow-yellow-500/50",
  },
  cold: {
    bg: "bg-blue-950 border-blue-700",
    text: "text-blue-300",
    icon: "❄️",
    msg: { fr: "Pas du tout", en: "Not quite" },
    glow: "shadow-blue-500/30",
  },
};

export default function GuessInput({
  onGuess,
  feedback,
  similarity,
  disabled = false,
  lang = "fr",
}: GuessInputProps) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus auto
  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled, feedback]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || loading || disabled) return;

    setLoading(true);
    try {
      await onGuess(trimmed);
      setValue("");
    } catch {
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const cfg = feedback ? FEEDBACK_CONFIG[feedback] : null;

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-3">
      {/* Feedback banner */}
      {cfg && (
        <div
          className={`
            flex items-center gap-3 px-4 py-3 rounded-xl border-2
            ${cfg.bg} shadow-lg ${cfg.glow}
            animate-in slide-in-from-top-2 duration-300
          `}
        >
          <span className="text-2xl">{cfg.icon}</span>
          <div className="flex-1">
            <p className={`font-bold ${cfg.text}`}>
              {cfg.msg[lang as "fr" | "en"] || cfg.msg.en}
            </p>
            {similarity !== undefined && similarity > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="h-1.5 flex-1 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      feedback === "cold"
                        ? "bg-blue-500"
                        : feedback === "warm"
                        ? "bg-yellow-500"
                        : "bg-orange-500"
                    }`}
                    style={{ width: `${Math.round(similarity * 100)}%` }}
                  />
                </div>
                <span className={`text-xs font-mono ${cfg.text}`}>
                  {Math.round(similarity * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className={`flex gap-2 ${shake ? "animate-shake" : ""}`}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value.toLowerCase())}
          placeholder={
            lang === "fr" ? "Tape un mot..." : "Type a word..."
          }
          disabled={disabled || loading}
          maxLength={50}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={`
            flex-1 px-4 py-3 rounded-xl
            bg-gray-900 border-2 border-gray-600
            text-white text-lg font-semibold placeholder-gray-600
            focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-200
            uppercase tracking-wide
          `}
        />
        <button
          type="submit"
          disabled={disabled || loading || !value.trim()}
          className={`
            px-5 py-3 rounded-xl font-black text-lg
            bg-yellow-500 hover:bg-yellow-400 text-black
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-all duration-200 active:scale-95
            shadow-lg shadow-yellow-500/30
          `}
        >
          {loading ? "..." : "→"}
        </button>
      </form>

      {disabled && (
        <p className="text-center text-sm text-gray-500 italic">
          {lang === "fr" ? "Partie terminée" : "Game over"}
        </p>
      )}
    </div>
  );
}

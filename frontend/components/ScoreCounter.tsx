"use client";

import { useEffect, useState } from "react";

interface ScoreCounterProps {
  score: number;
  totalPossible?: number;
}

export default function ScoreCounter({
  score,
  totalPossible,
}: ScoreCounterProps) {
  const [displayScore, setDisplayScore] = useState(0);

  // Animation du compteur
  useEffect(() => {
    if (score === displayScore) return;
    const diff = score - displayScore;
    const step = Math.max(1, Math.floor(Math.abs(diff) / 20));
    const timer = setInterval(() => {
      setDisplayScore((prev) => {
        const next = prev + step;
        if (next >= score) {
          clearInterval(timer);
          return score;
        }
        return next;
      });
    }, 20);
    return () => clearInterval(timer);
  }, [score, displayScore]);

  const percentage = totalPossible ? Math.round((score / totalPossible) * 100) : 0;

  return (
    <div className="flex items-center gap-4 px-5 py-3 rounded-2xl bg-gray-900 border border-gray-700 shadow-md">
      {/* Score Principal */}
      <div className="flex flex-col items-center">
        <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Score</span>
        <span
          className={`text-3xl font-black tabular-nums transition-all duration-300 ${
            score > 0 ? "text-yellow-400" : "text-gray-600"
          }`}
        >
          {displayScore.toLocaleString()}
        </span>
        {totalPossible && (
          <span className="text-xs text-gray-500 font-mono">
            / {totalPossible.toLocaleString()} pts max
          </span>
        )}
      </div>

      {/* Barre de progression si totalPossible */}
      {totalPossible && (
        <>
          <div className="w-px h-10 bg-gray-800" />
          <div className="flex flex-col items-center gap-1.5 min-w-[70px]">
            <span className="text-[11px] text-gray-400 uppercase tracking-widest font-bold">
              {percentage}%
            </span>
            <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

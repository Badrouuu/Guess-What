"use client";

import { useEffect, useState } from "react";

interface TopSlot {
  rank: number;
  points: number;
  revealed: boolean;
  word?: string;
  similarity?: number;
  justRevealed?: boolean;
}

interface Top10BoardProps {
  slots: TopSlot[];
  isGameOver?: boolean;
}

export default function Top10Board({
  slots,
  isGameOver = false,
}: Top10BoardProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-3">
        <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-widest">
          🏆 Top 10 — Ma Famille en Or
        </h2>
        <p className="text-[11px] text-gray-400 mt-0.5">
          👑 <span className="text-yellow-300 font-semibold">#1 Cible Parfaite</span> (1000 pts) · <span className="text-orange-300 font-medium">#2–#10 Satellites proches</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {slots.map((slot) => (
          <FlipCard key={slot.rank} slot={slot} isGameOver={isGameOver} />
        ))}
      </div>

      {/* Score total révélé */}
      {isGameOver && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">Total possible</p>
          <p className="text-2xl font-black text-yellow-400">
            {slots.reduce((acc, s) => acc + s.points, 0).toLocaleString()} pts
          </p>
        </div>
      )}
    </div>
  );
}

function FlipCard({
  slot,
  isGameOver,
}: {
  slot: TopSlot;
  isGameOver: boolean;
}) {
  const [flipped, setFlipped] = useState(false);

  // Déclenche le flip quand revealed passe à true
  useEffect(() => {
    if (slot.revealed || isGameOver) {
      const delay = slot.justRevealed ? 0 : slot.rank * 80;
      const timer = setTimeout(() => setFlipped(true), delay);
      return () => clearTimeout(timer);
    }
  }, [slot.revealed, slot.rank, slot.justRevealed, isGameOver]);

  // Couleur selon le rang
  const rankColor =
    slot.rank === 1
      ? "from-yellow-500 to-yellow-700 border-yellow-400"
      : slot.rank <= 3
      ? "from-orange-600 to-orange-800 border-orange-400"
      : slot.rank <= 7
      ? "from-red-800 to-red-950 border-red-500"
      : "from-gray-700 to-gray-900 border-gray-500";

  // Points affichés
  const pointsColor =
    slot.rank === 1
      ? "text-yellow-200"
      : slot.rank <= 3
      ? "text-orange-200"
      : "text-gray-300";

  return (
    <div
      className="relative h-20"
      style={{ perspective: "600px" }}
    >
      <div
        className="absolute inset-0 transition-transform duration-700 ease-in-out"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Face cachée (dos de carte) */}
        <div
          className={`absolute inset-0 rounded-xl bg-gradient-to-br from-[#8B0000] to-[#3D0000]
                      border-2 ${slot.rank === 1 ? "border-yellow-500/80 shadow-yellow-500/20" : "border-red-800"} flex flex-col items-center justify-center
                      shadow-lg cursor-default relative overflow-hidden`}
          style={{ backfaceVisibility: "hidden" }}
        >
          {slot.rank === 1 && (
            <span className="absolute top-1 right-1.5 text-xs">👑</span>
          )}
          <span className="text-3xl font-black text-red-900 opacity-40">#</span>
          <span className="text-2xl font-black text-white">{slot.rank}</span>
          <span className={`text-xs font-bold ${slot.rank === 1 ? "text-yellow-400" : "text-red-400"}`}>
            {slot.points} pts
          </span>
        </div>

        {/* Face révélée (or) */}
        <div
          className={`absolute inset-0 rounded-xl bg-gradient-to-br ${rankColor}
                      border-2 flex flex-col items-center justify-center
                      shadow-xl relative overflow-hidden`}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {/* Éclat lumineux */}
          {slot.justRevealed && (
            <div className="absolute inset-0 rounded-xl bg-white opacity-0 animate-flash" />
          )}

          <span className="text-[10px] text-gray-300 uppercase tracking-widest flex items-center gap-1">
            {slot.rank === 1 ? "👑 CIBLE #1" : `SATELLITE #${slot.rank}`}
          </span>
          <span className="text-base font-black text-white uppercase tracking-wide text-center px-1 leading-tight">
            {slot.word || "???"}
          </span>
          <span className={`text-sm font-bold ${pointsColor}`}>
            {slot.points.toLocaleString()} pts
          </span>
          {slot.similarity !== undefined && (
            <span className="text-[10px] text-gray-300 opacity-70">
              sim: {(slot.similarity * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

export interface TopSlot {
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
  const [viewMode, setViewMode] = useState<"orbit" | "grid">("orbit");

  // Séparation Cible (#1) et Satellites (#2 à #10)
  const targetSlot = slots.find((s) => s.rank === 1) || {
    rank: 1,
    points: 1000,
    revealed: false,
  };
  const satellites = slots
    .filter((s) => s.rank !== 1)
    .sort((a, b) => a.rank - b.rank);

  // Calcul des positions en ellipse des 9 satellites (angles en radians de 0 à 2*PI)
  // i=0 démarre en haut (-PI/2) et tourne dans le sens horaire
  const RADIUS_X = 38; // % de la largeur
  const RADIUS_Y = 37; // % de la hauteur

  const satellitePositions = satellites.map((sat, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / satellites.length;
    const x = 50 + RADIUS_X * Math.cos(angle);
    const y = 50 + RADIUS_Y * Math.sin(angle);
    return { slot: sat, x, y };
  });

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center">
      
      {/* ─── En-tête du composant ─────────────────────────────────── */}
      <div className="w-full flex items-center justify-between mb-2 px-2">
        <div>
          <h2 className="text-xs sm:text-sm font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
            <span>🛰️</span>
            <span>Constellation Vectorielle</span>
          </h2>
          <p className="text-[10px] sm:text-[11px] text-gray-400">
            Satellites sémantiques proches reliés à la cible
          </p>
        </div>

        {/* Toggle Mode Orbite / Grille */}
        <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg p-0.5 text-[10px] font-bold">
          <button
            onClick={() => setViewMode("orbit")}
            className={`px-2 py-1 rounded transition-all cursor-pointer ${
              viewMode === "orbit"
                ? "bg-yellow-500 text-black shadow"
                : "text-gray-400 hover:text-white"
            }`}
            title="Vue Constellation spatiale"
          >
            🪐 Orbite
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`px-2 py-1 rounded transition-all cursor-pointer ${
              viewMode === "grid"
                ? "bg-yellow-500 text-black shadow"
                : "text-gray-400 hover:text-white"
            }`}
            title="Vue Grille classique"
          >
            📋 Grille
          </button>
        </div>
      </div>

      {/* ─── VUE 1 : CONSTELLATION ORBITALE (Par défaut) ─────────── */}
      {viewMode === "orbit" ? (
        <div className="relative w-full aspect-square max-h-[460px] sm:max-h-[500px] bg-gradient-to-b from-[#0e0e12] via-[#09090c] to-[#050507] border border-gray-800/80 rounded-3xl p-4 overflow-hidden shadow-2xl flex items-center justify-center select-none">
          
          {/* Fond d'étoiles / grille vectorielle */}
          <div className="absolute inset-0 bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />

          {/* SVG : Lignes de connexion vers le centre */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="activeBeam" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
              </linearGradient>
              <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Ellipse orbite guide */}
            <ellipse
              cx="50%"
              cy="50%"
              rx={`${RADIUS_X}%`}
              ry={`${RADIUS_Y}%`}
              fill="none"
              stroke="rgba(255, 255, 255, 0.06)"
              strokeDasharray="4 6"
              strokeWidth="1"
            />

            {/* Traits connectant chaque satellite au centre */}
            {satellitePositions.map(({ slot, x, y }) => {
              const isRevealed = slot.revealed || isGameOver;
              return (
                <g key={`line-${slot.rank}`}>
                  <line
                    x1="50%"
                    y1="50%"
                    x2={`${x}%`}
                    y2={`${y}%`}
                    stroke={isRevealed ? "url(#activeBeam)" : "rgba(107, 114, 128, 0.25)"}
                    strokeWidth={isRevealed ? "2.5" : "1.2"}
                    strokeDasharray={isRevealed ? "none" : "3 4"}
                    filter={isRevealed ? "url(#lineGlow)" : undefined}
                    className="transition-all duration-700"
                  />
                  {/* Point orbital */}
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r={isRevealed ? 4 : 2.5}
                    fill={isRevealed ? "#F59E0B" : "#4B5563"}
                  />
                </g>
              );
            })}
          </svg>

          {/* ─── NŒUD CENTRAL : LE MOT À DEVINER (CIBLE #1) ──────── */}
          <div
            className="absolute z-10 flex flex-col items-center justify-center"
            style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
          >
            {/* Halo radar */}
            {!targetSlot.revealed && !isGameOver && (
              <div className="absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full border border-yellow-400/20 animate-ping pointer-events-none" />
            )}

            <div
              className={`relative px-4 py-3 sm:px-6 sm:py-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-700 shadow-2xl ${
                targetSlot.revealed || isGameOver
                  ? "bg-gradient-to-br from-yellow-500/20 via-amber-600/30 to-yellow-700/20 border-2 border-yellow-400 shadow-yellow-500/30 scale-105"
                  : "bg-gray-900/90 border-2 border-dashed border-yellow-500/50 shadow-black/80 hover:border-yellow-400"
              }`}
            >
              <span className="text-xs uppercase tracking-widest text-yellow-400 font-extrabold flex items-center gap-1">
                <span>👑</span>
                <span>CIBLE #1</span>
              </span>

              <span className="text-base sm:text-lg font-black uppercase tracking-wider text-white mt-0.5 max-w-[130px] sm:max-w-[160px] truncate">
                {targetSlot.revealed || isGameOver
                  ? targetSlot.word || "TROUVÉ !"
                  : "MOT CIBLE"}
              </span>

              <span className="text-[11px] font-bold text-yellow-300 font-mono mt-0.5">
                {targetSlot.points.toLocaleString()} pts
              </span>
            </div>
          </div>

          {/* ─── CARTES SATELLITES PÉRIPHÉRIQUES (#2 à #10) ──────── */}
          {satellitePositions.map(({ slot, x, y }) => {
            const isRevealed = slot.revealed || isGameOver;
            return (
              <div
                key={`sat-${slot.rank}`}
                className="absolute z-20 transition-all duration-700"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <SatelliteCard slot={slot} isRevealed={isRevealed} />
              </div>
            );
          })}

        </div>
      ) : (
        /* ─── VUE 2 : GRILLE ALTERNATIVE ─────────────────────────── */
        <div className="w-full grid grid-cols-2 gap-2 mt-2">
          {slots.map((slot) => (
            <div
              key={slot.rank}
              className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                slot.revealed || isGameOver
                  ? "bg-gray-900 border-yellow-500/60 shadow-md"
                  : "bg-black/50 border-gray-800 text-gray-500"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-yellow-400 font-mono">
                  #{slot.rank}
                </span>
                <span className="text-xs font-bold text-white uppercase truncate max-w-[110px]">
                  {slot.revealed || isGameOver ? slot.word || "???" : "•••••"}
                </span>
              </div>
              <span className="text-[11px] font-mono text-gray-400">
                {slot.points} pts
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

// ─── Composant Carte Satellite Unique ───────────────────────────
function SatelliteCard({
  slot,
  isRevealed,
}: {
  slot: TopSlot;
  isRevealed: boolean;
}) {
  const [justAnimated, setJustAnimated] = useState(false);

  useEffect(() => {
    if (slot.justRevealed) {
      setJustAnimated(true);
      const timer = setTimeout(() => setJustAnimated(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [slot.justRevealed]);

  if (isRevealed) {
    return (
      <div
        className={`px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl border flex flex-col items-center justify-center text-center shadow-lg transition-transform hover:scale-110 min-w-[76px] sm:min-w-[90px] max-w-[100px] sm:max-w-[115px] ${
          slot.rank <= 3
            ? "bg-gradient-to-br from-amber-950/90 to-yellow-950/80 border-amber-400/80 shadow-amber-500/20"
            : "bg-gradient-to-br from-gray-900/90 to-blue-950/80 border-blue-400/60 shadow-blue-500/10"
        } ${justAnimated ? "animate-bounce scale-110" : ""}`}
      >
        <span className="text-[9px] sm:text-[10px] text-yellow-400 font-black tracking-wider uppercase flex items-center gap-0.5">
          <span>🛰️</span>
          <span>#{slot.rank}</span>
        </span>
        <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-tight truncate w-full px-0.5">
          {slot.word || "???"}
        </span>
        <div className="flex items-center gap-1 text-[9px] font-mono mt-0.5">
          <span className="text-emerald-400 font-bold">+{slot.points}</span>
          {slot.similarity !== undefined && (
            <span className="text-gray-400">
              {(slot.similarity * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    );
  }

  // État caché (non encore deviné)
  return (
    <div
      className="px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl bg-black/70 backdrop-blur border border-gray-800 hover:border-gray-600 flex flex-col items-center justify-center text-center shadow-md transition-all hover:scale-105 min-w-[65px] sm:min-w-[80px]"
      title={`Satellite #${slot.rank} — ${slot.points} pts`}
    >
      <span className="text-[9px] sm:text-[10px] font-black text-gray-500 font-mono">
        #{slot.rank}
      </span>
      <span className="text-[10px] text-gray-600 font-semibold my-0.5">
        •••••
      </span>
      <span className="text-[8px] sm:text-[9px] text-yellow-500/70 font-mono font-medium">
        {slot.points} pts
      </span>
    </div>
  );
}

"use client";

import { useState } from "react";

interface AnalogyDisplayProps {
  wordA: string;
  wordB: string;
  wordC: string;
  lang?: string;
  answerLength?: number;
  firstLetter?: string | null;
  errorCount?: number;
}

const LABELS: Record<string, { is: string; to: string; target: string }> = {
  fr: { is: "est à", to: "ce que", target: "est à" },
  en: { is: "is to", to: "as", target: "is to" },
  es: { is: "es a", to: "como", target: "es a" },
  de: { is: "verhält sich zu", to: "wie", target: "verhält sich zu" },
};

export default function AnalogyDisplay({
  wordA,
  wordB,
  wordC,
  lang = "fr",
  answerLength = 0,
  firstLetter = null,
  errorCount = 0,
}: AnalogyDisplayProps) {
  const lbl = LABELS[lang] || LABELS.en;
  const [showMathView, setShowMathView] = useState(false);

  // Construction du masque de lettres (ex: S _ _ _ _ _ _ ou _ _ _ _ _ _ _)
  let letterMask = "";
  if (answerLength > 0 && (errorCount >= 1 || !!firstLetter)) {
    if (firstLetter) {
      letterMask = firstLetter.toUpperCase() + " " + "_ ".repeat(answerLength - 1).trim();
    } else {
      letterMask = "_ ".repeat(answerLength).trim();
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full select-none">
      
      {/* ─── Affichage Principal : La Phrase Naturelle ───────────── */}
      <div className="w-full bg-gradient-to-b from-gray-900/90 to-black/80 border border-gray-800 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col items-center gap-4">
        
        {/* Ligne 1 : [A] est à [B] */}
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 text-base md:text-lg">
          <span className="px-3.5 py-1.5 rounded-xl bg-blue-950/80 border border-blue-500/40 text-blue-300 font-black uppercase tracking-wide shadow-md shadow-blue-500/10">
            {wordA}
          </span>
          <span className="text-gray-400 font-serif italic text-sm md:text-base">
            {lbl.is}
          </span>
          <span className="px-3.5 py-1.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 font-black uppercase tracking-wide shadow-md shadow-red-500/10">
            {wordB}
          </span>
        </div>

        {/* Séparateur élégant */}
        <div className="flex items-center gap-2 text-xs text-yellow-500/70 uppercase tracking-widest font-bold">
          <span className="h-px w-8 bg-gray-800" />
          <span>{lbl.to}</span>
          <span className="h-px w-8 bg-gray-800" />
        </div>

        {/* Ligne 2 : [C] est à [ ? ? ? ] */}
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 text-base md:text-lg">
          <span className="px-3.5 py-1.5 rounded-xl bg-green-950/80 border border-green-500/40 text-green-300 font-black uppercase tracking-wide shadow-md shadow-green-500/10">
            {wordC}
          </span>
          <span className="text-gray-400 font-serif italic text-sm md:text-base">
            {lbl.target}
          </span>
          
          {/* Boîte Cible Mystère */}
          <div className="relative group px-4 py-1.5 rounded-xl bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-2 border-dashed border-yellow-400/80 text-yellow-300 font-black tracking-widest flex items-center justify-center shadow-lg shadow-yellow-500/10 animate-pulse">
            <span className="text-sm md:text-base">? ? ?</span>
          </div>
        </div>

        {/* ─── Indice Automatique : Longueur & Première Lettre ──── */}
        {errorCount >= 1 && answerLength > 0 && (
          <div className="mt-1 pt-3 border-t border-gray-800/80 w-full flex flex-col items-center gap-1 animate-in fade-in duration-300">
            <p className="text-[11px] uppercase tracking-wider font-bold text-gray-400 flex items-center gap-1.5">
              <span>🔍 Indice débloqué :</span>
              <span className="text-yellow-400 font-mono tracking-widest text-xs">{letterMask}</span>
              <span className="text-gray-500 text-[10px]">({answerLength} lettres)</span>
            </p>
          </div>
        )}

      </div>

      {/* ─── Vue Mathématique Vectorielle Optionnelle ────────────── */}
      <div className="w-full flex flex-col items-center">
        <button
          onClick={() => setShowMathView((v) => !v)}
          className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1 font-mono"
        >
          <span>{showMathView ? "▲ Masquer" : "▼ Afficher"} la formule vectorielle (IA)</span>
        </button>

        {showMathView && (
          <div className="mt-2 p-2.5 bg-black/40 border border-gray-800/80 rounded-xl text-xs font-mono text-gray-400 flex items-center gap-2 animate-in fade-in duration-200">
            <span className="text-blue-400 font-bold">{wordA.toUpperCase()}</span>
            <span className="text-red-400 font-bold">−</span>
            <span className="text-red-400 font-bold">{wordB.toUpperCase()}</span>
            <span className="text-green-400 font-bold">+</span>
            <span className="text-green-400 font-bold">{wordC.toUpperCase()}</span>
            <span className="text-white">=</span>
            <span className="text-yellow-400 font-bold">Vecteur Cible (?)</span>
          </div>
        )}
      </div>

    </div>
  );
}

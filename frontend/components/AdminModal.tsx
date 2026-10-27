"use client";

import { useEffect, useState } from "react";
import { revealFullTop10 } from "@/lib/api";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: string;
  theme?: string;
  challengeId?: string;
  gameMode?: "daily" | "training";
  onRevealAllCards: (fullTop10: { rank: number; word: string; points: number; similarity: number }[]) => void;
  onResetLives: () => void;
  onReloadChallenge?: () => void;
}

interface FullTop10Data {
  top10: { rank: number; word: string; points: number; similarity: number }[];
  word_a: string;
  word_b: string;
  word_c: string;
  answer: string;
}

export default function AdminModal({
  isOpen,
  onClose,
  lang,
  theme = "culture",
  challengeId,
  gameMode = "daily",
  onRevealAllCards,
  onResetLives,
  onReloadChallenge,
}: AdminModalProps) {
  const [data, setData] = useState<FullTop10Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAnswers();
    }
  }, [isOpen, lang, theme, challengeId]);

  const loadAnswers = async () => {
    setLoading(true);
    try {
      const res = await revealFullTop10(lang, theme, challengeId);
      setData(res);
    } catch (err) {
      console.error("Erreur admin reveal:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!data) return;
    const text = data.top10
      .map((s) => `#${s.rank} : ${s.word.toUpperCase()} (${s.points} pts - sim: ${Math.round(s.similarity * 100)}%)`)
      .join("\n");
    navigator.clipboard.writeText(
      `VectorWord Réponses [${lang.toUpperCase()}]\n${data.word_a} - ${data.word_b} + ${data.word_c} = ${data.answer}\n\n${text}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#121212] border-2 border-yellow-500/50 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-black/40">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛠️</span>
            <div>
              <h2 className="font-black text-yellow-400 text-lg uppercase tracking-wide">
                Console Admin & Réponses
              </h2>
              <p className="text-xs text-gray-400">
                Vue secrète des vecteurs & réponses du défi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center font-bold text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Chargement des réponses...</p>
            </div>
          ) : data ? (
            <>
              {/* Formule du jour */}
              <div className="p-3 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                      Analogie active ({lang.toUpperCase()})
                    </p>
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded uppercase font-extrabold border border-yellow-500/30">
                      {theme}
                    </span>
                    <span className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded border border-gray-700">
                      {gameMode === "training" ? "♾️ Entraînement" : "📅 Quotidien"}
                    </span>
                    {challengeId && (
                      <span className="text-[10px] text-gray-400 font-mono bg-black/40 px-1 rounded">
                        #{challengeId}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-black text-white mt-1">
                    <span className="text-blue-400">{data.word_a.toUpperCase()}</span>
                    <span className="text-gray-400 text-xs"> est à </span>
                    <span className="text-red-400">{data.word_b.toUpperCase()}</span>
                    <span className="text-gray-400 text-xs"> ce que </span>
                    <span className="text-green-400">{data.word_c.toUpperCase()}</span>
                    <span className="text-gray-400 text-xs"> est à </span>
                    <span className="text-yellow-400 font-extrabold">{data.answer.toUpperCase()}</span>
                  </p>
                </div>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg font-bold transition-colors flex items-center gap-1.5"
                >
                  {copied ? "✅ Copié !" : "📋 Copier"}
                </button>
              </div>

              {/* Table Top 10 */}
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                  Top 10 officiel calculé par le modèle :
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {data.top10.map((item) => (
                    <div
                      key={item.rank}
                      className="flex items-center justify-between px-3 py-2 bg-gray-900/90 border border-gray-800 rounded-lg hover:border-yellow-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-yellow-500 w-5">
                          #{item.rank}
                        </span>
                        <span className="text-sm font-extrabold text-white uppercase tracking-wide">
                          {item.word}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-yellow-400 block">
                          {item.points} pts
                        </span>
                        <span className="text-[10px] text-gray-400 block font-mono">
                          {Math.round(item.similarity * 100)}% sim
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions de test rapide */}
              <div className="mt-2 pt-4 border-t border-gray-800 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    onRevealAllCards(data.top10);
                    onClose();
                  }}
                  className="flex-1 py-2.5 px-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-wide rounded-xl transition-all shadow-lg shadow-yellow-500/20 active:scale-95"
                >
                  👁️ Révéler les cartes sur le plateau
                </button>
                <button
                  onClick={onResetLives}
                  className="py-2.5 px-3 bg-red-950/80 hover:bg-red-900 border border-red-700/50 text-red-300 font-bold text-xs uppercase tracking-wide rounded-xl transition-all active:scale-95"
                >
                  ❤️ Reset 10 vies
                </button>
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const { regenerateAICatalog } = await import("@/lib/api");
                      await regenerateAICatalog();
                      await loadAnswers();
                      onReloadChallenge?.();
                      alert("🎉 Pipeline IA ré-exécuté avec succès ! Nouveaux défis générés.");
                    } catch (e) {
                      alert("Erreur lors de la génération IA");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="w-full py-2.5 px-3 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/50 text-indigo-300 font-bold text-xs uppercase tracking-wide rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>Relancer le Pipeline IA (Générer de nouveaux défis)</span>
                </button>
              </div>
            </>
          ) : (
            <p className="text-red-400 text-sm text-center py-6">
              Impossible de charger les réponses. Vérifie que le backend tourne.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-black/60 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-500">
          <span>Raccourci clavier : <b>Ctrl + Shift + A</b></span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}

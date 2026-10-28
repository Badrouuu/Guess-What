"use client";

import { useCallback, useEffect, useState } from "react";
import AdminModal from "@/components/AdminModal";
import AnalogyDisplay from "@/components/AnalogyDisplay";
import GuessInput from "@/components/GuessInput";
import LivesBar from "@/components/LivesBar";
import ProfileModal from "@/components/ProfileModal";
import ScoreCounter from "@/components/ScoreCounter";
import Timer from "@/components/Timer";
import Top10Board from "@/components/Top10Board";
import {
  ChallengeData,
  GuessResult,
  detectLanguage,
  fetchChallenge,
  revealFullTop10,
  submitFinalScore,
  submitGuess,
  getSessionId,
} from "@/lib/api";
import {
  PlayerProfile,
  getStoredProfile,
  recordLoss,
  recordWin,
} from "@/lib/firebaseAuth";

const MAX_LIVES = 10;

type GamePhase = "loading" | "playing" | "game_over" | "won";

const THEMES = [
  { id: "culture", label: "Culture G", icon: "🌍" },
  { id: "gaming", label: "Gaming", icon: "🎮" },
  { id: "cinema", label: "Ciné & Séries", icon: "🎬" },
  { id: "food", label: "Food & Gastro", icon: "🍕" },
];

interface ScoreBreakdown {
  baseTarget: number;
  intuitionBonus: number;
  livesBonus: number;
  satellitePoints: number;
  total: number;
  isPerfect: boolean;
}

export default function HomePage() {
  // ─── State ───────────────────────────────────────────────────────────────
  const [lang, setLang] = useState("fr");
  const [theme, setTheme] = useState("culture");
  const [gameMode, setGameMode] = useState<"daily" | "training">("daily");
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null);
  const [wordsFound, setWordsFound] = useState(0);
  const [solvedWord, setSolvedWord] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [firstLetterClue, setFirstLetterClue] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<GuessResult | null>(null);
  const [slots, setSlots] = useState<ChallengeData["top10"]>([]);
  const [showResult, setShowResult] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile>(getStoredProfile);
  const [sessionId] = useState(() =>
    typeof window !== "undefined" ? getSessionId() : "ssr"
  );

  // ─── Chargement défi ─────────────────────────────────────────────────────
  useEffect(() => {
    const detectedLang = detectLanguage();
    setLang(detectedLang);
    setProfile(getStoredProfile());
    loadChallenge(detectedLang, "culture", "daily");
  }, []);

  // ─── Raccourci clavier Admin (Ctrl+Shift+A) ──────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        setIsAdminOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const loadChallenge = async (
    l: string = lang,
    t: string = theme,
    mode: "daily" | "training" = gameMode,
    seed?: string
  ) => {
    setPhase("loading");
    setShowResult(false);
    setScore(0);
    setScoreBreakdown(null);
    setWordsFound(0);
    setSolvedWord(null);
    setLives(MAX_LIVES);
    setErrorCount(0);
    setFirstLetterClue(false);
    setLastFeedback(null);
    try {
      const trainSeed = mode === "training" ? (seed || Math.random().toString(36).slice(2)) : undefined;
      const data = await fetchChallenge(l, t, mode, trainSeed);
      setChallenge(data);
      setSlots(data.top10);
      setPhase("playing");
    } catch (err) {
      console.error("Erreur chargement défi:", err);
    }
  };

  // ─── Fin de partie ────────────────────────────────────────────────────────
  const endGame = useCallback(
    async (result: "won" | "game_over", finalEarnedScore?: number) => {
      setPhase(result);
      setShowResult(true);

      const actualScore = finalEarnedScore !== undefined ? finalEarnedScore : score;

      // Met à jour le profil (victoires, séries, streaks)
      if (result === "won") {
        const updated = recordWin(actualScore);
        setProfile(updated);
      } else {
        const updated = recordLoss();
        setProfile(updated);
      }

      // Révèle toutes les cartes restantes
      try {
        const full = await revealFullTop10(lang, theme, challenge?.id);
        const target = full.answer || full.top10?.find((s: { rank: number }) => s.rank === 1)?.word;
        if (target) {
          setSolvedWord((prev) => prev || target);
        }
        setSlots((prev) =>
          prev.map((slot) => {
            const fullSlot = full.top10.find(
              (s: { rank: number }) => s.rank === slot.rank
            );
            return {
              ...slot,
              revealed: true,
              word: fullSlot?.word || slot.word,
              similarity: fullSlot?.similarity,
              justRevealed: !slot.revealed,
            };
          })
        );
      } catch (err) {
        console.error("Erreur révélation:", err);
      }
    },
    [lang, theme, score, challenge?.id]
  );

  // ─── Achat d'un indice (coût: 2 vies) ─────────────────────────────────────
  const handleBuyClue = useCallback(() => {
    if (lives <= 2 || firstLetterClue || phase !== "playing") return;
    setLives((l) => Math.max(1, l - 2));
    setFirstLetterClue(true);
  }, [lives, firstLetterClue, phase]);

  // ─── Logique de devinette ─────────────────────────────────────────────────
  const handleGuess = useCallback(
    async (word: string) => {
      if (!challenge || phase !== "playing") return;

      try {
        const result = await submitGuess(word, lang, sessionId, theme, challenge.id);
        setLastFeedback(result);

        if (result.in_top10 && result.rank !== null) {
          // Vérifier si le mot a déjà été révélé
          const isAlreadyRevealed = slots.some(
            (s) => s.rank === result.rank && s.revealed
          );
          if (isAlreadyRevealed) {
            return;
          }

          // ✅ Mot trouvé dans le Top 10 — flip la carte !
          setSlots((prev) =>
            prev.map((slot) =>
              slot.rank === result.rank
                ? {
                    ...slot,
                    revealed: true,
                    word: result.revealed_word || word,
                    similarity: result.similarity,
                    justRevealed: true,
                  }
                : slot
            )
          );
          // Si le joueur trouve la Cible #1 -> Victoire immédiate avec calcul méritocratique du score !
          if (result.rank === 1) {
            const foundTarget = result.revealed_word || word;
            setSolvedWord(foundTarget);

            // Nombre de satellites découverts avant la cible
            const satellitesFoundCount = slots.filter((s) => s.rank !== 1 && s.revealed).length;
            const currentSatPoints = score;

            // Bonus Intuition Pure : forte récompense pour n'avoir utilisé aucun satellite ni indice !
            let intuitionBonus = 0;
            if (!firstLetterClue) {
              if (satellitesFoundCount === 0) {
                intuitionBonus = 1500; // Coup de Maître : 0 satellite et 0 indice utilisé !
              } else if (satellitesFoundCount === 1) {
                intuitionBonus = 700;  // 1 seul satellite
              } else if (satellitesFoundCount === 2) {
                intuitionBonus = 350;  // 2 satellites
              }
            }

            const livesBonus = lives * 100;
            const finalCalculatedScore = 1000 + currentSatPoints + intuitionBonus + livesBonus;

            setScore(finalCalculatedScore);
            setScoreBreakdown({
              baseTarget: 1000,
              intuitionBonus,
              livesBonus,
              satellitePoints: currentSatPoints,
              total: finalCalculatedScore,
              isPerfect: satellitesFoundCount === 0 && !firstLetterClue && lives === MAX_LIVES,
            });

            endGame("won", finalCalculatedScore);
          } else {
            // Découverte d'un satellite d'aide
            setScore((s) => s + result.points);
            setWordsFound((w) => w + 1);
          }

          // Réinitialise justRevealed après l'animation
          setTimeout(() => {
            setSlots((prev) =>
              prev.map((slot) =>
                slot.rank === result.rank
                  ? { ...slot, justRevealed: false }
                  : slot
              )
            );
          }, 1000);
        } else {
          // ❌ Mauvaise réponse — perd 1 vie & incrémente compteur d'erreurs (révèle masque)
          setErrorCount((e) => e + 1);
          setLives((prevLives) => {
            const nextLives = prevLives - 1;
            if (nextLives <= 0) {
              endGame("game_over");
              return 0;
            }
            return nextLives;
          });
        }
      } catch (err) {
        console.error("Erreur handleGuess:", err);
        setErrorCount((e) => e + 1);
        setLives((prevLives) => {
          const nextLives = prevLives - 1;
          if (nextLives <= 0) {
            endGame("game_over");
            return 0;
          }
          return nextLives;
        });
      }
    },
    [challenge, phase, lang, sessionId, theme, slots, endGame]
  );

  const handleSubmitScore = async () => {
    if (!playerName.trim() || scoreSubmitted) return;
    await submitFinalScore(
      playerName,
      lang,
      score,
      wordsFound,
      lives
    );
    setScoreSubmitted(true);
  };

  const handleShare = () => {
    const emojis = slots
      .sort((a, b) => a.rank - b.rank)
      .map((s) => (s.revealed && s.word ? "🟨" : "⬛"))
      .join("");
    const targetDisplay = solvedWord ? solvedWord.toUpperCase() : "?";
    const text = `VectorWord — ${new Date().toLocaleDateString(lang)}
${challenge?.word_a?.toUpperCase()} − ${challenge?.word_b?.toUpperCase()} + ${challenge?.word_c?.toUpperCase()} = ${targetDisplay}
${emojis}
Score: ${score.toLocaleString()} pts
🧠 Joue sur guess-what.vercel.app`;
    navigator.clipboard.writeText(text).catch(() => {});
    alert(lang === "fr" ? "Copié dans le presse-papiers !" : "Copied!");
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Chargement du défi...</p>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-red-400">Erreur de chargement. Recharge la page.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-[#0A0A0A]/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-yellow-400 tracking-tight">
              🧠 VectorWord
            </h1>
            <p className="text-xs text-gray-500 capitalize">
              {challenge.category} · Difficulté {challenge.difficulty}/3
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Bouton Profil & Streak */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-900 border border-gray-700 hover:border-yellow-500/50 hover:bg-gray-800 transition-all shadow-sm"
              title="Mon Profil & Séries"
            >
              <span className="text-sm">{profile.photoURL || "👤"}</span>
              <span className="hidden sm:inline font-semibold text-gray-200">
                {profile.displayName || "Joueur"}
              </span>
              {profile.streak > 0 && (
                <span className="flex items-center gap-0.5 text-amber-400 font-extrabold bg-amber-400/10 px-1.5 py-0.5 rounded-full border border-amber-400/20 text-[10px]">
                  🔥 {profile.streak}
                </span>
              )}
            </button>

            {/* Bouton Admin */}
            <button
              onClick={() => setIsAdminOpen(true)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 hover:border-yellow-400 transition-all flex items-center gap-1.5 shadow-sm"
              title="Console Admin (Ctrl+Shift+A)"
            >
              <span>🛠️</span>
              <span className="hidden sm:inline">Admin</span>
            </button>

            {/* Sélecteur de langue */}
            <div className="flex gap-1">
              {["fr", "en", "es"].map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    setLang(l);
                    loadChallenge(l, theme, gameMode);
                  }}
                  className={`px-2 py-1 rounded text-xs font-bold uppercase transition-all ${
                    lang === l
                      ? "bg-yellow-500 text-black"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ─── Corps principal ──────────────────────────────────────── */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-6">

        {/* ─── Mode de jeu & Sélecteur de Thème ─────────────────── */}
        <div className="flex flex-col gap-2">
          {/* Toggle Quotidien vs Entraînement */}
          <div className="flex items-center justify-between bg-gray-900/60 p-1.5 rounded-xl border border-gray-800">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setGameMode("daily");
                  loadChallenge(lang, theme, "daily");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  gameMode === "daily"
                    ? "bg-yellow-500 text-black shadow-md shadow-yellow-500/20 font-extrabold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <span>📅</span>
                <span>Défi du Jour</span>
              </button>

              <button
                onClick={() => {
                  setGameMode("training");
                  loadChallenge(lang, theme, "training", Date.now().toString());
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  gameMode === "training"
                    ? "bg-yellow-500 text-black shadow-md shadow-yellow-500/20 font-extrabold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <span>♾️</span>
                <span>Entraînement</span>
              </button>
            </div>

            {gameMode === "training" && (
              <button
                onClick={() =>
                  loadChallenge(
                    lang,
                    theme,
                    "training",
                    Date.now().toString() + "_" + Math.random().toString(36).slice(2)
                  )
                }
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <span>🎲</span>
                <span>Nouvelle analogie</span>
              </button>
            )}
          </div>

          {/* Thèmes */}
          <div className="flex items-center justify-center gap-1.5 p-1.5 bg-gray-900/90 border border-gray-800 rounded-2xl shadow-inner overflow-x-auto">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  loadChallenge(lang, t.id, gameMode);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  theme === t.id
                    ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-md shadow-yellow-500/20 scale-[1.02]"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Score + Vies */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <ScoreCounter
            score={score}
            totalPossible={challenge.total_possible_points}
          />
          <LivesBar lives={lives} maxLives={MAX_LIVES} />
        </div>

        {/* Analogie */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <AnalogyDisplay
            wordA={challenge.word_a}
            wordB={challenge.word_b}
            wordC={challenge.word_c}
            targetWord={solvedWord}
            isSolved={phase === "won" || (slots.find((s) => s.rank === 1)?.revealed ?? false)}
            isGameOver={phase === "game_over"}
            lang={lang}
            answerLength={challenge.answer_length}
            firstLetter={firstLetterClue ? challenge.first_letter : null}
            errorCount={errorCount}
          />
        </div>

        {/* Input + Bouton Indice */}
        <div className="flex flex-col gap-2">
          <GuessInput
            onGuess={handleGuess}
            feedback={lastFeedback?.feedback || null}
            similarity={lastFeedback?.similarity}
            disabled={phase !== "playing"}
            lang={lang}
          />

          {/* Système d'Aide & Indices */}
          {phase === "playing" && (
            <div className="flex items-center justify-between px-1 text-xs">
              <div className="text-gray-500">
                {errorCount > 0 && !firstLetterClue && (
                  <span className="text-yellow-500/80">
                    💡 Longueur du mot révélée ({challenge.answer_length} lettres)
                  </span>
                )}
              </div>
              <button
                onClick={handleBuyClue}
                disabled={lives <= 2 || firstLetterClue}
                className={`px-3 py-1.5 rounded-lg border font-semibold transition-all flex items-center gap-1.5 ${
                  firstLetterClue
                    ? "bg-green-500/10 text-green-400 border-green-500/30 cursor-default"
                    : lives > 2
                    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20 cursor-pointer shadow-sm"
                    : "bg-gray-800/40 text-gray-600 border-gray-800 cursor-not-allowed"
                }`}
                title={
                  lives <= 2
                    ? "Pas assez de vies (minimum 3 vies nécessaires)"
                    : "Révèle la première lettre du mot mystère"
                }
              >
                <span>💡</span>
                {firstLetterClue ? (
                  <span>1ère lettre révélée : {challenge.first_letter}</span>
                ) : (
                  <span>Révéler la 1ère lettre (-2 ❤️)</span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Tableau Top 10 style Ma Famille en Or */}
        <Top10Board slots={slots} isGameOver={phase !== "playing"} />

        {/* ─── Écran de résultat ───────────────────────────────────── */}
        {showResult && (
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500">
            {/* Titre */}
            <div className="text-center">
              {phase === "won" ? (
                <>
                  <p className="text-4xl mb-1">🏆</p>
                  <h2 className="text-2xl font-black text-yellow-400">
                    Mot Mystère Trouvé !
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Félicitations, analogie résolue avec succès !
                  </p>
                </>
              ) : (
                <>
                  <p className="text-4xl mb-1">💀</p>
                  <h2 className="text-2xl font-black text-red-400">
                    Partie terminée
                  </h2>
                  <p className="text-gray-400 text-sm">
                    La cible était :{" "}
                    <span className="text-yellow-400 font-bold uppercase tracking-wider">
                      {solvedWord || "..."}
                    </span>
                  </p>
                </>
              )}
            </div>

            {/* Détail du score méritocratique */}
            {scoreBreakdown && (
              <div className="bg-black/50 border border-gray-800 rounded-xl p-4 flex flex-col gap-2.5 text-xs text-left animate-in fade-in duration-300">
                <div className="flex justify-between items-center text-gray-300">
                  <span className="flex items-center gap-1.5">
                    <span>🎯</span>
                    <span className="font-medium">Cible trouvée</span>
                  </span>
                  <span className="font-mono font-bold text-yellow-400">+{scoreBreakdown.baseTarget} pts</span>
                </div>

                {scoreBreakdown.intuitionBonus > 0 && (
                  <div className="flex justify-between items-center text-emerald-300 bg-emerald-950/50 p-2 rounded-lg border border-emerald-500/40">
                    <span className="flex items-center gap-1.5 font-bold">
                      <span>⚡</span>
                      <span>
                        {scoreBreakdown.intuitionBonus === 1500
                          ? "Bonus Intuition Pure (0 satellite & 0 indice)"
                          : "Bonus Déduction Rapide (très peu de satellites)"}
                      </span>
                    </span>
                    <span className="font-mono font-black text-emerald-400">
                      +{scoreBreakdown.intuitionBonus} pts
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-gray-300">
                  <span className="flex items-center gap-1.5">
                    <span>❤️</span>
                    <span className="font-medium">Bonus Vies conservées ({lives}/10)</span>
                  </span>
                  <span className="font-mono font-bold text-red-400">+{scoreBreakdown.livesBonus} pts</span>
                </div>

                {scoreBreakdown.satellitePoints > 0 && (
                  <div className="flex justify-between items-center text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <span>🛰️</span>
                      <span>Satellites explorés</span>
                    </span>
                    <span className="font-mono font-bold text-blue-400">+{scoreBreakdown.satellitePoints} pts</span>
                  </div>
                )}
              </div>
            )}

            {/* Score final */}
            <div className="text-center py-4 bg-black/30 rounded-xl">
              <p className="text-gray-400 text-sm uppercase tracking-widest">
                Score final
              </p>
              <p className="text-5xl font-black text-yellow-400 tabular-nums">
                {score.toLocaleString()}
              </p>
              <p className="text-gray-500 text-sm">
                / {challenge.total_possible_points.toLocaleString()} pts possibles
              </p>
            </div>

            {/* Soumettre le score */}
            {!scoreSubmitted ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={lang === "fr" ? "Ton pseudo..." : "Your name..."}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value.slice(0, 30))}
                  maxLength={30}
                  className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-gray-600 text-white text-sm focus:outline-none focus:border-yellow-500"
                />
                <button
                  onClick={handleSubmitScore}
                  disabled={!playerName.trim()}
                  className="px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg text-sm disabled:opacity-30 hover:bg-yellow-400 transition-colors"
                >
                  {lang === "fr" ? "Soumettre" : "Submit"}
                </button>
              </div>
            ) : (
              <p className="text-center text-green-400 text-sm font-bold">
                ✅ Score soumis !
              </p>
            )}

            {/* Partager */}
            <button
              onClick={handleShare}
              className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
            >
              📤 {lang === "fr" ? "Partager mon résultat" : "Share my result"}
            </button>

            {/* Prochain défi */}
            <div className="text-center border-t border-gray-800 pt-4">
              <Timer />
            </div>
          </div>
        )}
      </div>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="text-center py-4 text-xs text-gray-700 border-t border-gray-900">
        VectorWord · Inspiré de Word2Vec · Nouveau défi chaque jour
      </footer>

      {/* ─── Modale Admin ────────────────────────────────────────── */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        lang={lang}
        theme={theme}
        challengeId={challenge?.id}
        gameMode={gameMode}
        onReloadChallenge={() => loadChallenge(lang, theme, gameMode)}
        onRevealAllCards={(fullTop10) => {
          const target = fullTop10.find((s) => s.rank === 1)?.word;
          if (target) setSolvedWord(target);
          setSlots((prev) =>
            prev.map((slot) => {
              const match = fullTop10.find((s) => s.rank === slot.rank);
              return {
                ...slot,
                revealed: true,
                word: match?.word || slot.word,
                similarity: match?.similarity,
                justRevealed: true,
              };
            })
          );
        }}
        onResetLives={() => {
          setLives(MAX_LIVES);
          if (phase === "game_over") {
            setPhase("playing");
            setShowResult(false);
          }
        }}
      />

      {/* ─── Modale Profil & Firebase Auth ────────────────────────── */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={profile}
        onProfileUpdate={(updated) => setProfile(updated)}
      />
    </main>
  );
}

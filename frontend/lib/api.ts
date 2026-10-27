// lib/api.ts — Appels vers le backend FastAPI

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ChallengeData {
  id?: string;
  date: string;
  lang: string;
  word_a: string;
  word_b: string;
  word_c: string;
  category: string;
  difficulty: number;
  answer_length?: number;
  first_letter?: string;
  top10: {
    rank: number;
    points: number;
    revealed: boolean;
    word?: string;
  }[];
  total_possible_points: number;
}

export interface GuessResult {
  in_top10: boolean;
  rank: number | null;
  points: number;
  similarity: number;
  feedback: "exact" | "hot" | "warm" | "cold";
  revealed_word: string | null;
}

export interface LeaderboardEntry {
  player_name: string;
  points: number;
  words_found: number;
  lives_remaining: number;
  timestamp: string;
}

export async function fetchChallenge(
  lang: string,
  theme: string = "culture",
  mode: "daily" | "training" = "daily",
  seed?: string
): Promise<ChallengeData> {
  let url = `${API_URL}/api/challenge?lang=${lang}&theme=${theme}&mode=${mode}`;
  if (seed) url += `&seed=${encodeURIComponent(seed)}`;
  const res = await fetch(url, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Erreur chargement défi");
  return res.json();
}

export async function submitGuess(
  guess: string,
  lang: string,
  sessionId: string,
  theme: string = "culture",
  challengeId?: string
): Promise<GuessResult> {
  const res = await fetch(`${API_URL}/api/guess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      guess,
      lang,
      session_id: sessionId,
      theme,
      challenge_id: challengeId,
    }),
  });
  if (!res.ok) throw new Error("Erreur soumission réponse");
  return res.json();
}

export async function fetchLeaderboard(
  lang: string
): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${API_URL}/api/leaderboard?lang=${lang}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.scores || [];
}

export async function submitFinalScore(
  playerName: string,
  lang: string,
  points: number,
  wordsFound: number,
  livesRemaining: number
): Promise<{ success: boolean; rank: number }> {
  const res = await fetch(`${API_URL}/api/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      player_name: playerName,
      lang,
      points,
      words_found: wordsFound,
      lives_remaining: livesRemaining,
    }),
  });
  if (!res.ok) return { success: false, rank: 0 };
  return res.json();
}

export async function fetchNextChallengeTimer(): Promise<{
  seconds_remaining: number;
  formatted: string;
}> {
  const res = await fetch(`${API_URL}/api/next-challenge`);
  if (!res.ok) return { seconds_remaining: 86400, formatted: "24h00m" };
  return res.json();
}

export async function revealFullTop10(lang: string, theme: string = "culture", challengeId?: string) {
  let url = `${API_URL}/api/reveal-top10?lang=${lang}&theme=${theme}`;
  if (challengeId) url += `&challenge_id=${encodeURIComponent(challengeId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erreur révélation Top 10");
  return res.json();
}

export async function regenerateAICatalog(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/api/admin/regenerate`, { method: "POST" });
  if (!res.ok) throw new Error("Erreur régénération catalogue");
  return res.json();
}

/** Détecte la langue du navigateur (2 lettres) */
export function detectLanguage(): string {
  if (typeof window === "undefined") return "fr";
  const browserLang = navigator.language?.slice(0, 2).toLowerCase();
  const supported = ["fr", "en", "es", "de", "it", "pt"];
  return supported.includes(browserLang) ? browserLang : "en";
}

/** Génère un ID de session simple */
export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem("vw_session_id");
  if (!id) {
    id = `vw_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("vw_session_id", id);
  }
  return id;
}

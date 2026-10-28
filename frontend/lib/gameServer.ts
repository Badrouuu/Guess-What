import crypto from "crypto";
import cultureData from "@/data/verified_challenges_culture.json";
import gamingData from "@/data/verified_challenges_gaming.json";
import cinemaData from "@/data/verified_challenges_cinema.json";
import foodData from "@/data/verified_challenges_food.json";

export interface ChallengeEntry {
  id: string;
  theme: string;
  word_a: string;
  word_b: string;
  word_c: string;
  answer: string;
  category: string;
  difficulty: number;
  top10: {
    rank: number;
    word: string;
    similarity: number;
    points: number;
  }[];
  total_possible_points: number;
  _target_vec?: number[];
  date?: string;
}

const CATALOGS: Record<string, Record<string, ChallengeEntry>> = {
  culture: cultureData as unknown as Record<string, ChallengeEntry>,
  gaming: gamingData as unknown as Record<string, ChallengeEntry>,
  cinema: cinemaData as unknown as Record<string, ChallengeEntry>,
  food: foodData as unknown as Record<string, ChallengeEntry>,
};

export function cleanText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getTodayUtc(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

export function getCatalog(theme: string = "culture"): Record<string, ChallengeEntry> {
  const t = theme.toLowerCase().trim();
  return CATALOGS[t] || CATALOGS.culture;
}

export function getChallengeById(challengeId: string, theme: string = "culture"): ChallengeEntry | null {
  const catalog = getCatalog(theme);
  return catalog[challengeId] || null;
}

export function getDailyChallenge(theme: string = "culture", dateStr: string = getTodayUtc()): ChallengeEntry {
  const catalog = getCatalog(theme);
  const items = Object.values(catalog);
  if (items.length === 0) {
    throw new Error(`Catalogue vide pour le thème: ${theme}`);
  }
  const hash = crypto.createHash("sha256").update(dateStr + theme).digest("hex");
  const idx = parseInt(hash.slice(0, 8), 16) % items.length;
  const challenge = { ...items[idx] };
  challenge.date = dateStr;
  return challenge;
}

export function getChallengePublic(
  lang: string = "fr",
  theme: string = "culture",
  mode: "daily" | "training" = "daily",
  seed?: string | null
) {
  let challenge: ChallengeEntry;
  const today = getTodayUtc();

  if (mode === "training") {
    const catalog = getCatalog(theme);
    const items = Object.values(catalog);
    if (seed) {
      const hash = crypto.createHash("sha256").update(String(seed)).digest("hex");
      const idx = parseInt(hash.slice(0, 8), 16) % items.length;
      challenge = { ...items[idx] };
    } else {
      const idx = Math.floor(Math.random() * items.length);
      challenge = { ...items[idx] };
    }
  } else {
    challenge = getDailyChallenge(theme, today);
  }

  const answerWord = challenge.answer || "";

  return {
    id: challenge.id,
    date: challenge.date || today,
    lang,
    theme: challenge.theme,
    word_a: challenge.word_a,
    word_b: challenge.word_b,
    word_c: challenge.word_c,
    category: challenge.category,
    difficulty: challenge.difficulty,
    answer_length: answerWord.length,
    first_letter: answerWord ? answerWord[0].toUpperCase() : "",
    top10: challenge.top10.map((card) => ({
      rank: card.rank,
      points: card.points,
      revealed: false,
    })),
    total_possible_points: challenge.total_possible_points,
  };
}

export function scorePlayerGuess(
  guess: string,
  theme: string = "culture",
  challengeId?: string | null
) {
  let challenge: ChallengeEntry | null = null;
  if (challengeId) {
    challenge = getChallengeById(challengeId, theme);
  }
  if (!challenge) {
    challenge = getDailyChallenge(theme);
  }

  const cleanGuess = cleanText(guess);

  // Vérifier si le mot correspond à une carte du Top 10
  for (const card of challenge.top10) {
    if (cleanText(card.word) === cleanGuess) {
      return {
        in_top10: true,
        rank: card.rank,
        points: card.points,
        similarity: card.similarity,
        feedback: card.rank === 1 ? "exact" : "hot",
        revealed_word: card.word,
      };
    }
  }

  return {
    in_top10: false,
    rank: null,
    points: 0,
    similarity: 0.0,
    feedback: "cold",
    revealed_word: null,
  };
}

export function getFullReveal(theme: string = "culture", challengeId?: string | null) {
  let challenge: ChallengeEntry | null = null;
  if (challengeId) {
    challenge = getChallengeById(challengeId, theme);
  }
  if (!challenge) {
    challenge = getDailyChallenge(theme);
  }

  return {
    top10: challenge.top10,
    word_a: challenge.word_a,
    word_b: challenge.word_b,
    word_c: challenge.word_c,
    answer: challenge.answer,
  };
}

export function getSecondsUntilMidnight(): { seconds_remaining: number; formatted: string } {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const diffSec = Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);

  return {
    seconds_remaining: diffSec,
    formatted: `${hours.toString().padStart(2, "0")}h${minutes.toString().padStart(2, "0")}m`,
  };
}

"use client";

/**
 * firebaseAuth.ts — Gestion de l'authentification et du profil joueur.
 * 
 * Conçu avec Firebase Auth REST API :
 * - Fonctionne nativement avec un projet Firebase dès que NEXT_PUBLIC_FIREBASE_API_KEY est défini.
 * - Dispose d'un fallback LocalStorage 100% fonctionnel pour jouer immédiatement sans clé.
 */

export interface PlayerProfile {
  uid: string;
  email?: string;
  displayName: string;
  photoURL: string; // Avatar (Emoji ou URL)
  streak: number; // Série de victoires consécutives
  bestStreak: number;
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
  lastPlayedDate?: string;
}

const STORAGE_KEY = "vw_player_profile";

const DEFAULT_PROFILE: PlayerProfile = {
  uid: "guest_" + Math.random().toString(36).slice(2, 9),
  displayName: "Joueur",
  photoURL: "👑",
  streak: 0,
  bestStreak: 0,
  totalScore: 0,
  gamesPlayed: 0,
  gamesWon: 0,
};

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";

/** Charge le profil du joueur (Firebase ou LocalStorage) */
export function getStoredProfile(): PlayerProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error("Erreur lecture profil:", e);
  }
  return DEFAULT_PROFILE;
}

/** Sauvegarde le profil localement */
export function saveStoredProfile(profile: PlayerProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error("Erreur écriture profil:", e);
  }
}

/** Met à jour la série de victoires (Streak) lors d'un succès */
export function recordWin(pointsEarned: number): PlayerProfile {
  const profile = getStoredProfile();
  const today = new Date().toISOString().slice(0, 10);

  let newStreak = profile.streak;
  if (profile.lastPlayedDate !== today) {
    newStreak += 1;
  }

  const updated: PlayerProfile = {
    ...profile,
    streak: newStreak,
    bestStreak: Math.max(profile.bestStreak, newStreak),
    totalScore: profile.totalScore + pointsEarned,
    gamesPlayed: profile.gamesPlayed + 1,
    gamesWon: profile.gamesWon + 1,
    lastPlayedDate: today,
  };

  saveStoredProfile(updated);
  return updated;
}

/** Enregistre une défaite et remet la série à 0 */
export function recordLoss(): PlayerProfile {
  const profile = getStoredProfile();
  const today = new Date().toISOString().slice(0, 10);

  const updated: PlayerProfile = {
    ...profile,
    streak: 0,
    gamesPlayed: profile.gamesPlayed + 1,
    lastPlayedDate: today,
  };

  saveStoredProfile(updated);
  return updated;
}

/** Connexion / Inscription Firebase REST (si la clé API est fournie) */
export async function authenticateWithFirebase(
  mode: "signIn" | "signUp",
  email: string,
  pass: string
): Promise<{ success: boolean; error?: string }> {
  if (!FIREBASE_API_KEY) {
    // Mode local / Simulation
    const profile = getStoredProfile();
    const updated = {
      ...profile,
      email,
      displayName: email.split("@")[0] || "Joueur",
    };
    saveStoredProfile(updated);
    return { success: true };
  }

  const endpoint =
    mode === "signUp"
      ? `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`
      : `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error?.message || "Erreur d'authentification" };
    }

    const current = getStoredProfile();
    const updated: PlayerProfile = {
      ...current,
      uid: data.localId,
      email: data.email,
      displayName: data.displayName || email.split("@")[0],
    };
    saveStoredProfile(updated);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

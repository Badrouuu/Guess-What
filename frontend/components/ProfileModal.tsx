"use client";

import { useState } from "react";
import {
  PlayerProfile,
  authenticateWithFirebase,
  saveStoredProfile,
} from "@/lib/firebaseAuth";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  onProfileUpdate: (updated: PlayerProfile) => void;
}

const AVATARS = ["👑", "🤖", "🎮", "🍕", "🧙‍♂️", "🦁", "🚀", "🦊", "🥋", "🐱", "🏆", "💎"];

export default function ProfileModal({
  isOpen,
  onClose,
  profile,
  onProfileUpdate,
}: ProfileModalProps) {
  const [tab, setTab] = useState<"stats" | "account">("stats");
  const [name, setName] = useState(profile.displayName);
  const [selectedAvatar, setSelectedAvatar] = useState(profile.photoURL);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signIn" | "signUp">("signIn");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = () => {
    const updated = {
      ...profile,
      displayName: name.trim() || "Joueur",
      photoURL: selectedAvatar,
    };
    saveStoredProfile(updated);
    onProfileUpdate(updated);
    onClose();
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);
    const res = await authenticateWithFirebase(authMode, email, password);
    setLoading(false);
    if (res.success) {
      const updated = {
        ...profile,
        email,
        displayName: email.split("@")[0],
      };
      onProfileUpdate(updated);
      setTab("stats");
    } else {
      setAuthError(res.error || "Erreur de connexion");
    }
  };

  const winRate =
    profile.gamesPlayed > 0
      ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header Tabs */}
        <div className="flex border-b border-gray-800 bg-black/40">
          <button
            onClick={() => setTab("stats")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              tab === "stats"
                ? "text-yellow-400 border-b-2 border-yellow-400 bg-yellow-500/5"
                : "text-gray-400 hover:text-white"
            }`}
          >
            👤 Mon Profil & Série
          </button>
          <button
            onClick={() => setTab("account")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              tab === "account"
                ? "text-yellow-400 border-b-2 border-yellow-400 bg-yellow-500/5"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🔥 Firebase Connexion
          </button>
          <button
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tab 1 : Stats & Personnalisation */}
        {tab === "stats" && (
          <div className="p-6 flex flex-col gap-5">
            {/* Badge Streak */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 border border-orange-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl animate-bounce">🔥</span>
                <div>
                  <p className="text-[10px] text-orange-400 uppercase font-black tracking-widest">
                    Série de victoires (Streak)
                  </p>
                  <p className="text-2xl font-black text-white">
                    {profile.streak} <span className="text-xs text-gray-400 font-normal">jours consécutifs</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Record</p>
                <p className="text-sm font-black text-yellow-400">{profile.bestStreak} jours</p>
              </div>
            </div>

            {/* Statistiques Rapides */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-gray-900/80 border border-gray-800 rounded-xl">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Parties</p>
                <p className="text-base font-black text-white mt-0.5">{profile.gamesPlayed}</p>
              </div>
              <div className="p-3 bg-gray-900/80 border border-gray-800 rounded-xl">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Victoires</p>
                <p className="text-base font-black text-green-400 mt-0.5">{winRate}%</p>
              </div>
              <div className="p-3 bg-gray-900/80 border border-gray-800 rounded-xl">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Points</p>
                <p className="text-base font-black text-yellow-400 mt-0.5">{profile.totalScore.toLocaleString()}</p>
              </div>
            </div>

            {/* Modification Pseudo & Avatar */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                Pseudo du joueur :
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 20))}
                className="px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-white text-sm focus:outline-none focus:border-yellow-500"
                placeholder="Ton pseudo..."
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                Choisis ton Avatar :
              </label>
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    onClick={() => setSelectedAvatar(av)}
                    className={`h-10 text-xl rounded-xl flex items-center justify-center transition-all ${
                      selectedAvatar === av
                        ? "bg-yellow-500/20 border-2 border-yellow-400 scale-110 shadow-lg shadow-yellow-500/20"
                        : "bg-gray-900 border border-gray-800 hover:bg-gray-800"
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              className="mt-2 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-500/20"
            >
              Enregistrer mon profil
            </button>
          </div>
        )}

        {/* Tab 2 : Firebase Connexion */}
        {tab === "account" && (
          <form onSubmit={handleAuth} className="p-6 flex flex-col gap-4">
            <div className="text-center">
              <span className="text-3xl">🔥</span>
              <h3 className="text-sm font-black text-white uppercase mt-1">
                {authMode === "signIn" ? "Connexion Firebase" : "Créer un compte"}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Sauvegarde ta série et synchronise tes victoires sur tous tes appareils.
              </p>
            </div>

            {authError && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/60 p-2 rounded-lg text-center">
                {authError}
              </p>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-gray-400 uppercase font-bold">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@exemple.com"
                className="px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-white text-sm focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-gray-400 uppercase font-bold">Mot de passe</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-white text-sm focus:outline-none focus:border-yellow-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
            >
              {loading
                ? "Connexion..."
                : authMode === "signIn"
                ? "Se connecter"
                : "Créer un compte"}
            </button>

            <p className="text-center text-xs text-gray-400">
              {authMode === "signIn" ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
              <button
                type="button"
                onClick={() => setAuthMode((m) => (m === "signIn" ? "signUp" : "signIn"))}
                className="text-yellow-400 font-bold hover:underline"
              >
                {authMode === "signIn" ? "S'inscrire" : "Se connecter"}
              </button>
            </p>
          </form>
        )}

      </div>
    </div>
  );
}

"""
main.py — API FastAPI pour VectorWord

Routes :
  GET  /                          → health check
  GET  /api/challenge             → défi du jour (sans spoiler)
  POST /api/guess                 → évaluer une réponse
  GET  /api/leaderboard           → top scores du jour
  POST /api/score                 → soumettre un score final
  GET  /api/next-challenge        → secondes avant le prochain défi
"""

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from models.challenge import (
    get_challenge_by_id,
    get_challenge_public,
    get_daily_challenge,
    get_vectors,
    seconds_until_midnight,
)
from models.embeddings import cosine_similarity, score_guess

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Pré-chargement au démarrage ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pré-charge les vecteurs et défis au démarrage du serveur."""
    logger.info("🚀 Démarrage VectorWord API...")
    for lang in ["fr", "en"]:
        try:
            logger.info(f"Pré-chargement vecteurs {lang}...")
            get_vectors(lang)
            get_daily_challenge(lang)
            logger.info(f"✅ {lang} prêt")
        except Exception as e:
            logger.error(f"❌ Erreur chargement {lang}: {e}")
    logger.info("✅ API prête !")
    yield
    logger.info("👋 Arrêt API")


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="VectorWord API",
    description="API pour le jeu VectorWord — analogies Word2Vec style Ma Famille en Or",
    version="1.0.0",
    lifespan=lifespan
)

# CORS — permet au frontend Vercel d'appeler l'API Railway
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ─── Modèles Pydantic ─────────────────────────────────────────────────────────
class GuessRequest(BaseModel):
    guess: str = Field(..., min_length=1, max_length=50, description="Mot proposé par le joueur")
    lang: str = Field(default="fr", min_length=2, max_length=5)
    session_id: str = Field(default="anonymous", description="ID de session du joueur")
    theme: str = Field(default="culture")
    challenge_id: str | None = Field(default=None)


class ScoreRequest(BaseModel):
    player_name: str = Field(..., min_length=1, max_length=30)
    lang: str = Field(default="fr")
    points: int = Field(..., ge=0)
    words_found: int = Field(..., ge=0, le=10)
    lives_remaining: int = Field(..., ge=0, le=10)


# ─── Rate limiting simple (sans Redis) ────────────────────────────────────────
_rate_limit_store: dict[str, list[float]] = {}

def check_rate_limit(ip: str, max_requests: int = 30, window: int = 60) -> bool:
    """Rate limit: max 30 requêtes par minute par IP."""
    import time
    now = time.time()
    if ip not in _rate_limit_store:
        _rate_limit_store[ip] = []
    # Nettoyage des vieilles entrées
    _rate_limit_store[ip] = [t for t in _rate_limit_store[ip] if now - t < window]
    if len(_rate_limit_store[ip]) >= max_requests:
        return False
    _rate_limit_store[ip].append(now)
    return True


# ─── Routes ───────────────────────────────────────────────────────────────────
@app.get("/")
async def health_check():
    """Health check — vérifié par Railway pour le déploiement."""
    return {
        "status": "ok",
        "service": "VectorWord API",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0"
    }


@app.get("/api/challenge")
async def get_challenge(
    request: Request,
    lang: str = "fr",
    theme: str = "culture",
    mode: str = "daily",
    seed: str | None = None
):
    """
    Retourne le défi (quotidien ou entraînement) pour une langue et un thème donnés.
    Le Top 10 est retourné avec les mots cachés.
    """
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Trop de requêtes. Attends 1 minute.")
    
    try:
        challenge = get_challenge_public(lang=lang, theme=theme, mode=mode, seed=seed)
        return challenge
    except Exception as e:
        logger.error(f"Erreur /api/challenge: {e}")
        raise HTTPException(status_code=500, detail="Erreur serveur")


@app.post("/api/guess")
async def evaluate_guess(request: Request, body: GuessRequest):
    """
    Évalue une réponse du joueur.
    """
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip, max_requests=60):
        raise HTTPException(status_code=429, detail="Trop de requêtes.")
    
    try:
        lang = body.lang.lower()[:2]
        theme = body.theme.lower().strip()
        if body.challenge_id:
            challenge = get_challenge_by_id(body.challenge_id, lang, theme)
        else:
            challenge = get_daily_challenge(lang, theme)
        vectors = get_vectors(lang)
        
        target_vec = np.array(challenge["_target_vec"])
        top10 = challenge["top10"]
        
        result = score_guess(body.guess, target_vec, top10, vectors)
        
        # Si trouvé dans le Top 10, on révèle le mot exact (avec accent, casse correcte)
        if result["in_top10"]:
            rank = result["rank"]
            revealed = next(
                (item["word"] for item in top10 if item["rank"] == rank),
                body.guess
            )
            result["revealed_word"] = revealed
        else:
            result["revealed_word"] = None
        
        logger.info(
            f"Guess: '{body.guess}' | in_top10: {result['in_top10']} | "
            f"sim: {result['similarity']:.3f} | lang: {lang} | theme: {theme}"
        )
        
        return result
    
    except Exception as e:
        logger.error(f"Erreur /api/guess: {e}")
        raise HTTPException(status_code=500, detail="Erreur serveur")


@app.get("/api/leaderboard")
async def get_leaderboard(lang: str = "fr", limit: int = 10):
    """
    Retourne le classement du jour.
    MVP : stocké en mémoire (Redis ou Supabase en production).
    """
    # TODO Phase 2: remplacer par Supabase
    return {
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "lang": lang,
        "scores": _in_memory_scores.get(lang, [])[:limit]
    }


@app.post("/api/score")
async def submit_score(request: Request, body: ScoreRequest):
    """Soumet le score final d'une partie."""
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip, max_requests=5, window=300):
        raise HTTPException(status_code=429, detail="Trop de soumissions.")
    
    lang = body.lang.lower()[:2]
    entry = {
        "player_name": body.player_name[:30],
        "points": body.points,
        "words_found": body.words_found,
        "lives_remaining": body.lives_remaining,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    if lang not in _in_memory_scores:
        _in_memory_scores[lang] = []
    
    _in_memory_scores[lang].append(entry)
    _in_memory_scores[lang].sort(key=lambda x: x["points"], reverse=True)
    _in_memory_scores[lang] = _in_memory_scores[lang][:100]  # garde top 100
    
    return {"success": True, "rank": _get_rank(body.points, lang)}


@app.get("/api/next-challenge")
async def next_challenge_timer():
    """Retourne les secondes restantes avant le prochain défi."""
    seconds = seconds_until_midnight()
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    return {
        "seconds_remaining": seconds,
        "formatted": f"{hours:02d}h{minutes:02d}m"
    }


@app.get("/api/reveal-top10")
async def reveal_top10(lang: str = "fr", theme: str = "culture", challenge_id: str | None = None):
    """
    Révèle le Top 10 complet — appelé uniquement en fin de partie.
    """
    try:
        if challenge_id:
            challenge = get_challenge_by_id(challenge_id, lang, theme)
        else:
            challenge = get_daily_challenge(lang, theme)
        return {
            "top10": challenge["top10"],
            "word_a": challenge["word_a"],
            "word_b": challenge["word_b"],
            "word_c": challenge["word_c"],
            "answer": challenge.get("answer", ""),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/regenerate")
async def admin_regenerate():
    """Régénère le catalogue complet des analogies via auto_analogy_engine."""
    try:
        from scripts.auto_analogy_engine import build_all_themes
        from models.challenge import _challenge_cache
        build_all_themes()
        _challenge_cache.clear()
        return {"success": True, "message": "Catalogue IA régénéré avec succès !"}
    except Exception as e:
        logger.error(f"Erreur /api/admin/regenerate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Stockage in-memory (MVP) ─────────────────────────────────────────────────
# Phase 2 : migrer vers Supabase
_in_memory_scores: dict[str, list[dict]] = {}


def _get_rank(points: int, lang: str) -> int:
    """Retourne le rang du joueur dans le classement du jour."""
    scores = _in_memory_scores.get(lang, [])
    return next((i + 1 for i, s in enumerate(scores) if s["points"] == points), len(scores))

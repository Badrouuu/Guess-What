"""
challenge.py — Gestion des défis quotidiens

Logique :
- Seed = date du jour → même défi pour tout le monde dans le monde
- Sélection déterministe de l'analogie selon la date
- Pré-calcul du Top 10 une seule fois par jour
- Cache en mémoire pour éviter les recalculs
"""

import json
import hashlib
import logging
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Optional
import numpy as np

from models.embeddings import (
    load_conceptnet_vectors,
    compute_analogy_vector,
    get_top_n_similar,
)

logger = logging.getLogger(__name__)

# Cache en mémoire : {(date_str, lang): challenge_data}
_challenge_cache: dict[tuple[str, str], dict] = {}
_vectors_cache: dict[str, dict[str, np.ndarray]] = {}

SUPPORTED_LANGS = ["fr", "en", "es", "de", "it", "pt"]
DATA_DIR = Path(__file__).parent.parent / "data"


def get_today_str() -> str:
    """Retourne la date du jour en UTC au format YYYY-MM-DD."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def get_vectors(lang: str) -> dict[str, np.ndarray]:
    """Charge les vecteurs pour une langue (avec cache)."""
    if lang not in _vectors_cache:
        logger.info(f"Chargement vecteurs langue: {lang}")
        _vectors_cache[lang] = load_conceptnet_vectors(lang)
    return _vectors_cache[lang]


def load_analogies(lang: str) -> list[dict]:
    """Charge la liste d'analogies pour une langue."""
    # Fallback: si la langue n'a pas de fichier, on prend l'anglais
    lang_path = DATA_DIR / f"analogies_{lang}.json"
    fallback_path = DATA_DIR / "analogies_en.json"
    
    path = lang_path if lang_path.exists() else fallback_path
    
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


SUPPORTED_THEMES = ["culture", "gaming", "cinema", "food"]


def load_verified_catalog(lang: str, theme: str = "culture") -> dict[str, dict]:
    """Charge le catalogue pré-calculé pour une langue et un thème."""
    # Si un thème spécifique est demandé
    if theme in ["culture", "gaming", "cinema", "food"]:
        theme_path = DATA_DIR / f"verified_challenges_{theme}.json"
        if theme_path.exists():
            with open(theme_path, "r", encoding="utf-8") as f:
                return json.load(f)
    
    # Par défaut : catalogue général de la langue
    verified_path = DATA_DIR / f"verified_challenges_{lang}.json"
    if verified_path.exists():
        with open(verified_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def select_daily_analogy(analogies: list[dict], date_str: str) -> dict:
    """
    Sélectionne l'analogie du jour de façon déterministe.
    Utilise un hash de la date comme seed → même résultat partout dans le monde.
    """
    seed = int(hashlib.sha256(date_str.encode()).hexdigest(), 16) % (2**32)
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, len(analogies))
    return analogies[int(idx)]


def build_challenge(analogy: dict, lang: str, date_str: str, theme: str = "culture") -> dict:
    """
    Construit le défi complet avec Top 10 vérifié pour un thème donné.
    """
    catalog = load_verified_catalog(lang, theme)
    aid = analogy.get("id")
    
    if aid and aid in catalog:
        verified = dict(catalog[aid])
        verified["date"] = date_str
        verified["theme"] = theme
        return verified

    # Fallback dynamique par calcul vectoriel
    vectors = get_vectors(lang)
    word_a = analogy["word_a"]
    word_b = analogy["word_b"]
    word_c = analogy["word_c"]
    
    target_vec = compute_analogy_vector(word_a, word_b, word_c, vectors)
    if target_vec is None:
        return _build_fallback_challenge(lang, date_str)
    
    exclude_words = [word_a, word_b, word_c]
    top10 = get_top_n_similar(target_vec, vectors, n=10, exclude=exclude_words)
    total_points = sum(item["points"] for item in top10)
    
    return {
        "date": date_str,
        "lang": lang,
        "theme": theme,
        "word_a": word_a,
        "word_b": word_b,
        "word_c": word_c,
        "answer": analogy.get("answer", top10[0]["word"] if top10 else "?"),
        "category": analogy.get("category", theme),
        "difficulty": analogy.get("difficulty", 2),
        "top10": top10,
        "total_possible_points": total_points,
        "_target_vec": target_vec.tolist()
    }


def _build_fallback_challenge(lang: str, date_str: str) -> dict:
    """Défi de secours en cas d'erreur."""
    return {
        "date": date_str,
        "lang": lang,
        "theme": "culture",
        "word_a": "roi" if lang == "fr" else "king",
        "word_b": "homme" if lang == "fr" else "man",
        "word_c": "femme" if lang == "fr" else "woman",
        "answer": "reine" if lang == "fr" else "queen",
        "category": "royauté" if lang == "fr" else "royalty",
        "difficulty": 1,
        "top10": [],
        "total_possible_points": 4750,
        "_target_vec": []
    }


def get_daily_challenge(lang: str = "fr", theme: str = "culture", date_str: Optional[str] = None) -> dict:
    """
    Point d'entrée principal — retourne le défi du jour pour une langue et un thème.
    """
    if date_str is None:
        date_str = get_today_str()
    
    lang = lang.lower()[:2]
    if lang not in SUPPORTED_LANGS:
        lang = "en"
    
    theme = theme.lower().strip()
    if theme not in SUPPORTED_THEMES:
        theme = "culture"
    
    cache_key = (date_str, lang, theme)
    
    if cache_key not in _challenge_cache:
        logger.info(f"Génération défi {date_str} [{lang}] [Thème: {theme}]")
        catalog = load_verified_catalog(lang, theme)
        if catalog:
            analogies = list(catalog.values())
        else:
            analogies = load_analogies(lang)
            
        analogy = select_daily_analogy(analogies, date_str + theme)
        challenge = build_challenge(analogy, lang, date_str, theme)
        _challenge_cache[cache_key] = challenge
    
    return _challenge_cache[cache_key]


def get_challenge_by_id(challenge_id: str, lang: str = "fr", theme: str = "culture") -> dict:
    """Récupère un défi précis par son identifiant unique."""
    catalog = load_verified_catalog(lang, theme)
    if challenge_id in catalog:
        date_str = get_today_str()
        return build_challenge(catalog[challenge_id], lang, date_str, theme)
    return get_daily_challenge(lang, theme)


def get_challenge_public(lang: str = "fr", theme: str = "culture", mode: str = "daily", seed: Optional[str] = None) -> dict:
    """
    Version publique du défi (quotidien ou entraînement).
    Omet le mot cible pour éviter les spoils, mais fournit answer_length et first_letter pour les indices.
    """
    if mode == "training":
        catalog = load_verified_catalog(lang, theme)
        if catalog:
            items = list(catalog.values())
            if seed:
                idx = int(hashlib.sha256(str(seed).encode()).hexdigest(), 16) % len(items)
            else:
                idx = int(np.random.randint(0, len(items)))
            analogy = items[idx]
        else:
            analogy = select_daily_analogy(load_analogies(lang), get_today_str() + (seed or "train"))
        challenge = build_challenge(analogy, lang, get_today_str(), theme)
    else:
        challenge = get_daily_challenge(lang, theme)

    answer_word = challenge.get("answer", "")
    public = {k: v for k, v in challenge.items() if not k.startswith("_") and k != "answer"}
    public["id"] = challenge.get("id", "daily")
    public["answer_length"] = len(answer_word)
    public["first_letter"] = answer_word[0].upper() if answer_word else ""
    public["top10"] = [
        {"rank": item["rank"], "points": item["points"], "revealed": False}
        for item in challenge["top10"]
    ]
    return public


def seconds_until_midnight() -> int:
    """Calcule les secondes restantes jusqu'à minuit UTC."""
    now = datetime.now(timezone.utc)
    tomorrow = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    from datetime import timedelta
    tomorrow += timedelta(days=1)
    return int((tomorrow - now).total_seconds())

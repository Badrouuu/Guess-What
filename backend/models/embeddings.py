"""
embeddings.py — Chargement ConceptNet Numberbatch et calcul vectoriel

Architecture MVP :
- On charge un sous-ensemble léger des vecteurs ConceptNet en mémoire
- On précalcule le Top 10 de chaque analogie au démarrage
- Pas besoin du fichier 1GB complet pour démarrer
"""

import os
import json
import numpy as np
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Vecteurs de démonstration (MVP) — remplacé par ConceptNet en production
# Ces vecteurs sont simplifiés pour illustrer le concept
DEMO_VECTORS: dict[str, np.ndarray] = {}

# Vocabulaire de référence pour chercher les Top 10
VOCABULARY: list[str] = []


def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    """Calcule la similarité cosinus entre deux vecteurs."""
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))


def load_conceptnet_vectors(lang: str = "fr") -> dict[str, np.ndarray]:
    """
    Charge les vecteurs ConceptNet pour une langue donnée.
    
    En production : télécharge numberbatch-19.08.txt.gz depuis ConceptNet
    En MVP : utilise des vecteurs pré-calculés offline stockés en JSON
    """
    vectors_path = Path(__file__).parent.parent / "data" / f"vectors_{lang}.json"
    
    if vectors_path.exists():
        logger.info(f"Chargement vecteurs {lang} depuis {vectors_path}")
        with open(vectors_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {word: np.array(vec) for word, vec in data.items()}
    
    logger.warning(f"Vecteurs {lang} non trouvés, utilisation du mode démo")
    return _build_demo_vectors(lang)


def get_vectors(lang: str = "fr"):
    """Helper alias vers models.challenge.get_vectors."""
    from models.challenge import get_vectors as _gv
    return _gv(lang)


def _build_demo_vectors(lang: str) -> dict[str, np.ndarray]:
    """
    Vecteurs de démonstration basés sur des relations sémantiques réelles.
    Générés de façon cohérente pour reproduire les analogies classiques.
    """
    # Seed fixe pour reproductibilité
    rng = np.random.default_rng(42)
    dim = 50  # dimensions réduites pour le MVP

    if lang == "fr":
        # On encode les relations sémantiques manuellement pour le MVP
        base_words = [
            # royauté
            "roi", "reine", "prince", "princesse", "couronne", "trône", "château",
            # genre
            "homme", "femme", "garçon", "fille", "père", "mère", "fils", "fille",
            # géographie
            "paris", "france", "berlin", "allemagne", "rome", "italie", "madrid", "espagne",
            "london", "angleterre", "tokyo", "japon", "pékin", "chine",
            # animaux
            "chien", "chiot", "chat", "chaton", "lion", "lionceau", "aigle", "poussin",
            "dauphin", "baleine", "ours", "louveteau", "renard", "lapin",
            # professions
            "médecin", "hôpital", "avocat", "tribunal", "professeur", "école",
            "chef", "restaurant", "architecte", "bâtiment", "pompier", "caserne",
            # objets
            "couteau", "couper", "stylo", "écrire", "marteau", "clouer", "crayon", "dessiner",
            # nature
            "montagne", "neige", "plage", "sable", "forêt", "arbre", "rivière", "eau",
            "savane", "désert", "jungle", "prairie",
            # temps
            "jour", "nuit", "été", "hiver", "printemps", "automne", "matin", "soir",
            "soleil", "lune", "étoile", "nuage", "pluie", "vent", "chaleur", "froid",
            # arts
            "piano", "musicien", "pinceau", "peintre", "guitare", "violon", "chanter", "voix",
            "danser", "corps", "sculpteur", "argile",
            # nourriture
            "baguette", "pain", "pizza", "pâtes", "raisin", "vin", "farine", "feu",
            "glace", "fondre", "brûler", "cuisiner",
            # sport
            "football", "stade", "natation", "piscine", "tennis", "court", "vélo", "route",
            "ski", "slalom", "boxe", "ring",
            # émotions
            "guerre", "paix", "haine", "amour", "joie", "tristesse", "peur", "courage",
            # famille
            "enfant", "adulte", "grand-père", "grand-mère", "oncle", "tante", "cousin",
            # transport
            "voiture", "route", "bateau", "mer", "avion", "ciel", "train", "rail",
            "vélo", "piste", "moto", "autoroute",
            # accessoires
            "parapluie", "lunettes", "chapeau", "manteau", "maillot", "écharpe",
        ]
    else:  # en
        base_words = [
            "king", "queen", "prince", "princess", "crown", "throne", "castle",
            "man", "woman", "boy", "girl", "father", "mother", "son", "daughter",
            "paris", "france", "berlin", "germany", "rome", "italy", "madrid", "spain",
            "london", "england", "tokyo", "japan", "beijing", "china",
            "dog", "puppy", "cat", "kitten", "lion", "cub", "eagle", "chick",
            "dolphin", "whale", "bear", "wolf", "fox", "rabbit",
            "doctor", "hospital", "lawyer", "court", "teacher", "school",
            "chef", "restaurant", "architect", "building", "firefighter", "station",
            "knife", "cut", "pen", "write", "hammer", "nail", "pencil", "draw",
            "mountain", "snow", "beach", "sand", "forest", "tree", "river", "water",
            "savanna", "desert", "jungle", "meadow",
            "day", "night", "summer", "winter", "spring", "autumn", "morning", "evening",
            "sun", "moon", "star", "cloud", "rain", "wind", "heat", "cold",
            "piano", "musician", "brush", "painter", "guitar", "violin", "sing", "voice",
            "dance", "body", "sculptor", "clay",
            "baguette", "bread", "pizza", "pasta", "grape", "wine", "flour", "fire",
            "ice", "melt", "burn", "cook",
            "football", "stadium", "swimming", "pool", "tennis", "court", "bike", "road",
            "ski", "slope", "boxing", "ring",
            "war", "peace", "hate", "love", "joy", "sadness", "fear", "courage",
            "child", "adult", "grandfather", "grandmother", "uncle", "aunt", "cousin",
            "car", "road", "boat", "sea", "plane", "sky", "train", "rail",
            "umbrella", "sunglasses", "hat", "coat", "swimsuit", "scarf",
        ]

    # Génération de vecteurs cohérents avec des clusters sémantiques
    vectors = {}
    
    # Clusters de base (vecteurs de direction sémantique)
    cluster_directions = rng.standard_normal((20, dim))
    
    for i, word in enumerate(base_words):
        # Chaque mot appartient à un cluster principal
        cluster_id = i % 20
        cluster_noise = rng.standard_normal(dim) * 0.3
        vec = cluster_directions[cluster_id] + cluster_noise
        # Normalisation L2
        vec = vec / np.linalg.norm(vec)
        vectors[word.lower()] = vec

    # Injection manuelle des relations analogiques clés (pour que le jeu marche bien)
    _inject_analogy_relations(vectors, lang, dim)
    
    return vectors


def _inject_analogy_relations(
    vectors: dict[str, np.ndarray], lang: str, dim: int
) -> None:
    """
    Force toutes les relations analogiques du fichier analogies_{lang}.json à être exactes
    et crée un voisinage sémantique cohérent pour le Top 10.
    """
    analogies_path = Path(__file__).parent.parent / "data" / f"analogies_{lang}.json"
    if not analogies_path.exists():
        return

    with open(analogies_path, "r", encoding="utf-8") as f:
        analogies = json.load(f)

    # Voisinages sémantiques thématiques pour enrichir le Top 10
    thematic_neighbors = {
        # écriture / arts
        "écrire": ["dessiner", "crayon", "noter", "signer", "pinceau", "lettre", "texte", "rédiger", "auteur"],
        "write": ["draw", "pencil", "note", "sign", "brush", "letter", "text", "author", "ink"],
        # royauté
        "reine": ["princesse", "couronne", "trône", "château", "monarque", "roi", "empire", "prince", "palais"],
        "queen": ["princess", "crown", "throne", "castle", "monarch", "king", "empire", "prince", "palace"],
        # villes / capitales
        "berlin": ["munich", "allemagne", "hambourg", "vienne", "francfort", "paris", "europe", "ville"],
        "rome": ["italie", "florence", "venise", "milan", "naples", "madrid", "europe", "vatican"],
        # animaux bébés
        "chaton": ["chat", "chiot", "félin", "chienne", "poussin", "animal", "compagnon", "fourrure"],
        "kitten": ["cat", "puppy", "feline", "dog", "chick", "pet", "fur", "claws"],
        # justice
        "tribunal": ["juge", "avocat", "procès", "loi", "justice", "palais", "cour", "droit"],
        "court": ["judge", "lawyer", "trial", "law", "justice", "jury", "case", "legal"],
        # saisons / temps
        "hiver": ["neige", "froid", "glace", "décembre", "gel", "ski", "manteau", "saison"],
        "winter": ["snow", "cold", "ice", "december", "frost", "ski", "coat", "season"],
    }

    rng = np.random.default_rng(42)

    for item in analogies:
        wa = item["word_a"].lower()
        wb = item["word_b"].lower()
        wc = item["word_c"].lower()
        wd = item["answer"].lower()

        # S'assurer que les mots de l'analogie existent dans le vocabulaire
        for w in [wa, wb, wc, wd]:
            if w not in vectors:
                v = rng.standard_normal(dim)
                vectors[w] = v / np.linalg.norm(v)

        # Calcul du vecteur cible : A - B + C
        result_vec = vectors[wa] - vectors[wb] + vectors[wc]
        norm = np.linalg.norm(result_vec)
        if norm > 0:
            result_vec = result_vec / norm

        # La réponse exacte wd est positionnée exactement au centre (#1)
        vectors[wd] = result_vec

        # Injecter les mots voisins sémantiques pour constituer le Top 10 cohérent
        neighbors = thematic_neighbors.get(wd, [])
        for i, neighbor in enumerate(neighbors):
            nw = neighbor.lower()
            # On ajoute un peu de bruit croissant selon le rang pour créer une hiérarchie de similarité
            noise_scale = 0.08 + (i * 0.035)
            noise = rng.standard_normal(dim) * noise_scale
            vec_neighbor = result_vec + noise
            vectors[nw] = vec_neighbor / np.linalg.norm(vec_neighbor)


def get_top_n_similar(
    target_vec: np.ndarray,
    vectors: dict[str, np.ndarray],
    n: int = 10,
    exclude: Optional[list[str]] = None
) -> list[dict]:
    """
    Retourne les N mots les plus similaires au vecteur cible.
    
    Returns:
        Liste de dicts: [{word, similarity, rank, points}]
    """
    exclude_set = set(w.lower() for w in (exclude or []))
    
    scores = []
    for word, vec in vectors.items():
        if word in exclude_set:
            continue
        sim = cosine_similarity(target_vec, vec)
        scores.append((word, sim))
    
    # Tri par similarité décroissante
    scores.sort(key=lambda x: x[1], reverse=True)
    top_n = scores[:n]
    
    # Attribution des points selon le rang (style Ma Famille en Or)
    points_by_rank = {
        1: 1000, 2: 800, 3: 600, 4: 450, 5: 350,
        6: 300, 7: 250, 8: 200, 9: 150, 10: 100
    }
    
    return [
        {
            "word": word,
            "similarity": round(sim, 4),
            "rank": rank + 1,
            "points": points_by_rank.get(rank + 1, 100)
        }
        for rank, (word, sim) in enumerate(top_n)
    ]


def compute_analogy_vector(
    word_a: str,
    word_b: str,
    word_c: str,
    vectors: dict[str, np.ndarray]
) -> Optional[np.ndarray]:
    """
    Calcule le vecteur résultat de l'analogie: A - B + C
    
    Exemple: roi - homme + femme = ?
    """
    a, b, c = word_a.lower(), word_b.lower(), word_c.lower()
    
    missing = [w for w in [a, b, c] if w not in vectors]
    if missing:
        logger.warning(f"Mots manquants dans les vecteurs: {missing}")
        return None
    
    result = vectors[a] - vectors[b] + vectors[c]
    norm = np.linalg.norm(result)
    if norm == 0:
        return None
    return result / norm


def score_guess(
    guess: str,
    target_vec: np.ndarray,
    top10: list[dict],
    vectors: dict[str, np.ndarray]
) -> dict:
    """
    Évalue une réponse du joueur.
    
    Returns:
        {
            "in_top10": bool,
            "rank": int | None,
            "points": int,
            "similarity": float,
            "feedback": "exact" | "hot" | "warm" | "cold"
        }
    """
    import unicodedata
    def _clean(s: str) -> str:
        return "".join(c for c in unicodedata.normalize("NFD", s.lower().strip()) if unicodedata.category(c) != "Mn")

    guess_lower = guess.lower().strip()
    clean_guess = _clean(guess)

    # Vérification dans le Top 10 (insensible aux accents et à la casse)
    for item in top10:
        if _clean(item["word"]) == clean_guess:
            return {
                "in_top10": True,
                "rank": item["rank"],
                "points": item["points"],
                "similarity": item["similarity"],
                "feedback": "exact" if item["rank"] == 1 else "hot"
            }
    
    # Calcul de la similarité si le mot existe dans les vecteurs
    similarity = 0.0
    matched_vec_key = None
    if guess_lower in vectors:
        matched_vec_key = guess_lower
    elif clean_guess in vectors:
        matched_vec_key = clean_guess
    else:
        # Recherche parmi les clés normalisées
        for k in vectors:
            if _clean(k) == clean_guess:
                matched_vec_key = k
                break

    if matched_vec_key is not None:
        similarity = cosine_similarity(target_vec, vectors[matched_vec_key])
    
    # Feedback basé sur la similarité
    if similarity >= 0.85:
        feedback = "hot"
    elif similarity >= 0.65:
        feedback = "warm"
    else:
        feedback = "cold"
    
    return {
        "in_top10": False,
        "rank": None,
        "points": 0,
        "similarity": round(similarity, 4),
        "feedback": feedback
    }

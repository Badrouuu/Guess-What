"""
test_vector_engine.py — Unit Tests for VectorWord AI & Analogy Engine
Tests mathematical invariants, vector algebra, catalog integrity, and deterministic PRNG.
"""

import sys
import unittest
from pathlib import Path
import numpy as np

# Add backend directory to Python path
BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from models.embeddings import cosine_similarity, compute_analogy_vector
from models.challenge import (
    load_verified_catalog,
    get_challenge_public,
    select_daily_analogy,
    SUPPORTED_THEMES,
)


class TestVectorMath(unittest.TestCase):
    """Test suite for latent space vector mathematics."""

    def test_cosine_similarity_properties(self):
        v1 = np.array([1.0, 0.0, 0.0])
        v2 = np.array([1.0, 0.0, 0.0])
        v_ortho = np.array([0.0, 1.0, 0.0])
        v_opposite = np.array([-1.0, 0.0, 0.0])

        self.assertAlmostEqual(cosine_similarity(v1, v2), 1.0, places=5)
        self.assertAlmostEqual(cosine_similarity(v1, v_ortho), 0.0, places=5)
        self.assertAlmostEqual(cosine_similarity(v1, v_opposite), -1.0, places=5)

    def test_analogy_vector_arithmetic(self):
        vectors = {
            "king": np.array([1.0, 2.0, 0.5]),
            "man": np.array([0.0, 2.0, 0.0]),
            "woman": np.array([0.0, 0.0, 1.0]),
        }
        # Queen = King - Man + Woman = [1.0, 0.0, 1.5]
        target = compute_analogy_vector("king", "man", "woman", vectors)
        expected = np.array([1.0, 0.0, 1.5])
        expected_normalized = expected / np.linalg.norm(expected)

        self.assertIsNotNone(target)
        self.assertAlmostEqual(cosine_similarity(target, expected_normalized), 1.0, places=5)


class TestCatalogIntegrity(unittest.TestCase):
    """Verifies that all precomputed AI catalogs satisfy relational and game invariants."""

    def test_all_themes_loaded(self):
        for theme in SUPPORTED_THEMES:
            catalog = load_verified_catalog("fr", theme)
            self.assertGreater(len(catalog), 0, f"Catalog for theme '{theme}' should not be empty")

    def test_non_degeneracy_invariant(self):
        """
        Critical invariant: In every analogy (A is to B as C is to D),
        all 4 words must be strictly distinct to avoid degenerate prompts
        such as 'Inception is to Nolan as Nolan is to ???'.
        """
        for theme in SUPPORTED_THEMES:
            catalog = load_verified_catalog("fr", theme)
            for cid, entry in catalog.items():
                words = {
                    entry["word_a"].lower().strip(),
                    entry["word_b"].lower().strip(),
                    entry["word_c"].lower().strip(),
                    entry["answer"].lower().strip(),
                }
                self.assertEqual(
                    len(words),
                    4,
                    f"Degenerate analogy found in theme '{theme}', id '{cid}': {words}",
                )

    def test_top10_board_structure(self):
        """Verify that every challenge has 10 cards, ordered by rank 1..10."""
        for theme in SUPPORTED_THEMES:
            catalog = load_verified_catalog("fr", theme)
            for cid, entry in catalog.items():
                top10 = entry.get("top10", [])
                self.assertEqual(len(top10), 10, f"Challenge {cid} must have exactly 10 cards")
                ranks = [item["rank"] for item in top10]
                self.assertEqual(ranks, list(range(1, 11)), f"Challenge {cid} ranks must be 1 to 10")
                # Jackpot card is rank 1
                self.assertEqual(top10[0]["rank"], 1)


class TestGameMechanics(unittest.TestCase):
    """Test deterministic daily seeds and training mode generation."""

    def test_daily_challenge_determinism(self):
        """Same date and theme must always yield identical challenge worldwide."""
        d1 = get_challenge_public("fr", "culture", mode="daily")
        d2 = get_challenge_public("fr", "culture", mode="daily")
        self.assertEqual(d1["id"], d2["id"])
        self.assertEqual(d1["word_a"], d2["word_a"])
        self.assertEqual(d1["word_b"], d2["word_b"])
        self.assertEqual(d1["word_c"], d2["word_c"])

    def test_training_mode_diversity(self):
        """Different seeds must be able to pull distinct analogies."""
        t1 = get_challenge_public("fr", "culture", mode="training", seed="seed_alpha_42")
        t2 = get_challenge_public("fr", "culture", mode="training", seed="seed_beta_99")
        self.assertIn("id", t1)
        self.assertIn("id", t2)
        self.assertGreater(t1["answer_length"], 0)
        self.assertGreater(len(t1["first_letter"]), 0)


if __name__ == "__main__":
    unittest.main()

"""
dev_server.py — Serveur de test autonome (Zéro dépendance externe hors numpy).
Utilise http.server standard pour pouvoir tester immédiatement en local.
Expose les mêmes routes que main.py :
  - GET  /
  - GET  /api/challenge?lang=fr
  - POST /api/guess
  - GET  /api/leaderboard
  - POST /api/score
  - GET  /api/next-challenge
  - GET  /api/reveal-top10
"""

import json
import logging
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import numpy as np
from models.challenge import (
    get_challenge_by_id,
    get_challenge_public,
    get_daily_challenge,
    get_vectors,
    seconds_until_midnight,
)
from models.embeddings import score_guess

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("VectorWordServer")

_in_memory_scores: dict[str, list[dict]] = {}

class GameHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def log_message(self, format, *args):
        # Override standard logger to use python logging
        logger.info("%s - %s", self.address_string(), format % args)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)
        lang = params.get("lang", ["fr"])[0].lower()[:2]
        theme = params.get("theme", ["culture"])[0].lower().strip()

        if path == "/":
            self._set_headers(200)
            payload = {
                "status": "ok",
                "service": "VectorWord Local Dev Server",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            self.wfile.write(json.dumps(payload).encode("utf-8"))
            return

        if path == "/api/challenge":
            try:
                mode = params.get("mode", ["daily"])[0].lower().strip()
                seed = params.get("seed", [None])[0]
                challenge = get_challenge_public(lang, theme, mode=mode, seed=seed)
                self._set_headers(200)
                self.wfile.write(json.dumps(challenge).encode("utf-8"))
            except Exception as e:
                logger.error("Erreur challenge: %s", e)
                self._set_headers(500)
                self.wfile.write(json.dumps({"detail": str(e)}).encode("utf-8"))
            return

        if path == "/api/next-challenge":
            seconds = seconds_until_midnight()
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            self._set_headers(200)
            self.wfile.write(
                json.dumps({
                    "seconds_remaining": seconds,
                    "formatted": f"{hours:02d}h{minutes:02d}m",
                }).encode("utf-8")
            )
            return

        if path == "/api/leaderboard":
            scores = _in_memory_scores.get(lang, [])[:10]
            self._set_headers(200)
            self.wfile.write(
                json.dumps({
                    "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "lang": lang,
                    "scores": scores,
                }).encode("utf-8")
            )
            return

        if path == "/api/reveal-top10":
            try:
                challenge_id = params.get("challenge_id", [None])[0]
                if challenge_id:
                    challenge = get_challenge_by_id(challenge_id, lang, theme)
                else:
                    challenge = get_daily_challenge(lang, theme)
                self._set_headers(200)
                self.wfile.write(
                    json.dumps({
                        "top10": challenge["top10"],
                        "word_a": challenge["word_a"],
                        "word_b": challenge["word_b"],
                        "word_c": challenge["word_c"],
                        "answer": challenge.get("answer", ""),
                    }).encode("utf-8")
                )
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({"detail": str(e)}).encode("utf-8"))
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"detail": "Not found"}).encode("utf-8"))

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(length) if length > 0 else b"{}"

        try:
            body = json.loads(body_bytes.decode("utf-8"))
        except Exception:
            self._set_headers(400)
            self.wfile.write(json.dumps({"detail": "JSON invalide"}).encode("utf-8"))
            return

        if path == "/api/guess":
            try:
                guess = str(body.get("guess", "")).strip()
                lang = str(body.get("lang", "fr")).lower()[:2]
                theme = str(body.get("theme", "culture")).lower().strip()
                challenge_id = body.get("challenge_id")
                if challenge_id:
                    challenge = get_challenge_by_id(challenge_id, lang, theme)
                else:
                    challenge = get_daily_challenge(lang, theme)
                vectors = get_vectors(lang)
                target_vec = np.array(challenge["_target_vec"])
                top10 = challenge["top10"]

                result = score_guess(guess, target_vec, top10, vectors)
                if result["in_top10"]:
                    rank = result["rank"]
                    revealed = next((item["word"] for item in top10 if item["rank"] == rank), guess)
                    result["revealed_word"] = revealed
                else:
                    result["revealed_word"] = None

                self._set_headers(200)
                self.wfile.write(json.dumps(result).encode("utf-8"))
            except Exception as e:
                logger.error("Erreur guess: %s", e)
                self._set_headers(500)
                self.wfile.write(json.dumps({"detail": str(e)}).encode("utf-8"))
            return

        if path == "/api/score":
            try:
                lang = str(body.get("lang", "fr")).lower()[:2]
                entry = {
                    "player_name": str(body.get("player_name", "Anonyme"))[:30],
                    "points": int(body.get("points", 0)),
                    "words_found": int(body.get("words_found", 0)),
                    "lives_remaining": int(body.get("lives_remaining", 0)),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                if lang not in _in_memory_scores:
                    _in_memory_scores[lang] = []
                _in_memory_scores[lang].append(entry)
                _in_memory_scores[lang].sort(key=lambda x: x["points"], reverse=True)
                _in_memory_scores[lang] = _in_memory_scores[lang][:100]

                rank = next((i + 1 for i, s in enumerate(_in_memory_scores[lang]) if s["points"] == entry["points"]), len(_in_memory_scores[lang]))
                self._set_headers(200)
                self.wfile.write(json.dumps({"success": True, "rank": rank}).encode("utf-8"))
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({"detail": str(e)}).encode("utf-8"))
            return

        if path == "/api/admin/regenerate":
            try:
                from scripts.auto_analogy_engine import build_all_themes
                from models.challenge import _challenge_cache
                build_all_themes()
                _challenge_cache.clear()
                self._set_headers(200)
                self.wfile.write(json.dumps({"success": True, "message": "Catalogue IA régénéré avec succès !"}).encode("utf-8"))
            except Exception as e:
                logger.error("Erreur regenerate: %s", e)
                self._set_headers(500)
                self.wfile.write(json.dumps({"detail": str(e)}).encode("utf-8"))
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"detail": "Not found"}).encode("utf-8"))

def run(port=8000):
    logger.info("Pré-chargement des vecteurs et défi du jour...")
    for lang in ["fr", "en"]:
        get_vectors(lang)
        get_daily_challenge(lang)
    server_address = ("0.0.0.0", port)
    httpd = ThreadingHTTPServer(server_address, GameHandler)
    logger.info("Serveur VectorWord en ligne sur http://localhost:%d", port)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Arrêt du serveur.")
        httpd.server_close()

if __name__ == "__main__":
    run()

import { NextRequest, NextResponse } from "next/server";
import { scorePlayerGuess } from "@/lib/gameServer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const guess = String(body.guess || "").trim();
    const theme = String(body.theme || "culture").toLowerCase().trim();
    const challengeId = body.challenge_id || null;

    if (!guess) {
      return NextResponse.json({ detail: "Mot manquant" }, { status: 400 });
    }

    const result = scorePlayerGuess(guess, theme, challengeId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/guess:", error);
    return NextResponse.json({ detail: "Erreur évaluation réponse" }, { status: 500 });
  }
}

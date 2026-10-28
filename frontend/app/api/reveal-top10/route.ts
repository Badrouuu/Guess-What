import { NextRequest, NextResponse } from "next/server";
import { getFullReveal } from "@/lib/gameServer";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const theme = searchParams.get("theme") || "culture";
    const challengeId = searchParams.get("challenge_id");

    const reveal = getFullReveal(theme, challengeId);
    return NextResponse.json(reveal);
  } catch (error) {
    console.error("Error in /api/reveal-top10:", error);
    return NextResponse.json({ detail: "Erreur révélation" }, { status: 500 });
  }
}

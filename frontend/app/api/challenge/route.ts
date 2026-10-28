import { NextRequest, NextResponse } from "next/server";
import { getChallengePublic } from "@/lib/gameServer";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang") || "fr";
    const theme = searchParams.get("theme") || "culture";
    const mode = (searchParams.get("mode") as "daily" | "training") || "daily";
    const seed = searchParams.get("seed");

    const challenge = getChallengePublic(lang, theme, mode, seed);
    return NextResponse.json(challenge);
  } catch (error) {
    console.error("Error in /api/challenge:", error);
    return NextResponse.json({ detail: "Erreur serveur" }, { status: 500 });
  }
}

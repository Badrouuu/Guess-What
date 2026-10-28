import { NextResponse } from "next/server";
import { getSecondsUntilMidnight } from "@/lib/gameServer";

export async function GET() {
  const timer = getSecondsUntilMidnight();
  return NextResponse.json(timer);
}

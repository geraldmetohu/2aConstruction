import { NextResponse } from "next/server";

// Card payments for premium estimates have been switched off. Nothing is processed here any more.
export const runtime = "nodejs";
export async function POST() {
  return NextResponse.json({ error: "Premium estimate payments are no longer accepted." }, { status: 410 });
}

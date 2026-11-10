import { NextResponse, type NextRequest } from "next/server";
import { currentUser, homeFor } from "@/app/lib/auth/session.server";

// Kept for old links: after signing in, go to the right home for the person's role.
export async function GET(request: NextRequest) {
  const user = await currentUser();
  return NextResponse.redirect(new URL(user ? homeFor(user.role) : "/login", request.url));
}

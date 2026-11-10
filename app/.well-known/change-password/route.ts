import { NextResponse, type NextRequest } from "next/server";

// Lets iPhone, Safari, Chrome and password managers open "change password" directly (W3C well-known URL).
export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/account#password", req.url), 302);
}

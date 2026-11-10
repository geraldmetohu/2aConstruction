import { NextResponse, type NextRequest } from "next/server";

// The old Kinde sign-in links (/api/auth/login, /register, /logout…) now go to our own pages.
export async function GET(req: NextRequest, { params }: { params: Promise<{ kindeAuth: string }> }) {
  const { kindeAuth } = await params;
  const to = kindeAuth === "register" ? "/signup" : kindeAuth === "logout" ? "/logout" : "/login";
  return NextResponse.redirect(new URL(to, req.url));
}

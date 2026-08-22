import { NextResponse } from "next/server";
import { securityHeaders } from "@/lib/security";

export function middleware() {
  const res = NextResponse.next();
  const headers = securityHeaders();
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand/).*)"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin API routes (except auth which is the login endpoint)
  if (pathname.startsWith("/api/admin/") && pathname !== "/api/admin/auth") {
    const adminKey = request.headers.get("x-admin-key");
    const adminSession = request.cookies.get("en-route-admin")?.value;

    if (!adminKey && !adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Protect admin pages (check cookie)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const adminSession = request.cookies.get("en-route-admin")?.value;
    if (!adminSession) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*", "/admin/:path*"],
};

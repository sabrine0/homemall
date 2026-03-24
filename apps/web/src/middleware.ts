import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = process.env.COOKIE_NAME || "homemall_token";
const protectedPaths = ["/settings", "/listings", "/messages"];
const authPaths = [
  "/login",
  "/signup",
  "/forgot-password",
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password"
];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const segments = pathname.split("/").filter(Boolean);
  const isPublicListingDetailsRoute =
    segments.length === 2 && segments[0] === "listings";

  const isProtectedRoute = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  if (isProtectedRoute && !isPublicListingDetailsRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const isAuthPath = authPaths.some((path) => pathname === path);
  if (isAuthPath && token) {
    const returnTo = request.nextUrl.searchParams.get("returnTo");
    const redirectPath =
      returnTo && returnTo.startsWith("/") ? returnTo : "/zones";
    const appUrl = new URL(redirectPath, request.url);
    return NextResponse.redirect(appUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/settings/:path*",
    "/listings/:path*",
    "/messages/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/auth/login",
    "/auth/signup",
    "/auth/forgot-password"
  ],
};

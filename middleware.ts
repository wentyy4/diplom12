import { auth } from "@/lib/auth";

/**
 * Route protection: require auth for dashboard/projects; redirect to /login or /dashboard.
 * RBAC (role-based access) is enforced in Server Actions and data fetching, not here.
 * For role-only routes (e.g. /admin) you could check req.auth?.user?.role and redirect to /forbidden.
 */
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthRoute =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/register");

  if (isAuthRoute && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.url));
  }
  if (!isAuthRoute && !isLoggedIn && req.nextUrl.pathname !== "/") {
    return Response.redirect(new URL("/login", req.url));
  }
  return undefined;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets).*)"],
};

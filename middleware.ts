import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If user is not logged in and trying to access protected routes, redirect to login
  if (!session) {
    // List of paths that do not require authentication
    const publicPaths = [
      "/",
      "/login",
      "/signup",
      "/forgot-password",
      "/reset-password",
    ];
    const isPublicPath = publicPaths.some((path) =>
      req.nextUrl.pathname.startsWith(path)
    );

    // If trying to access a protected route without authentication, redirect to login
    if (
      !isPublicPath &&
      !req.nextUrl.pathname.startsWith("/_next") &&
      !req.nextUrl.pathname.startsWith("/api")
    ) {
      const redirectUrl = new URL("/login", req.url);
      return NextResponse.redirect(redirectUrl);
    }
  } else {
    // User is logged in

    // Don't run classification check for API routes or static files
    if (
      !req.nextUrl.pathname.startsWith("/api") &&
      !req.nextUrl.pathname.startsWith("/_next") &&
      !req.nextUrl.pathname.startsWith("/classification-test")
    ) {
      // Check if user has been classified
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_classified")
        .eq("user_id", session.user.id)
        .single();

      // If user is not classified and not already on the classification test page, redirect
      if (profile && profile.is_classified === false) {
        // Skip redirecting if user is trying to log out
        if (req.nextUrl.pathname !== "/logout") {
          const redirectUrl = new URL("/classification-test", req.url);
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
  }

  return res;
}

// Run middleware on all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public files)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|images|public).*)",
  ],
};

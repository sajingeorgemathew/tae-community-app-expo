import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/src/lib/supabaseServer";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createSupabaseMiddlewareClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect /app and /app/* routes
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user is disabled
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_disabled")
      .eq("id", user.id)
      .single();

    if (profile?.is_disabled) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("disabled", "1");
      return NextResponse.redirect(loginUrl);
    }
  }

  // Optional: Redirect authenticated users away from /login and /signup
  if (pathname === "/login" || pathname === "/signup") {
    if (user) {
      const appUrl = new URL("/app", request.url);
      return NextResponse.redirect(appUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/app", "/app/:path*", "/login", "/signup"],
};

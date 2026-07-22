import { NextResponse } from "next/server";
import { refreshSupabaseSession } from "@/app/lib/auth";

function isJwtExpired(token) {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return true;
    }
    return false;
  } catch (e) {
    return true;
  }
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Halaman login
  const isLoginPage = pathname === "/login";

  // Ambil token dari cookie
  let token = request.cookies.get("sb-access-token")?.value;
  const refreshToken = request.cookies.get("sb-refresh-token")?.value;

  const tokenExpired = isJwtExpired(token);

  // Jika access token habis tetapi refresh token ada, coba perbarui session
  if (tokenExpired && refreshToken) {
    const data = await refreshSupabaseSession(refreshToken);
    if (data) {
      token = data.access_token;
      
      const targetUrl = isLoginPage ? new URL("/", request.url) : null;
      const response = targetUrl ? NextResponse.redirect(targetUrl) : NextResponse.next();
      
      const baseCookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // Perpanjang cookies 7 hari
      };

      response.cookies.set("sb-access-token", data.access_token, baseCookieOptions);
      if (data.refresh_token) {
        response.cookies.set("sb-refresh-token", data.refresh_token, baseCookieOptions);
      }

      return response;
    }
  }

  // Jika tidak ada token (atau token expired) dan bukan halaman login, redirect ke halaman login
  if (tokenExpired && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    
    // Hapus cookie yang tidak valid
    response.cookies.delete("sb-access-token");
    response.cookies.delete("sb-refresh-token");
    return response;
  }

  // Jika sudah login (token valid) tapi mencoba mengakses halaman login, redirect ke dashboard
  if (!tokenExpired && isLoginPage) {
    const dashboardUrl = new URL("/", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

// Lindungi semua halaman, kecualikan API routes, file statis, dan icon
export const config = {
  matcher: [
    /*
     * Mencocokkan semua rute request kecuali:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - file dengan ekstensi (misal: logo.png, styles.css)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)",
  ],
};

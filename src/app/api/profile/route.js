import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromToken, refreshSupabaseSession } from "@/app/lib/auth";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Helper to get user, trying refresh if needed
async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  let token = cookieStore.get("sb-access-token")?.value;
  const refreshToken = cookieStore.get("sb-refresh-token")?.value;

  if (!token) {
    if (refreshToken) {
      const data = await refreshSupabaseSession(refreshToken);
      if (data) {
        token = data.access_token;
        const user = await getUserFromToken(token);
        return { user, token, sessionData: data };
      }
    }
    return { user: null, token: null };
  }

  let user = await getUserFromToken(token);
  if (!user && refreshToken) {
    // Token might be expired, try refreshing
    const data = await refreshSupabaseSession(refreshToken);
    if (data) {
      token = data.access_token;
      user = await getUserFromToken(token);
      return { user, token, sessionData: data };
    }
  }

  return { user, token };
}

// Helper to set session cookies if refreshed
function setSessionCookies(response, sessionData) {
  if (!sessionData) return;
  const baseCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  };
  response.cookies.set("sb-access-token", sessionData.access_token, baseCookieOptions);
  if (sessionData.refresh_token) {
    response.cookies.set("sb-refresh-token", sessionData.refresh_token, baseCookieOptions);
  }
}

export async function GET() {
  const { user, token, sessionData } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Failed to get user profile" }, { status: 401 });
  }

  const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Guru";

  const response = NextResponse.json({ displayName });
  if (sessionData) {
    setSessionCookies(response, sessionData);
  }
  return response;
}

export async function PUT(request) {
  const { user, token, sessionData } = await getAuthenticatedUser();
  if (!user || !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { displayName } = await request.json();
    if (!displayName?.trim()) {
      return NextResponse.json({ error: "Nama tidak boleh kosong" }, { status: 400 });
    }

    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        data: {
          display_name: displayName.trim()
        }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.msg || err.error || "Gagal memperbarui profil");
    }

    const updatedUser = await res.json();
    const newName = updatedUser.user_metadata?.display_name || displayName.trim();

    const response = NextResponse.json({ success: true, displayName: newName });
    if (sessionData) {
      setSessionCookies(response, sessionData);
    }
    return response;
  } catch (error) {
    console.error("Profile API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

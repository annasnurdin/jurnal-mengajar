import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginWithSupabase } from "@/app/lib/auth";

export async function POST(request) {
  try {
    const { username, password, rememberMe } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi" },
        { status: 400 }
      );
    }

    // Ubah username menjadi email jika belum berformat email
    let email = username;
    if (!email.includes("@")) {
      email = `${username}@sekolah.id`;
    }

    const data = await loginWithSupabase(email, password);

    // Dapatkan instance cookies store (asinkron di Next.js 16)
    const cookieStore = await cookies();

    // Tentukan opsi cookie berdasarkan "Ingat Saya" (Remember Me)
    const baseCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    };

    if (rememberMe) {
      // Simpan selama seminggu (7 hari)
      const oneWeekSeconds = 7 * 24 * 60 * 60;
      cookieStore.set("sb-access-token", data.access_token, {
        ...baseCookieOptions,
        maxAge: oneWeekSeconds,
      });

      if (data.refresh_token) {
        cookieStore.set("sb-refresh-token", data.refresh_token, {
          ...baseCookieOptions,
          maxAge: oneWeekSeconds,
        });
      }
    } else {
      // Hanya simpan selama sesi browser (session cookie)
      cookieStore.set("sb-access-token", data.access_token, baseCookieOptions);
      
      // Hapus refresh token lama jika ada
      cookieStore.delete("sb-refresh-token");
    }

    return NextResponse.json({
      success: true,
      user: data.user,
    });
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal melakukan login" },
      { status: 401 }
    );
  }
}

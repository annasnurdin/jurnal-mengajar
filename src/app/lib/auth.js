const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

/**
 * Melakukan autentikasi email & password ke Supabase Auth.
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{ access_token: string, refresh_token: string, user: object }>}
 */
export async function loginWithSupabase(email, password) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase URL dan Anon Key belum dikonfigurasi di .env");
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error_description || errorData.error || errorData.msg || errorData.message || "Gagal melakukan autentikasi");
  }

  return await response.json();
}

/**
 * Memvalidasi access_token dan mengambil data user dari Supabase.
 * @param {string} accessToken 
 * @returns {Promise<object|null>}
 */
export async function getUserFromToken(accessToken) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !accessToken) {
    return null;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Gagal melakukan verifikasi token ke Supabase:", error);
    return null;
  }
}

/**
 * Memperbarui session menggunakan refresh_token.
 * @param {string} refreshToken 
 * @returns {Promise<{ access_token: string, refresh_token: string, expires_in: number }|null>}
 */
export async function refreshSupabaseSession(refreshToken) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Gagal melakukan refresh token ke Supabase:", error);
    return null;
  }
}


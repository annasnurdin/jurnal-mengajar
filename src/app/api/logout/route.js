import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Hapus cookies session
    cookieStore.delete("sb-access-token");
    cookieStore.delete("sb-refresh-token");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout API Error:", error);
    return NextResponse.json(
      { error: "Gagal melakukan logout" },
      { status: 500 }
    );
  }
}

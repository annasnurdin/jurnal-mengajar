import { NextResponse } from "next/server";

const WEBAPP_URL = process.env.GOOGLE_SHEET_WEBAPP_URL;

function checkConfig() {
  if (!WEBAPP_URL) {
    return NextResponse.json(
      { error: "GOOGLE_SHEET_WEBAPP_URL is not configured in your .env file." },
      { status: 500 }
    );
  }
  return null;
}

// GET: Fetch all rows from sheet "Presensi"
export async function GET() {
  const errorResponse = checkConfig();
  if (errorResponse) return errorResponse;

  try {
    const response = await fetch(`${WEBAPP_URL}?action=read&sheet=Presensi`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from Apps Script: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const errorResponse = checkConfig();
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json(); // { tanggal: "...", kehadiran: "...", kelas: "..." }
    
    if (!body.tanggal || !body.kehadiran) {
      return NextResponse.json({ error: "Missing required fields 'tanggal' or 'kehadiran'" }, { status: 400 });
    }

    const response = await fetch(WEBAPP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "sync_presensi",
        tanggal: body.tanggal,
        kehadiran: body.kehadiran,
        kelas: body.kelas,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync to Google Sheet: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

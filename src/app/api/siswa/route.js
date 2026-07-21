import { NextResponse } from "next/server";

const WEBAPP_URL = process.env.GOOGLE_SHEET_WEBAPP_URL;
const SHEET_NAME = "Daftar Siswa";

function checkConfig() {
  if (!WEBAPP_URL) {
    return NextResponse.json(
      { error: "GOOGLE_SHEET_WEBAPP_URL is not configured in your .env file." },
      { status: 500 }
    );
  }
  return null;
}

// 1. READ all student data
export async function GET() {
  const errorResponse = checkConfig();
  if (errorResponse) return errorResponse;

  try {
    const response = await fetch(`${WEBAPP_URL}?action=read&sheet=${encodeURIComponent(SHEET_NAME)}`, {
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

// 2. CREATE a new student entry
export async function POST(request) {
  const errorResponse = checkConfig();
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    
    const response = await fetch(WEBAPP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "create",
        sheet: SHEET_NAME,
        data: body,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create row in Google Sheet: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. UPDATE an existing entry
export async function PUT(request) {
  const errorResponse = checkConfig();
  if (errorResponse) return errorResponse;

  try {
    const { id, data: updatePayload } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: "Missing required parameter 'id' (row number)" }, { status: 400 });
    }

    const response = await fetch(WEBAPP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "update",
        sheet: SHEET_NAME,
        id: id,
        data: updatePayload,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update row in Google Sheet: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. DELETE an entry
export async function DELETE(request) {
  const errorResponse = checkConfig();
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing required query parameter 'id' (row number)" }, { status: 400 });
    }

    const response = await fetch(WEBAPP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "delete",
        sheet: SHEET_NAME,
        id: id,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete row in Google Sheet: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

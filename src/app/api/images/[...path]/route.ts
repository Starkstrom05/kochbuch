import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;

  // Prevent directory traversal
  const joined = segments.join("/");
  if (joined.includes("..")) {
    return NextResponse.json({ error: "Ungültiger Pfad" }, { status: 400 });
  }

  const filePath = path.join(UPLOAD_DIR, joined);
  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).replace(".", "").toLowerCase();
    const contentType = MIME[ext] ?? "application/octet-stream";
    return new Response(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }
}

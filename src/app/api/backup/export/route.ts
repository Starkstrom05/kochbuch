import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { auth } from "@/lib/auth/auth";
import { collectBackup, resolveBackupFile } from "@/lib/backup/export";

export const maxDuration = 300;

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Nur Admins dürfen exportieren" }, { status: 403 });
  }

  const { data, files } = await collectBackup();

  const zip = new JSZip();
  zip.file("backup.json", JSON.stringify(data, null, 2));
  for (const f of files) {
    try {
      const buf = await readFile(resolveBackupFile(f.relPath));
      zip.file(f.zipPath, buf);
    } catch {
      // Bilddatei fehlt im UPLOAD_DIR → überspringen, Metadaten bleiben im JSON.
    }
  }

  const zipped = await zip.generateAsync({ type: "uint8array" });
  // Frischer ArrayBuffer-gestützter View — BodyInit verlangt ArrayBuffer (nicht
  // ArrayBufferLike), worüber Buffer/Uint8Array aus jszip stolpern.
  const body = new Uint8Array(zipped.byteLength);
  body.set(zipped);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="kochbuch-backup-${date}.zip"`,
      "Content-Length": String(body.byteLength),
    },
  });
}

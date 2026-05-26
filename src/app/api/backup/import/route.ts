import { NextResponse } from "next/server";
import JSZip from "jszip";
import { auth } from "@/lib/auth/auth";
import { backupSchema } from "@/lib/schemas/backup";
import { applyBackup } from "@/lib/backup/import";

export const maxDuration = 300;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Nur Admins dürfen importieren" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const mode = form.get("mode") === "duplicate" ? "duplicate" : "skip";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Datei hochgeladen" }, { status: 400 });
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: "Kein gültiges ZIP-Archiv" }, { status: 400 });
  }

  const jsonEntry = zip.file("backup.json");
  if (!jsonEntry) {
    return NextResponse.json({ error: "backup.json fehlt im ZIP" }, { status: 400 });
  }

  let data;
  try {
    data = backupSchema.parse(JSON.parse(await jsonEntry.async("string")));
  } catch (e) {
    return NextResponse.json(
      { error: `Ungültiges Backup: ${e instanceof Error ? e.message : "Parse-Fehler"}` },
      { status: 400 },
    );
  }

  if (!session.user.activeCookbookId) {
    return NextResponse.json(
      { error: "Kein aktives Kochbuch ausgewaehlt — bitte in der Kopfzeile umschalten." },
      { status: 400 },
    );
  }

  const summary = await applyBackup(
    data,
    async (zipPath) => {
      const entry = zip.file(zipPath);
      return entry ? await entry.async("nodebuffer") : null;
    },
    {
      mode,
      actor: { id: session.user.id, role: session.user.role },
      cookbookId: session.user.activeCookbookId,
    },
  );

  return NextResponse.json(summary);
}

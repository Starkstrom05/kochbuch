import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canWriteRecipe } from "@/lib/cookbooks/permissions";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe) return NextResponse.json({ error: "Rezept nicht gefunden" }, { status: 404 });
  const allowed = await canWriteRecipe({ id: session.user.id, role: session.user.role }, recipe);
  if (!allowed) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Kein Bild hochgeladen" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Datei zu groß (max 10 MB)" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Re-encode through sharp to strip any polyglot / non-image content.
  // Caps at 4096x4096 to guard against bomb images.
  let safePng: Buffer;
  try {
    safePng = await sharp(buffer, { failOn: "error" })
      .rotate()
      .resize({ width: 4096, height: 4096, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "Bild konnte nicht verarbeitet werden" }, { status: 400 });
  }

  const dir = path.join(UPLOAD_DIR, "recipes", id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "handwritten.png"), safePng);

  const handwrittenPath = `/recipes/${id}/handwritten.png`;
  await prisma.recipe.update({ where: { id }, data: { handwrittenPath } });

  return NextResponse.json({ handwrittenPath });
}

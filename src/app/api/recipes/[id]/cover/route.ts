import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { processAndSaveCoverImage, MAX_UPLOAD_BYTES } from "@/lib/images/upload";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe) return NextResponse.json({ error: "Rezept nicht gefunden" }, { status: 404 });
  if (recipe.createdById !== session.user.id) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Kein Bild hochgeladen" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Datei zu groß (max 10 MB)" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { coverPath } = await processAndSaveCoverImage(buffer, id);

  await prisma.recipe.update({ where: { id }, data: { coverImagePath: coverPath } });

  return NextResponse.json({ coverPath });
}

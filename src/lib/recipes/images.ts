import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import {
  MAX_UPLOAD_BYTES,
  deleteRecipeImageFiles,
  processAndSaveRecipeImage,
} from "@/lib/images/upload";

const FETCH_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";

function makeImageId(): string {
  return `m${randomBytes(12).toString("hex")}`;
}

async function nextOrder(recipeId: string): Promise<number> {
  const top = await prisma.recipeImage.findFirst({
    where: { recipeId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return top ? top.order + 1 : 0;
}

export async function addImageFromBuffer(
  recipeId: string,
  buffer: Buffer,
  opts: { order?: number; caption?: string } = {},
): Promise<{ id: string; path: string }> {
  if (buffer.length < 1024) throw new Error("Bild verdächtig klein (<1 KB)");
  if (buffer.length > MAX_UPLOAD_BYTES) throw new Error("Bild zu groß");

  const id = makeImageId();
  const { path } = await processAndSaveRecipeImage(buffer, recipeId, id);
  const order = opts.order ?? (await nextOrder(recipeId));
  await prisma.recipeImage.create({
    data: { id, recipeId, path, order, caption: opts.caption ?? null },
  });
  return { id, path };
}

export async function addImageFromUrl(
  recipeId: string,
  imageUrl: string,
  opts: { order?: number; baseUrl?: string; caption?: string } = {},
): Promise<{ id: string; path: string }> {
  const absolute = opts.baseUrl ? new URL(imageUrl, opts.baseUrl).toString() : imageUrl;
  const res = await fetch(absolute, {
    headers: {
      "User-Agent": FETCH_UA,
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} beim Laden des Bilds`);
  const buf = Buffer.from(await res.arrayBuffer());
  return addImageFromBuffer(recipeId, buf, opts);
}

export async function removeImage(imageId: string): Promise<void> {
  const img = await prisma.recipeImage.findUnique({ where: { id: imageId } });
  if (!img) return;
  await prisma.recipeImage.delete({ where: { id: imageId } });
  await deleteRecipeImageFiles(img.path);
}

export async function clearAllImages(recipeId: string): Promise<void> {
  const imgs = await prisma.recipeImage.findMany({
    where: { recipeId },
    select: { id: true, path: true },
  });
  await prisma.recipeImage.deleteMany({ where: { recipeId } });
  await Promise.all(imgs.map((i) => deleteRecipeImageFiles(i.path)));
}

/**
 * Setzt die Reihenfolge der existierenden Bilder neu (0-basiert) und
 * loescht alle Bilder, die nicht in `orderedIds` vorkommen.
 */
export async function reconcileImages(
  recipeId: string,
  orderedIds: string[],
): Promise<void> {
  const existing = await prisma.recipeImage.findMany({
    where: { recipeId },
    select: { id: true, path: true },
  });
  const keep = new Set(orderedIds);
  const toDelete = existing.filter((i) => !keep.has(i.id));
  if (toDelete.length > 0) {
    await prisma.recipeImage.deleteMany({
      where: { id: { in: toDelete.map((i) => i.id) } },
    });
    await Promise.all(toDelete.map((i) => deleteRecipeImageFiles(i.path)));
  }
  // Two-pass reorder via negative offsets, damit unique-Konstraints
  // (falls je nachgezogen) sicher umgangen sind. Aktuell hat (recipeId, order)
  // keinen unique-Index, aber so bleibt's konfliktfrei.
  for (let i = 0; i < orderedIds.length; i++) {
    await prisma.recipeImage.update({
      where: { id: orderedIds[i] },
      data: { order: -(i + 1) },
    });
  }
  for (let i = 0; i < orderedIds.length; i++) {
    await prisma.recipeImage.update({
      where: { id: orderedIds[i] },
      data: { order: i },
    });
  }
}

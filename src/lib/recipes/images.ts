import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { assertPublicUrl } from "@/lib/import/ssrf";
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
  try {
    await prisma.recipeImage.create({
      data: { id, recipeId, path, order, caption: opts.caption ?? null },
    });
  } catch (err) {
    // DB-Insert fehlgeschlagen — sonst bleiben die geschriebenen Dateien als
    // Waisen im UPLOAD_DIR liegen. Bei der recipeImage-id ist quasi keine
    // Kollision möglich (12 random bytes), trotzdem absichern.
    await deleteRecipeImageFiles(path).catch(() => undefined);
    throw err;
  }
  return { id, path };
}

export async function addImageFromUrl(
  recipeId: string,
  imageUrl: string,
  opts: { order?: number; baseUrl?: string; caption?: string } = {},
): Promise<{ id: string; path: string }> {
  const absolute = opts.baseUrl ? new URL(imageUrl, opts.baseUrl).toString() : imageUrl;

  // SSRF: imageUrl kommt aus der Form (Web-Import) und ist damit user-controlled.
  // Ohne Check kann ein angemeldeter User interne Endpoints (Router, Ollama,
  // Cloud-Metadata) proben. Gleicher Check wie beim Image-Proxy und Web-Import.
  const check = await assertPublicUrl(absolute);
  if (!check.ok) throw new Error(`URL abgelehnt: ${check.reason}`);

  const res = await fetch(absolute, {
    headers: {
      "User-Agent": FETCH_UA,
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
    },
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
  });
  // Redirect-Follow zugelassener Server kann auf interne IPs umlenken — wir
  // weisen 3xx hier ab; legitimes Bild-Hosting liefert 200 direkt.
  if (res.status >= 300 && res.status < 400) {
    throw new Error(`Redirect (HTTP ${res.status}) nicht erlaubt für Bild-Import`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} beim Laden des Bilds`);

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.startsWith("image/")) {
    throw new Error(`Antwort kein Bild (Content-Type: ${ct || "leer"})`);
  }

  // Content-Length-Header *vor* dem Download prüfen — sonst zieht ein
  // ehrlicher 500-MB-Server den Buffer komplett in den RAM, bevor unser
  // Size-Limit in addImageFromBuffer greift.
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES) {
    throw new Error(`Bild zu groß laut Content-Length (${declared} Bytes)`);
  }

  // Manuelles Streaming mit Cap, falls der Server lügt oder keinen Header
  // schickt. Bricht ab, sobald MAX_UPLOAD_BYTES überschritten wäre.
  if (!res.body) throw new Error("Antwort ohne Body");
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = res.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_UPLOAD_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new Error(`Bild zu groß (>${MAX_UPLOAD_BYTES} Bytes)`);
    }
    chunks.push(value);
  }
  const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
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
export async function reconcileImages(recipeId: string, orderedIds: string[]): Promise<void> {
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

import { prisma } from "@/lib/db/prisma";
import { processAndSaveCoverImage } from "@/lib/images/upload";

const FETCH_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";

export async function downloadAndAttachCover(
  recipeId: string,
  imageUrl: string,
  baseUrl?: string,
): Promise<void> {
  const absolute = baseUrl ? new URL(imageUrl, baseUrl).toString() : imageUrl;
  const res = await fetch(absolute, {
    headers: {
      "User-Agent": FETCH_UA,
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} beim Laden des Bilds`);

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) throw new Error("Bild verdächtig klein (<1 KB)");
  if (buf.length > 20 * 1024 * 1024) throw new Error("Bild zu groß (>20 MB)");

  const { coverPath } = await processAndSaveCoverImage(buf, recipeId);
  await prisma.recipe.update({
    where: { id: recipeId },
    data: { coverImagePath: coverPath },
  });
}

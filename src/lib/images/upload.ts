import sharp from "sharp";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";

export type ProcessedImage = {
  path: string;
  thumbPath: string;
};

/**
 * Speichert ein Rezept-Bild unter recipes/<recipeId>/<basename>.jpg
 * plus Thumbnail <basename>-thumb.jpg. Liefert die Pfade relativ zum
 * UPLOAD_DIR — passt direkt in RecipeImage.path.
 */
export async function processAndSaveRecipeImage(
  buffer: Buffer,
  recipeId: string,
  basename: string,
): Promise<ProcessedImage> {
  const dir = path.join(UPLOAD_DIR, "recipes", recipeId);
  await mkdir(dir, { recursive: true });

  const fullBuffer = await sharp(buffer)
    .rotate() // auto-rotate from EXIF
    .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();

  const thumbBuffer = await sharp(buffer)
    .rotate()
    .resize(400, 300, { fit: "cover", position: "centre" })
    .jpeg({ quality: 80 })
    .toBuffer();

  await writeFile(path.join(dir, `${basename}.jpg`), fullBuffer);
  await writeFile(path.join(dir, `${basename}-thumb.jpg`), thumbBuffer);

  return {
    path: `/recipes/${recipeId}/${basename}.jpg`,
    thumbPath: `/recipes/${recipeId}/${basename}-thumb.jpg`,
  };
}

/**
 * Loescht die Dateien fuer einen gespeicherten Bild-Pfad (best-effort).
 * Akzeptiert /recipes/<id>/<basename>.jpg und entfernt auch -thumb.jpg.
 */
export async function deleteRecipeImageFiles(relativePath: string): Promise<void> {
  const abs = path.join(UPLOAD_DIR, relativePath);
  await unlink(abs).catch(() => {});
  const thumb = abs.replace(/\.jpg$/i, "-thumb.jpg");
  await unlink(thumb).catch(() => {});
}

export function resolveUploadPath(relativePath: string): string {
  return path.join(UPLOAD_DIR, relativePath);
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

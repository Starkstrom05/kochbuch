import sharp from "sharp";
import { writeFile, mkdir, unlink, copyFile, access } from "fs/promises";
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

/**
 * Kopiert ein bestehendes Rezept-Bild + Thumbnail ins Verzeichnis eines neuen
 * Rezepts (z. B. beim Import in ein anderes Cookbook). Liefert die neuen
 * relativen Pfade. Best-effort: fehlt eine Quell-Datei, wird der Eintrag
 * stillschweigend uebersprungen.
 */
export async function cloneRecipeImageFiles(
  sourceRelativePath: string,
  targetRecipeId: string,
): Promise<ProcessedImage | null> {
  const sourceAbs = path.join(UPLOAD_DIR, sourceRelativePath);
  try {
    await access(sourceAbs);
  } catch {
    return null;
  }
  const basename = path.basename(sourceRelativePath, path.extname(sourceRelativePath));
  const targetDir = path.join(UPLOAD_DIR, "recipes", targetRecipeId);
  await mkdir(targetDir, { recursive: true });
  const targetFull = path.join(targetDir, `${basename}.jpg`);
  const targetThumb = path.join(targetDir, `${basename}-thumb.jpg`);
  await copyFile(sourceAbs, targetFull);
  const sourceThumb = sourceAbs.replace(/\.jpg$/i, "-thumb.jpg");
  try {
    await copyFile(sourceThumb, targetThumb);
  } catch {
    // Thumbnail fehlt — neu erzeugen, damit die Liste sauber bleibt
    const thumbBuffer = await sharp(sourceAbs)
      .rotate()
      .resize(400, 300, { fit: "cover", position: "centre" })
      .jpeg({ quality: 80 })
      .toBuffer();
    await writeFile(targetThumb, thumbBuffer);
  }
  return {
    path: `/recipes/${targetRecipeId}/${basename}.jpg`,
    thumbPath: `/recipes/${targetRecipeId}/${basename}-thumb.jpg`,
  };
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

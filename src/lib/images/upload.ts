import sharp from "sharp";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";

export type ProcessedImage = {
  coverPath: string;
  thumbPath: string;
};

export async function processAndSaveCoverImage(
  buffer: Buffer,
  recipeId: string,
): Promise<ProcessedImage> {
  const dir = path.join(UPLOAD_DIR, "recipes", recipeId);
  await mkdir(dir, { recursive: true });

  const coverBuffer = await sharp(buffer)
    .rotate() // auto-rotate from EXIF
    .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();

  const thumbBuffer = await sharp(buffer)
    .rotate()
    .resize(400, 300, { fit: "cover", position: "centre" })
    .jpeg({ quality: 80 })
    .toBuffer();

  await writeFile(path.join(dir, "cover.jpg"), coverBuffer);
  await writeFile(path.join(dir, "cover-thumb.jpg"), thumbBuffer);

  return {
    coverPath: `/recipes/${recipeId}/cover.jpg`,
    thumbPath: `/recipes/${recipeId}/cover-thumb.jpg`,
  };
}

export function resolveUploadPath(relativePath: string): string {
  return path.join(UPLOAD_DIR, relativePath);
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Leitet den Thumbnail-Pfad aus einem gespeicherten Bild-Pfad ab.
 * processAndSaveRecipeImage legt zu <basename>.jpg immer ein
 * <basename>-thumb.jpg daneben — der Thumb-Pfad ist daher deterministisch
 * ableitbar, ohne ihn separat in der DB zu speichern. Endet der Pfad nicht
 * auf .jpg, wird er unveraendert zurueckgegeben (Fallback aufs Original).
 */
export function toThumbPath(imagePath: string): string {
  return imagePath.replace(/\.jpg$/i, "-thumb.jpg");
}

import { z } from "zod";

/** Ziel-Liste für „→ Einkaufsliste". cuid; echte Zugriffsprüfung folgt serverseitig. */
export const targetListIdSchema = z.string().trim().min(1).max(40);

export type SelectableList = {
  id: string;
  name: string;
  isOwn: boolean;
  ownerName: string;
};

/**
 * Default-Vorauswahl im Ziel-Selektor: die erste eigene Liste, sonst die erste
 * verfügbare. Erwartet die Sortierung aus `listAccessibleLists` (eigene zuerst),
 * ist aber unabhängig davon korrekt.
 */
export function pickDefaultTargetListId(lists: SelectableList[]): string | null {
  return lists.find((l) => l.isOwn)?.id ?? lists[0]?.id ?? null;
}

/**
 * Den Ziel-Picker nur anzeigen, wenn es etwas zu wählen gibt (≥2 Listen). Bei 0/1
 * schreibt die Action direkt in die eigene (ggf. neu angelegte) Liste.
 */
export function shouldShowListPicker(lists: SelectableList[]): boolean {
  return lists.length >= 2;
}

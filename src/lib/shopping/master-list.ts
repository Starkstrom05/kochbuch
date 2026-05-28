export type FrequentEntry = {
  name: string;
  unit: string | null;
  count: number;
};

/**
 * Wählt die anzuzeigenden „Häufig gekauft"-Vorschläge: Namen, die bereits auf
 * der aktuellen Liste stehen (case-insensitive, egal ob abgehakt), werden
 * herausgefiltert, der Rest auf `limit` gekappt. Die Eingabe ist bereits
 * serverseitig sortiert (count DESC, lastUsedAt DESC) — diese Reihenfolge
 * bleibt erhalten.
 */
export function selectMasterListItems(
  frequent: FrequentEntry[],
  currentListNames: string[],
  limit = 12,
): FrequentEntry[] {
  const onList = new Set(currentListNames.map((n) => n.toLowerCase().trim()));
  const out: FrequentEntry[] = [];
  for (const f of frequent) {
    if (onList.has(f.name.toLowerCase().trim())) continue;
    out.push(f);
    if (out.length >= limit) break;
  }
  return out;
}

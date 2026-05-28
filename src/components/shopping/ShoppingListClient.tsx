"use client";

import { useTransition, useState, useRef, useEffect } from "react";
import {
  toggleItemAction,
  checkAllInGroupAction,
  clearCheckedAction,
  clearListAction,
  addManualItemAction,
  addFrequentItemAction,
  suggestIngredientsAction,
} from "@/app/(app)/einkaufsliste/actions";
import {
  consolidateList,
  sortConsolidatedGroups,
  type RawItem,
  type ConsolidatedGroup,
} from "@/lib/shopping/consolidate";
import { groupByAisle } from "@/lib/shopping/aisles";
import type { FrequentEntry } from "@/lib/shopping/master-list";
import { EmptyState } from "@/components/oma/EmptyState";

type Props = {
  listId: string;
  items: RawItem[];
  listName?: string;
  frequentItems?: FrequentEntry[];
};

export function ShoppingListClient({
  listId,
  items: initialItems,
  listName,
  frequentItems = [],
}: Props) {
  const [items, setItems] = useState<RawItem[]>(initialItems);
  const [masterItems, setMasterItems] = useState<FrequentEntry[]>(frequentItems);
  const [isPending, startTransition] = useTransition();
  const [showManual, setShowManual] = useState(false);

  const consolidated = consolidateList(items);
  const groups = sortConsolidatedGroups(consolidated);
  const sections = groupByAisle(consolidated);
  const checkedCount = items.filter((i) => i.checked).length;

  function optimisticToggle(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
    startTransition(() => toggleItemAction(id));
  }

  function optimisticCheckGroup(group: ConsolidatedGroup) {
    const ids = group.items.map((i) => i.id);
    setItems((prev) => prev.map((i) => (ids.includes(i.id) ? { ...i, checked: true } : i)));
    startTransition(() => checkAllInGroupAction(listId, ids));
  }

  function optimisticClearChecked() {
    setItems((prev) => prev.filter((i) => !i.checked));
    startTransition(() => clearCheckedAction(listId));
  }

  function optimisticClearAll() {
    setItems([]);
    startTransition(() => clearListAction(listId));
  }

  // Upsert per ID: ein neu angelegtes Item wird angehängt, ein gemergtes
  // (gleiche ID, neue Gesamtmenge) ersetzt das bestehende. Der Server liefert
  // das Item inkl. Kategorie, daher landet es sofort im richtigen Gang.
  function upsertItem(item: RawItem) {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      return exists ? prev.map((i) => (i.id === item.id ? item : i)) : [...prev, item];
    });
    setShowManual(false);
  }

  // 1-Tap aus „Häufig gekauft": Chip optimistisch entfernen, Item in die Liste
  // upserten, sobald der Server den fertigen Datensatz (inkl. Gang) liefert.
  function addFromMaster(name: string) {
    const key = name.toLowerCase().trim();
    setMasterItems((prev) => prev.filter((f) => f.name.toLowerCase().trim() !== key));
    startTransition(async () => {
      const res = await addFrequentItemAction(listId, name);
      if (res) upsertItem(res.item);
    });
  }

  if (items.length === 0) {
    return (
      <>
        <EmptyState
          illustration="shopping"
          title="Liste ist leer."
          description="Füge Rezepte hinzu oder trage Zutaten manuell ein."
          action={
            <button
              onClick={() => setShowManual(true)}
              className="bg-ribbon font-hand text-paper-50 rounded-sm px-5 py-2 text-xl"
            >
              + Zutat hinzufügen
            </button>
          }
        />
        {showManual && (
          <ManualAddForm
            listId={listId}
            onUpsert={upsertItem}
            onCancel={() => setShowManual(false)}
          />
        )}
        <MasterListPanel items={masterItems} onAdd={addFromMaster} disabled={isPending} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-written text-ink-faded text-sm">
          {checkedCount}/{items.length} erledigt
        </span>
        <div className="flex gap-3">
          {checkedCount > 0 && (
            <button
              onClick={optimisticClearChecked}
              disabled={isPending}
              className="bg-paper-200 font-written text-ink ring-paper-300 hover:bg-paper-300/60 rounded-sm px-3 py-1.5 text-sm ring-1"
            >
              Erledigte entfernen
            </button>
          )}
          <ShareButton groups={groups} listName={listName} listId={listId} />
          <button
            onClick={() => setShowManual((v) => !v)}
            className="bg-paper-200 font-written text-ink ring-paper-300 hover:bg-paper-300/60 rounded-sm px-3 py-1.5 text-sm ring-1"
          >
            + Manuell
          </button>
          <button
            onClick={optimisticClearAll}
            disabled={isPending}
            className="font-written text-ink-faded hover:text-ribbon rounded-sm px-3 py-1.5 text-sm"
          >
            Liste leeren
          </button>
        </div>
      </div>

      {showManual && (
        <ManualAddForm
          listId={listId}
          onUpsert={upsertItem}
          onCancel={() => setShowManual(false)}
        />
      )}

      <MasterListPanel items={masterItems} onAdd={addFromMaster} disabled={isPending} />

      {/* Nach Gang gruppiert */}
      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.label}>
            <h2 className="font-hand text-ribbon border-paper-200 mb-1 border-b pb-0.5 text-2xl">
              {section.label}
            </h2>
            <ul className="divide-paper-200 divide-y">
              {section.groups.map((group) => (
                <GroupRow
                  key={group.name.toLowerCase()}
                  group={group}
                  onToggleItem={optimisticToggle}
                  onCheckAll={optimisticCheckGroup}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

// ── Group row ─────────────────────────────────────────────────────────────────

function GroupRow({
  group,
  onToggleItem,
  onCheckAll,
}: {
  group: ConsolidatedGroup;
  onToggleItem: (id: string) => void;
  onCheckAll: (g: ConsolidatedGroup) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const multiSource = group.items.length > 1;

  return (
    <li className={`py-3 transition-opacity ${group.allChecked ? "opacity-40" : ""}`}>
      <div className="flex items-start gap-3">
        {/* Big checkbox for entire group — 44px touch target, 24px visible box */}
        <button
          onClick={() =>
            group.allChecked ? group.items.forEach((i) => onToggleItem(i.id)) : onCheckAll(group)
          }
          className="-my-2 -ml-2 flex h-11 w-11 flex-shrink-0 items-center justify-center"
          aria-label={group.allChecked ? "Abhaken rückgängig" : "Alle abhaken"}
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-sm border-2 transition-colors ${
              group.allChecked
                ? "border-ribbon bg-ribbon text-paper-50"
                : group.someChecked
                  ? "border-ribbon/60 bg-ribbon/20"
                  : "border-paper-400 bg-paper-50"
            }`}
          >
            {group.allChecked && <span className="text-xs leading-none">✓</span>}
            {group.someChecked && !group.allChecked && (
              <span className="text-xs leading-none">–</span>
            )}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span
              className={`font-written text-ink text-lg ${group.allChecked ? "line-through" : ""}`}
            >
              {group.name}
            </span>
            {group.totalLabel && (
              <span className="text-ink-faded font-serif text-sm">{group.totalLabel}</span>
            )}
            {multiSource && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="font-written text-ribbon text-xs underline underline-offset-2"
              >
                {expanded ? "▲" : "▼"} {group.items.length} Rezepte
              </button>
            )}
          </div>

          {/* Single source label */}
          {!multiSource && group.items[0].recipeRef && (
            <p className="font-written text-ink-faded text-xs">{group.items[0].recipeRef}</p>
          )}

          {/* Expanded individual items */}
          {multiSource && expanded && (
            <ul className="mt-2 space-y-1">
              {group.items.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-center gap-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => onToggleItem(item.id)}
                      className="accent-ribbon h-5 w-5 flex-shrink-0"
                    />
                    <span
                      className={`font-written text-sm ${item.checked ? "text-ink-faded line-through" : "text-ink"}`}
                    >
                      {item.amount != null
                        ? `${item.amount}${item.unit ? " " + item.unit : ""}`
                        : ""}{" "}
                      <span className="text-ink-faded">({item.recipeRef ?? "manuell"})</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

// ── Share button ──────────────────────────────────────────────────────────────

function buildShareText(groups: ConsolidatedGroup[], listName?: string): string {
  const title = listName ?? "Einkaufsliste";
  const unchecked = groups.filter((g) => !g.allChecked);
  if (unchecked.length === 0) return `${title}\n\n(Alles erledigt ✓)`;
  const lines = unchecked.map((g) => {
    const amount = g.totalLabel ? ` — ${g.totalLabel}` : "";
    return `${g.name}${amount}`;
  });
  return `${title}\n\n${lines.join("\n")}`;
}

function ShareButton({
  groups,
  listName,
  listId,
}: {
  groups: ConsolidatedGroup[];
  listName?: string;
  listId: string;
}) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "info" | "error"; text: string } | null>(null);
  const [ogFallback, setOgFallback] = useState<{ url: string; reason: string } | null>(null);

  function flash(kind: "info" | "error", text: string) {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleShareText() {
    setMenuOpen(false);
    const text = buildShareText(groups, listName);
    const title = listName ?? "Einkaufsliste";

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      const payload = { title, text };
      try {
        if (typeof navigator.canShare === "function" && !navigator.canShare(payload)) {
          throw new Error("cannot share");
        }
        await navigator.share(payload);
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        // weiter zum manuellen Fallback
      }
    }

    setFallbackText(text);
  }

  async function handleOurGroceries() {
    setMenuOpen(false);
    try {
      const res = await fetch(`/api/shopping-list/${listId}/export/ourgroceries`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        needsSetup?: boolean;
        fallback?: string;
        added?: number;
        failed?: number;
        listName?: string | null;
      };

      if (res.ok) {
        const failed = data.failed ?? 0;
        const target = data.listName ? ` (Liste »${data.listName}«)` : "";
        flash(
          failed > 0 ? "error" : "info",
          failed > 0
            ? `${data.added ?? 0} zu OurGroceries${target}, ${failed} fehlgeschlagen.`
            : `${data.added ?? 0} Items zu OurGroceries${target} übertragen.`,
        );
        return;
      }

      if (res.status === 412 || data.needsSetup) {
        flash("error", data.error ?? "Bitte zuerst mit OurGroceries verbinden.");
        return;
      }

      // 502/503 — Fallback auf CSV anbieten
      setOgFallback({
        url: `/api/shopping-list/${listId}/export/csv`,
        reason: data.error ?? "OurGroceries nicht erreichbar.",
      });
    } catch (err) {
      flash("error", `Netzwerkfehler: ${(err as Error).message}`);
    }
  }

  function handleCsvDownload() {
    setMenuOpen(false);
    window.location.href = `/api/shopping-list/${listId}/export/csv`;
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="bg-paper-200 font-written text-ink ring-paper-300 hover:bg-paper-300/60 rounded-sm px-3 py-1.5 text-sm ring-1"
        >
          {copied ? "✓ Kopiert!" : "📤 Teilen"}
        </button>
        {menuOpen && (
          <div
            className="bg-paper-50 shadow-card ring-paper-300 absolute right-0 z-40 mt-1 w-56 rounded-sm p-1 ring-1"
            role="menu"
          >
            <button
              role="menuitem"
              onClick={handleShareText}
              className="font-written text-ink hover:bg-paper-200 block w-full rounded-sm px-3 py-2 text-left text-sm"
            >
              Klartext / Teilen-Dialog
            </button>
            <button
              role="menuitem"
              onClick={handleOurGroceries}
              className="font-written text-ink hover:bg-paper-200 block w-full rounded-sm px-3 py-2 text-left text-sm"
            >
              → OurGroceries
            </button>
            <button
              role="menuitem"
              onClick={handleCsvDownload}
              className="font-written text-ink hover:bg-paper-200 block w-full rounded-sm px-3 py-2 text-left text-sm"
            >
              CSV herunterladen
            </button>
          </div>
        )}
      </div>

      {fallbackText !== null && (
        <ShareFallback text={fallbackText} onClose={() => setFallbackText(null)} />
      )}

      {toast && (
        <div
          className={`font-written shadow-card fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-sm px-4 py-2 text-sm ${
            toast.kind === "error"
              ? "bg-ribbon text-paper-50"
              : "bg-paper-50 text-ink ring-paper-300 ring-1"
          }`}
          role="status"
        >
          {toast.text}
        </div>
      )}

      {ogFallback && (
        <OurGroceriesFallback
          reason={ogFallback.reason}
          downloadUrl={ogFallback.url}
          onClose={() => setOgFallback(null)}
        />
      )}
    </>
  );
}

function OurGroceriesFallback({
  reason,
  downloadUrl,
  onClose,
}: {
  reason: string;
  downloadUrl: string;
  onClose: () => void;
}) {
  return (
    <div
      className="bg-ink/40 px-safe pb-safe pt-safe fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-paper-50 shadow-card ring-paper-300 w-full max-w-md rounded-sm p-4 ring-1"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-hand text-ink text-2xl">OurGroceries nicht erreichbar</h2>
        <p className="font-written text-ink-faded mt-2 text-sm">{reason}</p>
        <p className="font-written text-ink mt-3 text-sm">
          Du kannst die Liste stattdessen als CSV herunterladen und manuell in OurGroceries
          hochladen.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} className="font-written text-ink-faded text-sm">
            Abbrechen
          </button>
          <a
            href={downloadUrl}
            onClick={onClose}
            className="bg-ribbon font-hand text-paper-50 rounded-sm px-4 py-2 text-lg"
          >
            CSV herunterladen
          </a>
        </div>
      </div>
    </div>
  );
}

function ShareFallback({ text, onClose }: { text: string; onClose: () => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);

  function copyManually() {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.select();
    // execCommand("copy") funktioniert auch ohne Secure Context (Legacy-Pfad)
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      className="bg-ink/40 px-safe pb-safe pt-safe fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-paper-50 shadow-card ring-paper-300 w-full max-w-md rounded-sm p-4 ring-1"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-hand text-ink text-2xl">Liste teilen</h2>
        <p className="font-written text-ink-faded mt-1 text-sm">
          Direktes Teilen ist hier nicht verfügbar. Text markieren und kopieren:
        </p>
        <textarea
          ref={textareaRef}
          readOnly
          value={text}
          rows={Math.min(12, text.split("\n").length + 1)}
          className="border-ink-light bg-paper-100 font-written text-ink mt-3 w-full resize-none rounded-sm border border-dotted p-2 text-sm outline-none"
          onFocus={(e) => e.currentTarget.select()}
        />
        <div className="mt-3 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="font-written text-ink-faded hover:text-ribbon text-sm"
          >
            Schließen
          </button>
          <button
            onClick={copyManually}
            className="bg-ribbon font-hand text-paper-50 rounded-sm px-4 py-2 text-lg"
          >
            {copied ? "✓ Kopiert!" : "Markieren & Kopieren"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Master list ("Häufig gekauft") ──────────────────────────────────────────────

function MasterListPanel({
  items,
  onAdd,
  disabled,
}: {
  items: FrequentEntry[];
  onAdd: (name: string) => void;
  disabled: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section aria-label="Häufig gekauft">
      <h2 className="font-hand text-ink-faded mb-2 text-xl">Häufig gekauft</h2>
      <div className="flex flex-wrap gap-2">
        {items.map((f) => (
          <button
            key={f.name}
            onClick={() => onAdd(f.name)}
            disabled={disabled}
            className="bg-paper-100 font-written text-ink ring-paper-300 hover:bg-paper-200 rounded-full px-3 py-1.5 text-sm ring-1 disabled:opacity-50"
          >
            + {f.name}
          </button>
        ))}
      </div>
    </section>
  );
}

// ── Manual add form ───────────────────────────────────────────────────────────

function ManualAddForm({
  listId,
  onUpsert,
  onCancel,
}: {
  listId: string;
  onUpsert: (item: RawItem) => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [nameQuery, setNameQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Zutaten-Vorschläge aus der Stammdaten-Tabelle, debounced gegen Tipp-Last.
  useEffect(() => {
    const q = nameQuery.trim();
    const handle = setTimeout(() => {
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      suggestIngredientsAction(q)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(handle);
  }, [nameQuery]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) return;
    startTransition(async () => {
      const res = await addManualItemAction(listId, fd);
      if (res) onUpsert(res.item);
    });
  }

  return (
    <form
      onSubmit={submit}
      className="bg-paper-100 ring-paper-300 flex flex-wrap items-end gap-2 rounded-sm p-3 ring-1"
    >
      <label className="min-w-[140px] flex-1">
        <span className="font-written text-ink-faded text-xs">Zutat</span>
        <input
          name="name"
          required
          autoFocus
          placeholder="Milch"
          list="ingredient-suggest"
          autoComplete="off"
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          className="border-ink-light font-written text-ink mt-1 w-full border-b border-dotted bg-transparent outline-none"
        />
        <datalist id="ingredient-suggest">
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <label className="w-20">
        <span className="font-written text-ink-faded text-xs">Menge</span>
        <input
          name="amount"
          inputMode="decimal"
          placeholder="500"
          className="border-ink-light text-ink mt-1 w-full border-b border-dotted bg-transparent font-serif outline-none"
        />
      </label>
      <label className="w-16">
        <span className="font-written text-ink-faded text-xs">Einheit</span>
        <input
          name="unit"
          placeholder="ml"
          list="units-list"
          className="border-ink-light text-ink mt-1 w-full border-b border-dotted bg-transparent font-serif outline-none"
        />
      </label>
      <datalist id="units-list">
        {["g", "kg", "ml", "l", "EL", "TL", "Stk"].map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="bg-ribbon font-hand text-paper-50 rounded-sm px-3 py-1.5 text-lg"
        >
          +
        </button>
        <button type="button" onClick={onCancel} className="font-written text-ink-faded text-sm">
          ✕
        </button>
      </div>
    </form>
  );
}

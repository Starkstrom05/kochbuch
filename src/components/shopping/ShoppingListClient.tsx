"use client";

import { useTransition, useState, useRef } from "react";
import {
  toggleItemAction,
  checkAllInGroupAction,
  clearCheckedAction,
  clearListAction,
  addManualItemAction,
} from "@/app/(app)/einkaufsliste/actions";
import {
  consolidateList,
  sortConsolidatedGroups,
  type RawItem,
  type ConsolidatedGroup,
} from "@/lib/shopping/consolidate";
import { EmptyState } from "@/components/oma/EmptyState";

type Props = {
  listId: string;
  items: RawItem[];
  listName?: string;
};

export function ShoppingListClient({ listId, items: initialItems, listName }: Props) {
  const [items, setItems] = useState<RawItem[]>(initialItems);
  const [isPending, startTransition] = useTransition();
  const [showManual, setShowManual] = useState(false);

  const groups = sortConsolidatedGroups(consolidateList(items));
  const checkedCount = items.filter((i) => i.checked).length;

  function optimisticToggle(id: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)),
    );
    startTransition(() => toggleItemAction(id));
  }

  function optimisticCheckGroup(group: ConsolidatedGroup) {
    const ids = group.items.map((i) => i.id);
    setItems((prev) =>
      prev.map((i) => (ids.includes(i.id) ? { ...i, checked: true } : i)),
    );
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
              className="rounded-sm bg-ribbon px-5 py-2 font-hand text-xl text-paper-50"
            >
              + Zutat hinzufügen
            </button>
          }
        />
        {showManual && (
          <ManualAddForm
            listId={listId}
            onAdded={(item) => { setItems((p) => [...p, item]); setShowManual(false); }}
            onCancel={() => setShowManual(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-written text-sm text-ink-faded">
          {checkedCount}/{items.length} erledigt
        </span>
        <div className="flex gap-3">
          {checkedCount > 0 && (
            <button
              onClick={optimisticClearChecked}
              disabled={isPending}
              className="rounded-sm bg-paper-200 px-3 py-1.5 font-written text-sm text-ink ring-1 ring-paper-300 hover:bg-paper-300/60"
            >
              Erledigte entfernen
            </button>
          )}
          <ShareButton groups={groups} listName={listName} />
          <button
            onClick={() => setShowManual((v) => !v)}
            className="rounded-sm bg-paper-200 px-3 py-1.5 font-written text-sm text-ink ring-1 ring-paper-300 hover:bg-paper-300/60"
          >
            + Manuell
          </button>
          <button
            onClick={optimisticClearAll}
            disabled={isPending}
            className="rounded-sm px-3 py-1.5 font-written text-sm text-ink-faded hover:text-ribbon"
          >
            Liste leeren
          </button>
        </div>
      </div>

      {showManual && (
        <ManualAddForm
          listId={listId}
          onAdded={(item) => { setItems((p) => [...p, item]); setShowManual(false); }}
          onCancel={() => setShowManual(false)}
        />
      )}

      {/* Consolidated groups */}
      <ul className="divide-y divide-paper-200">
        {groups.map((group) => (
          <GroupRow
            key={group.name.toLowerCase()}
            group={group}
            onToggleItem={optimisticToggle}
            onCheckAll={optimisticCheckGroup}
          />
        ))}
      </ul>
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
    <li
      className={`py-3 transition-opacity ${group.allChecked ? "opacity-40" : ""}`}
    >
      <div className="flex items-start gap-3">
        {/* Big checkbox for entire group — 44px touch target, 24px visible box */}
        <button
          onClick={() =>
            group.allChecked
              ? group.items.forEach((i) => onToggleItem(i.id))
              : onCheckAll(group)
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

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`font-written text-lg text-ink ${group.allChecked ? "line-through" : ""}`}>
              {group.name}
            </span>
            {group.totalLabel && (
              <span className="font-serif text-sm text-ink-faded">{group.totalLabel}</span>
            )}
            {multiSource && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="font-written text-xs text-ribbon underline underline-offset-2"
              >
                {expanded ? "▲" : "▼"} {group.items.length} Rezepte
              </button>
            )}
          </div>

          {/* Single source label */}
          {!multiSource && group.items[0].recipeRef && (
            <p className="font-written text-xs text-ink-faded">{group.items[0].recipeRef}</p>
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
                      className="h-5 w-5 flex-shrink-0 accent-ribbon"
                    />
                    <span className={`font-written text-sm ${item.checked ? "line-through text-ink-faded" : "text-ink"}`}>
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

function ShareButton({ groups, listName }: { groups: ConsolidatedGroup[]; listName?: string }) {
  const [copied, setCopied] = useState(false);
  // Fallback-Text, wenn weder Web Share noch Clipboard verfügbar sind (z. B. NAS
  // über HTTP-LAN-IP → kein Secure Context). Wird im Overlay zum Kopieren angezeigt.
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  async function handleShare() {
    const text = buildShareText(groups, listName);
    const title = listName ?? "Einkaufsliste";

    // 1) Web Share API (nur im Secure Context vorhanden)
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      const payload = { title, text };
      try {
        if (typeof navigator.canShare === "function" && !navigator.canShare(payload)) {
          throw new Error("cannot share");
        }
        await navigator.share(payload);
        return;
      } catch (err) {
        // Nutzer-Abbruch ist kein Fehler → keinen Fallback auslösen
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    // 2) Clipboard API (braucht ebenfalls Secure Context)
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

    // 3) Manueller Fallback — funktioniert auch ohne Secure Context
    setFallbackText(text);
  }

  return (
    <>
      <button
        onClick={handleShare}
        className="rounded-sm bg-paper-200 px-3 py-1.5 font-written text-sm text-ink ring-1 ring-paper-300 hover:bg-paper-300/60"
      >
        {copied ? "✓ Kopiert!" : "📤 Teilen"}
      </button>
      {fallbackText !== null && (
        <ShareFallback text={fallbackText} onClose={() => setFallbackText(null)} />
      )}
    </>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 px-safe pb-safe pt-safe"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-sm bg-paper-50 p-4 shadow-card ring-1 ring-paper-300"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-hand text-2xl text-ink">Liste teilen</h2>
        <p className="mt-1 font-written text-sm text-ink-faded">
          Direktes Teilen ist hier nicht verfügbar. Text markieren und kopieren:
        </p>
        <textarea
          ref={textareaRef}
          readOnly
          value={text}
          rows={Math.min(12, text.split("\n").length + 1)}
          className="mt-3 w-full resize-none rounded-sm border border-dotted border-ink-light bg-paper-100 p-2 font-written text-sm text-ink outline-none"
          onFocus={(e) => e.currentTarget.select()}
        />
        <div className="mt-3 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="font-written text-sm text-ink-faded hover:text-ribbon"
          >
            Schließen
          </button>
          <button
            onClick={copyManually}
            className="rounded-sm bg-ribbon px-4 py-2 font-hand text-lg text-paper-50"
          >
            {copied ? "✓ Kopiert!" : "Markieren & Kopieren"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Manual add form ───────────────────────────────────────────────────────────

function ManualAddForm({
  listId,
  onAdded,
  onCancel,
}: {
  listId: string;
  onAdded: (item: RawItem) => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) return;
    const amount = fd.get("amount") ? Number(String(fd.get("amount")).replace(",", ".")) : null;
    const unit = String(fd.get("unit") ?? "").trim() || null;
    const tempId = `temp-${Date.now()}`;
    onAdded({ id: tempId, name, amount: Number.isFinite(amount!) ? amount : null, unit, recipeRef: null, checked: false });
    startTransition(() => addManualItemAction(listId, fd));
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-2 rounded-sm bg-paper-100 p-3 ring-1 ring-paper-300"
    >
      <label className="flex-1 min-w-[140px]">
        <span className="font-written text-xs text-ink-faded">Zutat</span>
        <input
          name="name"
          required
          autoFocus
          placeholder="Milch"
          className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-written text-ink outline-none"
        />
      </label>
      <label className="w-20">
        <span className="font-written text-xs text-ink-faded">Menge</span>
        <input
          name="amount"
          inputMode="decimal"
          placeholder="500"
          className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-serif text-ink outline-none"
        />
      </label>
      <label className="w-16">
        <span className="font-written text-xs text-ink-faded">Einheit</span>
        <input
          name="unit"
          placeholder="ml"
          list="units-list"
          className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-serif text-ink outline-none"
        />
      </label>
      <datalist id="units-list">
        {["g","kg","ml","l","EL","TL","Stk"].map((u) => <option key={u} value={u}/>)}
      </datalist>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-sm bg-ribbon px-3 py-1.5 font-hand text-lg text-paper-50"
        >
          +
        </button>
        <button type="button" onClick={onCancel} className="font-written text-sm text-ink-faded">
          ✕
        </button>
      </div>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toggleShareAction } from "@/app/(app)/rezepte/[slug]/share-action";

type Props = {
  recipeId: string;
  initialPublic: boolean;
  initialToken: string | null;
};

export function ShareToggle({ recipeId, initialPublic, initialToken }: Props) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [token, setToken] = useState(initialToken);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const shareUrl =
    token && typeof window !== "undefined" ? `${window.location.origin}/share/${token}` : "";

  const [error, setError] = useState<string | null>(null);

  function onToggle() {
    setError(null);
    startTransition(async () => {
      try {
        const next = await toggleShareAction(recipeId);
        setIsPublic(next.isPublic);
        setToken(next.token);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen");
      }
    });
  }

  async function copy() {
    if (!shareUrl) return;
    // Manche iOS/Safari-Setups blocken navigator.clipboard ohne HTTPS oder
    // verlangen einen direkten Nutzer-Klick — Fallback auf execCommand.
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const ta = document.createElement("textarea");
        ta.value = shareUrl;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kopieren fehlgeschlagen");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={isPending}
          className="bg-paper-200 font-written text-ink ring-paper-300 hover:bg-paper-300/60 inline-flex min-h-[36px] items-center rounded-sm px-3 text-sm ring-1 disabled:opacity-60"
        >
          {isPending ? "…" : isPublic ? "Share-Link deaktivieren" : "Share-Link erzeugen"}
        </button>

        {isPublic && shareUrl ? (
          <button
            type="button"
            onClick={copy}
            className="font-written text-ribbon text-sm underline underline-offset-4"
          >
            {copied ? "kopiert ✓" : "🔗 Link kopieren"}
          </button>
        ) : null}
      </div>

      {error ? <span className="font-written text-ribbon text-xs">{error}</span> : null}
    </div>
  );
}

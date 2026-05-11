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

  function onToggle() {
    startTransition(async () => {
      await toggleShareAction(recipeId);
      setIsPublic((v) => !v);
      if (isPublic) setToken(null);
    });
  }

  async function copy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onToggle}
        disabled={isPending}
        className="rounded-sm bg-paper-200 px-3 py-1 font-written text-sm text-ink ring-1 ring-paper-300 hover:bg-paper-300/60"
      >
        {isPublic ? "Share-Link deaktivieren" : "Share-Link erzeugen"}
      </button>

      {isPublic && shareUrl ? (
        <button
          type="button"
          onClick={copy}
          className="font-written text-sm text-ribbon underline underline-offset-4"
        >
          {copied ? "kopiert ✓" : "Link kopieren"}
        </button>
      ) : null}
    </div>
  );
}

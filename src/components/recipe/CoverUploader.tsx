"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Props = {
  recipeId: string;
  currentPath: string | null;
  isOwner: boolean;
};

export function CoverUploader({ recipeId, currentPath, isOwner }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const coverSrc = preview ?? (currentPath ? `/api/images${currentPath}` : null);

  async function upload(file: File) {
    setError(null);
    const fd = new FormData();
    fd.append("image", file);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    startTransition(async () => {
      const res = await fetch(`/api/recipes/${recipeId}/cover`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "Fehler beim Hochladen");
        setError(msg);
        setPreview(null);
      } else {
        router.refresh();
      }
      URL.revokeObjectURL(objectUrl);
    });
  }

  return (
    <div className="relative">
      {coverSrc ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-sm">
          <Image
            src={coverSrc}
            alt="Titelbild"
            fill
            className="object-cover sepia-[0.15]"
            sizes="(max-width: 768px) 100vw, 800px"
            unoptimized
          />
          {isOwner && (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={isPending}
              className="absolute bottom-2 right-2 rounded-sm bg-paper-50/80 px-3 py-1 font-written text-xs text-ink shadow-sm backdrop-blur-sm hover:bg-paper-100"
            >
              {isPending ? "…" : "Bild ändern"}
            </button>
          )}
        </div>
      ) : isOwner ? (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="w-full rounded-sm border-2 border-dashed border-paper-300 px-6 py-8 text-center font-written text-sm text-ink-faded hover:border-sepia hover:text-ink"
        >
          {isPending ? "Wird hochgeladen…" : "+ Titelbild hinzufügen"}
        </button>
      ) : null}

      {error && (
        <p className="mt-1 font-written text-xs text-red-600">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

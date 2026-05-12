"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type GalleryImage = { id: string; path: string; caption?: string | null };

type Props = {
  images: GalleryImage[];
};

export function RecipeGallery({ images }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const close = useCallback(() => setFullscreen(false), []);
  const next = useCallback(
    () => setActiveIdx((i) => Math.min(i + 1, images.length - 1)),
    [images.length],
  );
  const prev = useCallback(() => setActiveIdx((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, close, prev, next]);

  if (images.length === 0) return null;
  const active = images[Math.min(activeIdx, images.length - 1)];

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setFullscreen(true)}
        aria-label="Bild in voller Größe öffnen"
        className="relative block aspect-[16/9] w-full overflow-hidden rounded-sm bg-paper-100"
      >
        <Image
          src={`/api/images${active.path}`}
          alt={active.caption ?? "Rezeptbild"}
          fill
          className="object-cover sepia-[0.15] transition hover:scale-[1.01]"
          sizes="(max-width: 768px) 100vw, 800px"
          unoptimized
        />
      </button>
      {images.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIdx(i)}
              aria-label={`Bild ${i + 1} anzeigen`}
              className={`relative h-16 w-24 overflow-hidden rounded-sm ring-1 transition ${
                i === activeIdx
                  ? "ring-2 ring-ribbon"
                  : "ring-paper-300 hover:ring-paper-400"
              }`}
            >
              <Image
                src={`/api/images${img.path}`}
                alt={img.caption ?? `Bild ${i + 1}`}
                fill
                className="object-cover"
                sizes="96px"
                unoptimized
              />
            </button>
          ))}
        </div>
      ) : null}

      {fullscreen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/images${active.path}`}
            alt={active.caption ?? "Rezeptbild"}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            aria-label="Schließen"
            className="absolute right-4 top-4 rounded-sm bg-paper-50/10 px-3 py-1 font-hand text-2xl text-paper-50 hover:bg-paper-50/20"
          >
            ×
          </button>
          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                disabled={activeIdx === 0}
                aria-label="Vorheriges Bild"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-sm bg-paper-50/10 px-3 py-2 font-hand text-3xl text-paper-50 hover:bg-paper-50/20 disabled:opacity-30"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                disabled={activeIdx === images.length - 1}
                aria-label="Nächstes Bild"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-sm bg-paper-50/10 px-3 py-2 font-hand text-3xl text-paper-50 hover:bg-paper-50/20 disabled:opacity-30"
              >
                ›
              </button>
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 font-written text-sm text-paper-50/80">
                {activeIdx + 1} / {images.length}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

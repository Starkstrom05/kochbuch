"use client";

import dynamic from "next/dynamic";

const RecipeBook = dynamic(
  () => import("./RecipeBook").then((m) => ({ default: m.RecipeBook })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <p className="font-hand text-2xl text-paper-50">Buch wird geöffnet…</p>
      </div>
    ),
  },
);

export default RecipeBook;

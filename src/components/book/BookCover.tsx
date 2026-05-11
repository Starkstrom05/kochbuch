"use client";

import { forwardRef, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  back?: boolean;
};

export const BookCover = forwardRef<HTMLDivElement, Props>(function BookCover(
  { children, back = false },
  ref,
) {
  return (
    <div
      ref={ref}
      className="book-cover relative h-full overflow-hidden"
      data-density="hard"
      style={{
        background:
          "radial-gradient(circle at 50% 35%, #8a4632 0%, #6b3220 65%, #4a2114 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-2 rounded-sm ring-1 ring-amber-200/30" />
      <div className="pointer-events-none absolute inset-4 rounded-sm ring-1 ring-amber-200/20" />
      <div className="relative flex h-full flex-col items-center justify-center px-10 text-center">
        {children}
      </div>
      {!back ? (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/40 to-transparent"
          aria-hidden="true"
        />
      ) : (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-3 bg-gradient-to-l from-black/40 to-transparent"
          aria-hidden="true"
        />
      )}
    </div>
  );
});

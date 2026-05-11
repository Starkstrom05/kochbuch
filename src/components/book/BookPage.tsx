"use client";

import { forwardRef, type ReactNode } from "react";
import { InkBlots } from "@/components/oma/InkBlot";

type Props = {
  children: ReactNode;
  pageNumber?: number;
  seed?: string;
  variant?: "left" | "right";
};

export const BookPage = forwardRef<HTMLDivElement, Props>(function BookPage(
  { children, pageNumber, seed, variant = "right" },
  ref,
) {
  return (
    <div
      ref={ref}
      className="book-page relative h-full overflow-hidden bg-paper-50 bg-paper-aged bg-repeat"
      data-density="hard"
    >
      <div
        className={`pointer-events-none absolute inset-y-0 ${
          variant === "left" ? "right-0" : "left-0"
        } w-6 bg-gradient-to-${variant === "left" ? "l" : "r"} from-transparent to-ink/12`}
        aria-hidden="true"
      />
      {seed ? <InkBlots seed={seed} count={2} /> : null}
      <div className="relative flex h-full flex-col px-8 py-9 md:px-12 md:py-12">
        <div className="flex-1 overflow-hidden">{children}</div>
        {pageNumber !== undefined ? (
          <div
            className={`mt-3 font-written text-sm text-ink-faded ${
              variant === "left" ? "text-left" : "text-right"
            }`}
          >
            {pageNumber}
          </div>
        ) : null}
      </div>
    </div>
  );
});

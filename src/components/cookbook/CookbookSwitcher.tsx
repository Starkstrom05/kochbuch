"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { setActiveCookbookAction } from "@/app/(app)/cookbook-actions";

export type CookbookOption = {
  id: string;
  name: string;
  isOwn: boolean;
  ownerName: string;
};

type Props = {
  active: CookbookOption | null;
  options: CookbookOption[];
};

export function CookbookSwitcher({ active, options }: Props) {
  const router = useRouter();
  const { update } = useSession();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (options.length === 0) return null;

  function pick(id: string) {
    if (id === active?.id) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      await setActiveCookbookAction(id);
      await update({ activeCookbookId: id });
      router.refresh();
      setOpen(false);
    });
  }

  const own = options.filter((o) => o.isOwn);
  const shared = options.filter((o) => !o.isOwn);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="bg-paper-100 ring-paper-300 hover:bg-paper-200 font-hand text-ink inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-lg ring-1 disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span aria-hidden>📖</span>
        <span className="max-w-[18ch] truncate">{active?.name ?? "Kein Kochbuch"}</span>
        <span aria-hidden className="text-ink-faded text-sm">
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="listbox"
          className="bg-paper-50 ring-paper-300 shadow-page absolute right-0 z-50 mt-2 w-72 rounded-sm p-2 ring-1"
        >
          {own.length > 0 ? (
            <>
              <p className="font-written text-ink-faded px-2 py-1 text-xs tracking-wide uppercase">
                Meine
              </p>
              <ul>
                {own.map((opt) => (
                  <li key={opt.id}>
                    <button
                      type="button"
                      onClick={() => pick(opt.id)}
                      aria-current={opt.id === active?.id ? "true" : undefined}
                      className={`font-hand text-ink hover:bg-paper-200 block w-full rounded-sm px-2 py-1.5 text-left text-lg ${
                        opt.id === active?.id ? "bg-paper-200" : ""
                      }`}
                    >
                      {opt.name}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {shared.length > 0 ? (
            <>
              <p className="font-written text-ink-faded mt-2 px-2 py-1 text-xs tracking-wide uppercase">
                Freigegeben
              </p>
              <ul>
                {shared.map((opt) => (
                  <li key={opt.id}>
                    <button
                      type="button"
                      onClick={() => pick(opt.id)}
                      aria-current={opt.id === active?.id ? "true" : undefined}
                      className={`font-hand text-ink hover:bg-paper-200 block w-full rounded-sm px-2 py-1.5 text-left text-lg ${
                        opt.id === active?.id ? "bg-paper-200" : ""
                      }`}
                    >
                      <span className="block truncate">{opt.name}</span>
                      <span className="font-written text-ink-faded block text-xs">
                        von {opt.ownerName}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

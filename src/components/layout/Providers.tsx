"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

/**
 * Stellt den NextAuth-SessionProvider bereit. Notwendig, damit Client-Komponenten
 * wie der CookbookSwitcher session.update() aufrufen koennen, um den JWT bei
 * einem Cookbook-Wechsel zu aktualisieren.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

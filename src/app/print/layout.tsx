// Nested layout fuer /print/*. KEIN eigenes <html>/<body> — das erbt vom
// Root-Layout (app/layout.tsx), sonst gibt es Hydration-Mismatches (zwei
// <html>-Tags). Background-Farbe + Fonts werden in der Page selbst via
// inline-<style>-Block gesetzt — der Print-Renderer kümmert sich um den Rest.
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Rezept — Druckansicht" };

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

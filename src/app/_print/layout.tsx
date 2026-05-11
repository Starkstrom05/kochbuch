import type { Metadata } from "next";
import { Caveat, Kalam, Lora } from "next/font/google";
import "@/app/globals.css";

const caveat = Caveat({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-caveat", display: "block" });
const kalam = Kalam({ subsets: ["latin"], weight: ["300", "400", "700"], variable: "--font-kalam", display: "block" });
const lora = Lora({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-lora", display: "block" });

export const metadata: Metadata = { title: "Rezept — Druckansicht" };

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${caveat.variable} ${kalam.variable} ${lora.variable}`}>
      <body className="antialiased bg-white">{children}</body>
    </html>
  );
}

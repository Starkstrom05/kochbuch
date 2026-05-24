import type { Metadata, Viewport } from "next";
import { Caveat, Kalam, Lora } from "next/font/google";
import { InkFilters } from "@/components/oma/InkFilters";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { getAppName, getFamilyBranding } from "@/lib/config/app-config";
import "./globals.css";

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-caveat",
  display: "swap",
});

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-kalam",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-lora",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getFamilyBranding();
  const name = branding?.name ?? (await getAppName());
  return {
    title: name,
    description: "Familien-Rezepte, liebevoll handgeschrieben",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: name,
    },
    icons: {
      apple: "/apple-touch-icon.png",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#FBF6E9",
  width: "device-width",
  initialScale: 1,
  // viewport-fit=cover ist Pflicht, damit env(safe-area-inset-*) auf iPhone
  // mit Notch/Dynamic Island echte Werte liefert.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Per-Familie-Farben als CSS-Variablen am <html> — überschreiben die Defaults
  // aus globals.css. Werte werden über die CSSOM gesetzt (keine String-Injektion).
  const branding = await getFamilyBranding();
  const themeVars: Record<string, string> = {};
  if (branding?.accentColor) themeVars["--color-ribbon"] = branding.accentColor;
  if (branding?.inkColor) themeVars["--color-ink"] = branding.inkColor;
  if (branding?.paperColor) themeVars["--color-paper-50"] = branding.paperColor;

  return (
    <html
      lang="de"
      className={`${caveat.variable} ${kalam.variable} ${lora.variable}`}
      style={themeVars as React.CSSProperties}
    >
      <body className="antialiased">
        <InkFilters />
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}

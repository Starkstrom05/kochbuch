import type { Metadata, Viewport } from "next";
import { Caveat, Kalam, Lora } from "next/font/google";
import { InkFilters } from "@/components/oma/InkFilters";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { getAppName } from "@/lib/config/app-config";
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
  const name = await getAppName();
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${caveat.variable} ${kalam.variable} ${lora.variable}`}>
      <body className="antialiased">
        <InkFilters />
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}

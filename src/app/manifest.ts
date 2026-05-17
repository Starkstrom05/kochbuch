import type { MetadataRoute } from "next";
import { getAppName } from "@/lib/config/app-config";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const name = await getAppName();
  return {
    name,
    short_name: name.split(" ")[0],
    description: "Familien-Rezepte im Mery-Design",
    start_url: "/rezepte",
    display: "standalone",
    background_color: "#FBF6E9",
    theme_color: "#FBF6E9",
    orientation: "any",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["food", "lifestyle"],
  };
}

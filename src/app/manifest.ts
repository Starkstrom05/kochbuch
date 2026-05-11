import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Omas Kochbuch",
    short_name: "Kochbuch",
    description: "Familien-Rezepte im Oma-Design",
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

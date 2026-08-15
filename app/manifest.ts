import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CREDREP — Reputation Forecasting",
    short_name: "CREDREP",
    description:
      "Back live public questions with non-transferable reputation and build a prediction record.",
    start_url: "/",
    display: "standalone",
    background_color: "#031b18",
    theme_color: "#071f1c",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}

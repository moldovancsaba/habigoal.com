import type { MetadataRoute } from "next";
import { getSemanticTone, getThemeFoundation } from "@/theme/semantic-theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Habigoal",
    short_name: "Habigoal",
    description: "Mobile-first daily habits, wellbeing, and support actions.",
    start_url: "/en/habigoal",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: getThemeFoundation("light").appBg,
    theme_color: getSemanticTone("light", "knowmore").color,
    icons: [
      {
        src: "/images/habigoal_logo.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}

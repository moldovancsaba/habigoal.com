import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  transpilePackages: ["@sovereignsquad/gds-theme", "@sovereignsquad/gds-core", "@sovereignsquad/gds-admin"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ibb.co" },
      { protocol: "https", hostname: "ibb.co" },
      { protocol: "https", hostname: "image.ibb.co" }
    ]
  }
};

export default withNextIntl(nextConfig);

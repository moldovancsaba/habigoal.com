import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  transpilePackages: ["@doneisbetter/gds-theme", "@doneisbetter/gds-core", "@doneisbetter/gds-admin"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ibb.co" },
      { protocol: "https", hostname: "ibb.co" },
      { protocol: "https", hostname: "image.ibb.co" }
    ]
  }
};

export default withNextIntl(nextConfig);

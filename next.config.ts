import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";

const withNextIntl = createNextIntlPlugin();
const projectRoot = process.cwd();

const nextConfig: NextConfig = {
  transpilePackages: ["@doneisbetter/gds-theme", "@doneisbetter/gds-core", "@doneisbetter/gds-admin"],
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.modules = [path.join(projectRoot, "node_modules"), ...(config.resolve.modules ?? [])];
    config.resolve.symlinks = false;
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ibb.co" },
      { protocol: "https", hostname: "ibb.co" },
      { protocol: "https", hostname: "image.ibb.co" }
    ]
  }
};

export default withNextIntl(nextConfig);

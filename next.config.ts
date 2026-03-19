import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost"],
  devIndicators: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

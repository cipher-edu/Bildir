import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@mediapipe/face_detection",
    "@mediapipe/camera_utils",
    "@mediapipe/tasks-vision",
  ],
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "osiyonigohi.uz" },
      { protocol: "https", hostname: "api-osiyo-nigohi.nsuni.uz" },
      { protocol: "https", hostname: "osiyo-nigohi.nsuni.uz" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://exam_core:8000/api"}/:path*`,
      },
    ];
  },
};

export default nextConfig;

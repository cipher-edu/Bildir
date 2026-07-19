import type { NextConfig } from "next";

/**
 * API proksi app/api/v1/[...path]/route.ts da (runtime).
 * Rewrite kerak emas — redirect loop bo'lmasin.
 */
const nextConfig: NextConfig = {
  output: "standalone",
  skipTrailingSlashRedirect: true,
  transpilePackages: [
    "@mediapipe/face_detection",
    "@mediapipe/camera_utils",
    "@mediapipe/tasks-vision",
  ],
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "osiyonigohi.uz" },
      { protocol: "https", hostname: "api-osiyo-nigohi.nsuni.uz" },
      { protocol: "https", hostname: "osiyo-nigohi.nsuni.uz" },
    ],
  },
};

export default nextConfig;

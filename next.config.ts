import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    'blaspheme-overdress-tropics.ngrok-free.dev',
    '*.ngrok-free.dev',
    '*.ngrok.app',
    '*.loca.lt',
    '10.137.17.97',
    'localhost:3000',
  ],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

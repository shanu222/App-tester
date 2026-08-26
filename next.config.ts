import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["googleapis", "google-auth-library"],
  async redirects() {
    return [
      { source: "/login", destination: "/dashboard", permanent: false },
      { source: "/register", destination: "/dashboard", permanent: false },
      { source: "/forgot-password", destination: "/dashboard", permanent: false },
      { source: "/reset-password", destination: "/dashboard", permanent: false },
      { source: "/verify-email", destination: "/dashboard", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

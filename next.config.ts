import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server to be opened from another device on the LAN.
  // Add this machine's LAN IP(s) here — update if it changes (run `ipconfig`).
  allowedDevOrigins: ["192.168.1.123"],
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
  // Cross-origin isolation enables SharedArrayBuffer, which the Zoom Web SDK needs
  // for gallery view / multi-video (seeing your own tile). We apply it ONLY when a
  // page opts in with `?coi=1` — the live room adds that flag (and reloads) for Zoom
  // meetings specifically. Every other page — including non-Zoom events that embed a
  // YouTube/Vimeo <iframe> — stays un-isolated, so those third-party embeds keep
  // working on all browsers (Safari/Firefox don't support credentialless iframes).
  async headers() {
    return [
      {
        source: "/:path*",
        has: [{ type: "query", key: "coi", value: "1" }],
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
      {
        // The Zoom iframe page also needs isolation for SharedArrayBuffer.
        source: "/zoom-meeting.html",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

export default nextConfig;

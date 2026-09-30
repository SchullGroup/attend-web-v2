import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
  // The identity-verification wizard's routes, retired 2026-09-10 when verification became a
  // modal raised at the point of use. /intro and /success were live entry points and may sit in
  // bookmarks or old transactional email, so they land on the AGM hub — now where verification
  // is prompted — rather than a 404. Temporary (307), since these paths may be reused.
  async redirects() {
    return ["/intro", "/success", "/bvn", "/chn", "/liveness", "/face-capture"].map((source) => ({
      source,
      destination: "/agm",
      permanent: false,
    }));
  },
  // Cross-origin isolation enables SharedArrayBuffer, which the Zoom Web SDK needs
  // for gallery view / multi-video (seeing your own tile). We apply it ONLY when a
  // page opts in with `?coi=1` ΓÇö the live room adds that flag (and reloads) for Zoom
  // meetings specifically. Every other page ΓÇö including non-Zoom events that embed a
  // YouTube/Vimeo <iframe> ΓÇö stays un-isolated, so those third-party embeds keep
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

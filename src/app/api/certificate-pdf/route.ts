import { NextRequest } from "next/server";

/**
 * Same-origin certificate PDF proxy — mirrors `src/app/api/proxy-image/route.ts`'s reasoning
 * exactly, for the same reason.
 *
 * The certificate download route (`/api/v1/public/certificates/{id}/download`) 302s to
 * `attend-assets-prod.obs.af-south-1.myhuaweicloud.com`, and that bucket sends no
 * `Access-Control-Allow-Origin`. Confirmed in the browser console (2026-09-09):
 *
 *   "Access to fetch at 'https://attend-assets-prod.obs...' (redirected from
 *   '.../certificates/{id}/download') from origin 'http://localhost:3000' has been
 *   blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present..."
 *
 * A browser `fetch()` of that URL can never read the response, no matter what headers we
 * send — CORS is enforced against what the *final* response sends back, which is Huawei's
 * bucket, not anything under this app's control. A server-to-server fetch has no such
 * restriction (CORS is a browser-enforced policy only), so this route fetches the PDF here
 * and re-serves it from our own origin; the browser's `fetch()` of *this* route is same-origin
 * and succeeds.
 *
 * Only accepts the exact certificate-download shape, not an arbitrary path — this is a proxy
 * for one known route, not an open relay.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const DOWNLOAD_PATH = /^\/api\/v1\/public\/certificates\/[a-zA-Z0-9-]+\/download$/;

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path || !DOWNLOAD_PATH.test(path)) {
    return new Response("bad path", { status: 400 });
  }

  let upstream: Response;
  try {
    // Node's fetch follows redirects by default, so this lands on the Huawei OBS bytes
    // directly — same server-side call `downloadCertificatePdf` makes, just not proxied
    // through the browser this time.
    upstream = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  } catch {
    return new Response("upstream fetch failed", { status: 502 });
  }

  if (!upstream.ok) {
    return new Response(`upstream ${upstream.status}`, { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/pdf",
      // Deliberately no Content-Disposition — this route is only ever hit for the inline
      // preview (the download button hits the real endpoint directly, where forcing a save
      // is exactly what's wanted).
      "Cache-Control": "private, max-age=300",
    },
  });
}

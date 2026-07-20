import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/lib/user-store";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Attend — Enterprise Events Platform",
  description: "AGMs, product launches, innovation challenges and more.",
  openGraph: {
    title: "Attend — Enterprise Events Platform",
    description: "AGMs, product launches, innovation challenges and more.",
    url: "https://attend-web-eight.vercel.app",
    siteName: "Attend",
    images: [
      {
        url: "https://attend-web-eight.vercel.app/attend-logo.png",
        width: 1200,
        height: 630,
        alt: "Attend - Enterprise Events Platform",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Attend — Enterprise Events Platform",
    description: "AGMs, product launches, innovation challenges and more.",
    images: ["https://attend-web-eight.vercel.app/attend-logo.png"],
  },
};

import { QueryProvider } from "@/components/providers/query-provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <QueryProvider>
          <UserProvider>{children}</UserProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

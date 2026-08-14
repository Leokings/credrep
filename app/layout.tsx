import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSiteUrl } from "../lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateMetadata(): Metadata {
  return {
    metadataBase: getSiteUrl(),
    title: "Credence — Forecast with reputation",
    description:
      "Back live public questions with your own non-transferable reputation and build a calibration-aware prediction score.",
    openGraph: {
      title: "Credence — Forecast with reputation",
      description: "Live questions. Your REP. Your prediction record.",
      images: [{ url: "/og-v2.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Credence — Forecast with reputation",
      description: "Live questions. Your REP. Your prediction record.",
      images: ["/og-v2.png"],
    },
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

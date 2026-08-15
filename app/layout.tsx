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
    applicationName: "CREDREP",
    title: "CREDREP — Forecast with reputation",
    description:
      "Back live public questions with your own non-transferable reputation and build a calibration-aware prediction score.",
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: "CREDREP",
      url: "/",
      title: "CREDREP — Forecast with reputation",
      description: "Live questions. Your REP. Your prediction record.",
    },
    twitter: {
      card: "summary_large_image",
      title: "CREDREP — Forecast with reputation",
      description: "Live questions. Your REP. Your prediction record.",
    },
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    appleWebApp: { title: "CREDREP" },
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

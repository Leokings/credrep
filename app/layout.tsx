import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const rawHost =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const host = /^[a-z0-9.-]+(?::\d+)?$/i.test(rawHost)
    ? rawHost
    : "localhost:3000";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : host.startsWith("localhost")
        ? "http"
        : "https";
  const socialImage = `${protocol}://${host}/og-v2.png`;

  return {
    title: "Credence — Forecast with reputation",
    description:
      "Back live public questions with your own non-transferable reputation and build a calibration-aware prediction score.",
    openGraph: {
      title: "Credence — Forecast with reputation",
      description: "Live questions. Your REP. Your prediction record.",
      images: [{ url: socialImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Credence — Forecast with reputation",
      description: "Live questions. Your REP. Your prediction record.",
      images: [socialImage],
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
      </body>
    </html>
  );
}

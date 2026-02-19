import type React from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import ClientLayout from "./ClientLayout";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { getMetadataBase } from "@/lib/seo/metadata";

const inter = Inter({
  subsets: ["latin"],
  preload: true,
  display: 'swap',
  adjustFontFallback: true,
  fallback: ['system-ui', 'arial']
});

export const metadata: Metadata = {
  title: "Sorami",
  description:
    "AI-powered Japanese language learning platform with immersive tools for fluency.",
  keywords: [
    "Japanese language learning",
    "JLPT preparation",
    "AI language tutor",
    "Japanese flashcards",
    "kanji learning",
    "Japanese vocabulary",
    "language learning app",
    "Japanese study tools",
    "AI-powered learning",
    "Japanese conversation practice"
  ],
  authors: [{ name: "Sorami" }],
  creator: "Sorami",
  publisher: "Sorami",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: getMetadataBase(),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Sorami",
    title: "Sorami",
    description:
      "AI-powered Japanese language learning platform with immersive tools for fluency.",
    images: [
      {
        url: "/logo.svg",
        width: 1200,
        height: 630,
        alt: "Sorami",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sorami",
    description:
      "AI-powered Japanese language learning platform with immersive tools for fluency.",
    images: ["/logo.svg"],
    creator: "@sorami",
  },
  icons: {
    icon: "/fav.ico",
    shortcut: "/fav.ico",
    apple: "/fav.ico",
  },
  verification: {
    // Add verification codes when available
    // google: 'verification_token',
    // yandex: 'verification_token',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the per-request nonce set by middleware so Next/Clerk scripts receive it
  const cspNonce = (await headers()).get("x-nonce") || undefined;

  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/study"
      signUpFallbackRedirectUrl="/study"
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <html
        lang="en"
        suppressHydrationWarning
        className="dark"
        data-theme="dark"
        data-color-scheme="dark"
      >
        <body
          className={`${inter.className} bg-linear-to-br from-slate-900/90 via-blue-950/80 to-blue-950/90 dark:from-slate-900/90 dark:via-blue-950/80 dark:to-blue-950/90 kanji-texture atmospheric-bg`}
          suppressHydrationWarning
          data-csp-nonce={cspNonce}
          data-theme="dark"
          data-color-scheme="dark"
          style={{ colorScheme: "dark" }}
        >
          <ClientLayout nonce={cspNonce}>{children}</ClientLayout>
        </body>
      </html>
    </ClerkProvider>
  );
}

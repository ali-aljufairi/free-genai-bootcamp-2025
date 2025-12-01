import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import ClientLayout from "./ClientLayout";
import { clerkAppearance } from "@/lib/clerk-appearance";

const inter = Inter({
  subsets: ["latin"],
  preload: true,
  display: 'swap',
  adjustFontFallback: true,
  fallback: ['system-ui', 'arial']
});

export const metadata: Metadata = {
  title: {
    default: "Sorami - AI-Powered Japanese Language Learning Platform",
    template: "%s | Sorami"
  },
  description: "Elevate your Japanese language learning journey with Sorami's immersive AI-powered tools. Practice with live speaking, interactive flashcards, AI chat tutor, speech-to-image learning, and comprehensive JLPT-aligned content.",
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://sorami.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Sorami',
    title: 'Sorami - AI-Powered Japanese Language Learning Platform',
    description: 'Elevate your Japanese language learning journey with Sorami\'s immersive AI-powered tools. Practice with live speaking, interactive flashcards, AI chat tutor, and comprehensive JLPT-aligned content.',
    images: [
      {
        url: '/logo.svg',
        width: 1200,
        height: 630,
        alt: 'Sorami - Japanese Language Learning Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sorami - AI-Powered Japanese Language Learning Platform',
    description: 'Elevate your Japanese language learning journey with Sorami\'s immersive AI-powered tools.',
    images: ['/logo.svg'],
    creator: '@sorami',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/fav.ico',
    shortcut: '/fav.ico',
    apple: '/fav.ico',
  },
  verification: {
    // Add verification codes when available
    // google: 'verification_token',
    // yandex: 'verification_token',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${inter.className} bg-gradient-to-br from-sky-50/80 via-blue-50/60 to-blue-100/70 dark:from-slate-900/90 dark:via-blue-950/80 dark:to-blue-950/90 kanji-texture atmospheric-bg`}
          suppressHydrationWarning
        >
          <ClientLayout>{children}</ClientLayout>
        </body>
      </html>
    </ClerkProvider>
  );
}
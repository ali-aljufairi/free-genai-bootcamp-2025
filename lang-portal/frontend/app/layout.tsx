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
  title: "Sorami - Language Learning Portal",
  description: "Learn Japanese with AI-powered tools and interactive features",
  icons: {
    icon: '/fav.ico',
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
          className={`${inter.className} bg-gradient-to-br from-sky-50/80 via-blue-50/60 to-indigo-50/70 dark:from-slate-900/90 dark:via-blue-950/80 dark:to-indigo-950/90 paper-texture atmospheric-bg`}
          suppressHydrationWarning
        >
          <ClientLayout>{children}</ClientLayout>
        </body>
      </html>
    </ClerkProvider>
  );
}
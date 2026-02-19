import type { Metadata } from "next";

export const SEO_BASE_URL = "https://sorami.aljufairi.org";

export interface PageMetadataInput {
  title: string;
  description: string;
  path: string;
  index: boolean;
  canonical?: boolean;
  openGraphType?: "website" | "article";
}

function normalizePath(path: string): string {
  if (path === "/") {
    return "/";
  }

  if (!path.startsWith("/")) {
    return `/${path}`;
  }

  return path;
}

export function getMetadataBase(): URL {
  return new URL(SEO_BASE_URL);
}

function buildRobots(index: boolean): Metadata["robots"] {
  if (index) {
    return {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    };
  }

  return {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  };
}

export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const path = normalizePath(input.path);

  return {
    title: input.title,
    description: input.description,
    ...(input.canonical === false
      ? {}
      : {
          alternates: {
            canonical: path,
          },
        }),
    robots: buildRobots(input.index),
    openGraph: {
      type: input.openGraphType ?? "website",
      siteName: "Sorami",
      title: input.title,
      description: input.description,
      ...(input.canonical === false
        ? {}
        : {
            url: new URL(path, SEO_BASE_URL).toString(),
          }),
      images: [
        {
          url: "/logo.svg",
          width: 1200,
          height: 630,
          alt: `${input.title} - Sorami`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: ["/logo.svg"],
      creator: "@sorami",
    },
  };
}

import type { Metadata } from "next";

const rawSeoBaseUrl =
  process.env.NEXT_PUBLIC_SEO_BASE_URL ?? "https://sorami.aljufairi.org";

export const SEO_BASE_URL = rawSeoBaseUrl.replace(/\/+$/, "");

export interface PageMetadataInput {
  title: string;
  description: string;
  path: string;
  index: boolean;
  canonical?: boolean;
  openGraphType?: "website" | "article";
}

function normalizePath(path: string): string {
  const trimmedPath = path.trim();

  if (!trimmedPath || trimmedPath === "/") {
    return "/";
  }

  const withoutLeadingSlash = trimmedPath.replace(/^\/+/, "");
  const withLeadingSlash = `/${withoutLeadingSlash}`;

  const normalized = withLeadingSlash.replace(/\/+$/, "");
  return normalized || "/";
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
          url: "/og-image.png",
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
      images: ["/og-image.png"],
      creator: "@sorami",
    },
  };
}

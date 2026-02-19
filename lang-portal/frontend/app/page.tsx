import HomePageClient from "./home-page-client";
import { buildPageMetadata, SEO_BASE_URL } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Sorami",
  description:
    "AI-powered Japanese language learning platform with immersive tools for fluency.",
  path: "/",
  index: true,
});

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Sorami",
  alternateName: "空見",
  description:
    "AI-powered Japanese language learning platform with immersive tools for fluency.",
  url: SEO_BASE_URL,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "AI Live Speaking Practice",
    "AI Chat Tutor",
    "Speech-to-Image Learning",
    "Interactive Flashcards",
    "JLPT-Aligned Content",
    "Progress Tracking",
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HomePageClient />
    </>
  );
}

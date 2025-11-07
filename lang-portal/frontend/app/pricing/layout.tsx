import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Pricing",
    description: "Choose the perfect plan for your Japanese language learning journey. Free tier available with limited features, or upgrade to Pro for unlimited access to all AI-powered learning tools.",
    openGraph: {
        title: "Pricing | Sorami",
        description: "Choose the perfect plan for your Japanese language learning journey.",
        type: "website",
    },
    twitter: {
        card: "summary",
        title: "Pricing | Sorami",
        description: "Choose the perfect plan for your Japanese language learning journey.",
    },
}

export default function PricingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}


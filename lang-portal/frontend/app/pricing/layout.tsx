import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata = buildPageMetadata({
    title: "Pricing",
    description: "Compare Sorami plans and choose the one that fits your learning goals.",
    path: "/pricing",
    index: true,
})

export default function PricingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}

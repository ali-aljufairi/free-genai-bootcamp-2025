"use client"

import React from "react"
import { CompanionStudy } from "@/components/study/companion-study"
import { useRouter } from "next/navigation"
import { navigateWithTransition } from "@/lib/view-transitions"

interface PageParams {
    id: string;
}

export default function CompanionStudySessionPage({
    params
}: {
    params: Promise<PageParams>
}) {
    const { id } = React.use(params)
    const router = useRouter()

    const handleComplete = async () => {
        await navigateWithTransition(router, "/dashboard", {
            transitionName: 'page',
        })
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3">
                <h1 className="text-3xl font-bold tracking-tight">Companion Study Session</h1>
            </div>
            <CompanionStudy sessionId={id} onComplete={handleComplete} />
        </div>
    )
} 
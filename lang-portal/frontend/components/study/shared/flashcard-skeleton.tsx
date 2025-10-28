"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

interface FlashcardSkeletonProps {
  isMobile?: boolean
}

export function FlashcardSkeleton({ isMobile = false }: FlashcardSkeletonProps) {
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen">
        {/* Progress Bar */}
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        {/* Question Card */}
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center space-y-4">
              <Skeleton className="h-16 w-32 mx-auto" />
              <Skeleton className="h-8 w-48 mx-auto" />
              <Skeleton className="h-6 w-36 mx-auto" />
            </CardContent>
          </Card>
        </div>

        {/* Answer Options */}
        <div className="px-4 pb-safe pb-4 space-y-2.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-15 w-full rounded-md" />
          ))}
        </div>
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-3 w-full rounded-full" />

      {/* Question Card with Options */}
      <Card className="w-full">
        <CardContent className="p-12">
          <div className="text-center space-y-6 mb-12">
            <Skeleton className="h-24 w-48 mx-auto" />
            <Skeleton className="h-12 w-64 mx-auto" />
            <Skeleton className="h-8 w-48 mx-auto" />
          </div>

          {/* Answer Options Grid */}
          <div className="grid grid-cols-2 gap-8">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

interface ConfigSkeletonProps {
  isMobile?: boolean
}

export function ConfigSkeleton({ isMobile = false }: ConfigSkeletonProps) {
  if (isMobile) {
    return (
      <div className="pb-20">
        {/* Quick Settings Card */}
        <Card className="glass-card mb-4">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="h-5 w-24" />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-12 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course & Unit */}
        <Card className="glass-card mb-4">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="h-5 w-32" />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-12 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Display Options */}
        <Card className="glass-card mb-4">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="h-5 w-28" />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Start Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t">
          <Skeleton className="h-14 w-full rounded-md" />
        </div>
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="h-full min-h-screen flex flex-col">
      <Card className="glass-card flex-1 m-4">
        <CardContent className="p-8 space-y-8 h-full flex flex-col">
          {/* Study Settings */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-border/50">
              <Skeleton className="w-6 h-6" />
              <div className="space-y-1">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Part of Speech Filter */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Display Options */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {Array.from({ length: 2 }).map((_, colIndex) => (
              <div key={colIndex} className="space-y-4">
                <div className="flex items-center gap-3 pb-2">
                  <Skeleton className="w-6 h-6" />
                  <div className="space-y-1">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>

                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-11 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Start Button */}
          <div className="pt-4 border-t border-border/50">
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

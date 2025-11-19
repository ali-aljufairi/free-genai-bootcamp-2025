"use client";

import { useGrammarList } from "@/hooks/api/useGrammar";
import { GrammarCard } from "@/components/grammar/GrammarCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function GrammarPage() {
  const { data, isLoading, error } = useGrammarList();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Grammar Points</h1>
        <p className="text-muted-foreground">
          Browse grammar points for your JLPT level and below.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load grammar points. Please try again later.
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && data && (
        <>
          {data.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No grammar points found for your current JLPT level.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">
                Showing {data.length} grammar point{data.length !== 1 ? "s" : ""}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.map((grammarPoint) => (
                  <GrammarCard key={grammarPoint.id} grammarPoint={grammarPoint} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}


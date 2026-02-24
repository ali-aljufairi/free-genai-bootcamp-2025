"use client";

import { useGrammarDetail } from "@/hooks/api/useGrammar";
import { GrammarDetail } from "@/components/grammar/GrammarDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubscriptionGate } from "@/components/subscription/subscription-gate";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function GrammarDetailPage() {
  const params = useParams();
  const id = parseInt(params.id as string, 10);
  const { data, isLoading, error } = useGrammarDetail(id);

  return (
    <SubscriptionGate feature="Grammar Browser">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/grammar">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Grammar Detail</h1>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-32" />
            <Skeleton className="h-64" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load grammar point. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && data && <GrammarDetail grammarPoint={data} />}
      </div>
    </SubscriptionGate>
  );
}

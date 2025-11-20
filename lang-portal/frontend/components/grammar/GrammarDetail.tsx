"use client";

import { useState } from "react";
import { GrammarPointDetail, useMarkGrammarAsLearned } from "@/hooks/api/useGrammar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GrammarExampleList } from "./GrammarExampleList";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, AlertTriangle, Sparkles, CheckCircle2, Loader2, Award } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GrammarDetailProps {
  grammarPoint: GrammarPointDetail;
}

// Color mapping for JLPT levels
const levelColors: Record<string, string> = {
  N5: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400",
  N4: "bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/20 dark:text-green-400",
  N3: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:bg-yellow-500/20 dark:text-yellow-400",
  N2: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400",
  N1: "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400",
};

export function GrammarDetail({ grammarPoint }: GrammarDetailProps) {
  const [isMarking, setIsMarking] = useState(false);
  const [isMarked, setIsMarked] = useState(grammarPoint.is_learned || false);
  const { markAsLearned } = useMarkGrammarAsLearned();
  const levelColor = levelColors[grammarPoint.level] || levelColors.N5;

  const handleMarkAsLearned = async () => {
    setIsMarking(true);
    try {
      await markAsLearned(grammarPoint.id);
      setIsMarked(true);
      toast.success("Grammar point marked as learned!", {
        description: "This grammar point has been added to your SRS review schedule.",
      });
    } catch (error) {
      toast.error("Failed to mark as learned", {
        description: "Please try again later.",
      });
    } finally {
      setIsMarking(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{grammarPoint.key}</h1>
            {grammarPoint.base_form !== grammarPoint.key && (
              <span className="text-xl text-muted-foreground">
                ({grammarPoint.base_form})
              </span>
            )}
            <Badge 
              variant="outline" 
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium border rounded-full shrink-0",
                levelColor
              )}
            >
              <Award className="h-3 w-3" />
              {grammarPoint.level}
            </Badge>
          </div>
          <Button
            onClick={handleMarkAsLearned}
            disabled={isMarking || isMarked}
            variant={isMarked ? "outline" : "default"}
            className="flex items-center gap-2"
          >
            {isMarking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Marking...
              </>
            ) : isMarked ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Marked as Learned
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Mark as Learned
              </>
            )}
          </Button>
        </div>

        {grammarPoint.structure && (
          <div className="text-lg text-muted-foreground">
            <span className="font-medium">Structure: </span>
            {grammarPoint.structure}
          </div>
        )}
      </div>

      <Separator />

      {/* Details */}
      {grammarPoint.details && (
        <div className="space-y-4">
          {grammarPoint.details.meaning && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Meaning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base">{grammarPoint.details.meaning}</p>
              </CardContent>
            </Card>
          )}

          {grammarPoint.details.notes && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base whitespace-pre-wrap">
                  {grammarPoint.details.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {grammarPoint.details.caution && grammarPoint.details.caution.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Caution</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {grammarPoint.details.caution.map((caution, index) => (
                    <li key={index}>{caution}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {grammarPoint.details.fun_fact && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>Fun Fact</AlertTitle>
              <AlertDescription>{grammarPoint.details.fun_fact}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Examples */}
      {grammarPoint.examples && grammarPoint.examples.length > 0 && (
        <GrammarExampleList
          examples={grammarPoint.examples}
          readings={grammarPoint.readings}
        />
      )}
    </div>
  );
}


"use client";

import { useState } from "react";
import { GrammarPointDetail, useMarkGrammarAsLearned } from "@/hooks/api/useGrammar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GrammarExampleList } from "./GrammarExampleList";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, AlertTriangle, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GrammarDetailProps {
  grammarPoint: GrammarPointDetail;
}

export function GrammarDetail({ grammarPoint }: GrammarDetailProps) {
  const [isMarking, setIsMarking] = useState(false);
  const [isMarked, setIsMarked] = useState(grammarPoint.is_learned || false);
  const { markAsLearned } = useMarkGrammarAsLearned();

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
            <Badge variant="secondary" className="text-base px-3 py-1">
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


"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GrammarPoint } from "@/hooks/api/useGrammar";
import Link from "next/link";
import { Award, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GrammarCardProps {
  grammarPoint: GrammarPoint;
}

// Color mapping for JLPT levels
const levelColors: Record<string, string> = {
  N5: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400",
  N4: "bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/20 dark:text-green-400",
  N3: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:bg-yellow-500/20 dark:text-yellow-400",
  N2: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400",
  N1: "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400",
};

export function GrammarCard({ grammarPoint }: GrammarCardProps) {
  const levelColor = levelColors[grammarPoint.level] || levelColors.N5;

  return (
    <Link href={`/grammar/${grammarPoint.id}`}>
      <Card className="glass-card hover:shadow-lg transition-shadow cursor-pointer h-full relative">
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
          {grammarPoint.is_learned && (
            <Badge
              variant="outline"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium border rounded-full bg-green-500/10 text-green-700 border-green-500/20 dark:bg-green-500/20 dark:text-green-400"
            >
              <CheckCircle2 className="h-3 w-3" />
              Learned
            </Badge>
          )}
          <Badge 
            variant="outline" 
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium border rounded-full",
              levelColor
            )}
          >
            <Award className="h-3 w-3" />
            {grammarPoint.level}
          </Badge>
        </div>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-medium flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{grammarPoint.key}</span>
              {grammarPoint.base_form !== grammarPoint.key && (
                <span className="text-lg text-muted-foreground font-normal">
                  ({grammarPoint.base_form})
                </span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {grammarPoint.structure && (
            <p className="text-base text-muted-foreground line-clamp-2">
              {grammarPoint.structure}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}



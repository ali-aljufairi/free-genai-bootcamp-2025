"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GrammarPoint } from "@/hooks/api/useGrammar";
import Link from "next/link";

interface GrammarCardProps {
  grammarPoint: GrammarPoint;
}

export function GrammarCard({ grammarPoint }: GrammarCardProps) {
  return (
    <Link href={`/grammar/${grammarPoint.id}`}>
      <Card className="glass-card hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{grammarPoint.key}</span>
              {grammarPoint.base_form !== grammarPoint.key && (
                <span className="text-base text-muted-foreground font-normal">
                  ({grammarPoint.base_form})
                </span>
              )}
            </div>
            <Badge variant="secondary">{grammarPoint.level}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {grammarPoint.structure && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {grammarPoint.structure}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}


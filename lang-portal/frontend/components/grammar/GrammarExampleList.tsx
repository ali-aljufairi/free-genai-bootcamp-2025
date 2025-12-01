"use client";

import { GrammarExample, GrammarReading } from "@/hooks/api/useGrammar";
import { Card, CardContent } from "@/components/ui/card";
import { GrammarReadingDisplay } from "./GrammarReadingDisplay";

interface GrammarExampleListProps {
  examples: GrammarExample[];
  readings?: GrammarReading[];
}

export function GrammarExampleList({ examples, readings }: GrammarExampleListProps) {
  if (!examples || examples.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Examples</h3>
      <div className="space-y-2">
        {examples.map((example) => (
          <Card key={example.id} className="glass-card">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="text-base">
                  {readings && readings.length > 0 ? (
                    <GrammarReadingDisplay
                      readings={readings}
                      text={example.japanese}
                    />
                  ) : (
                    <span>{example.japanese}</span>
                  )}
                </div>
                {example.english && (
                  <div className="text-sm text-muted-foreground">
                    {example.english}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}






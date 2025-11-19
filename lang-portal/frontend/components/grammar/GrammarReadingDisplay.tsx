"use client";

import { GrammarReading } from "@/hooks/api/useGrammar";

interface GrammarReadingDisplayProps {
  readings: GrammarReading[];
  text: string;
}

export function GrammarReadingDisplay({ readings, text }: GrammarReadingDisplayProps) {
  if (!readings || readings.length === 0) {
    return <span>{text}</span>;
  }

  // Sort readings by position
  const sortedReadings = [...readings].sort((a, b) => a.position - b.position);
  
  // Create a map of kanji to reading for quick lookup
  const readingMap = new Map<string, string>();
  sortedReadings.forEach((reading) => {
    readingMap.set(reading.kanji, reading.reading);
  });

  // Simple display: show text with readings as tooltips or inline
  // For now, we'll show the text with readings in parentheses
  return (
    <span className="inline-block">
      {text}
      {sortedReadings.length > 0 && (
        <span className="text-xs text-muted-foreground ml-2">
          ({sortedReadings.map((r) => `${r.kanji}(${r.reading})`).join(", ")})
        </span>
      )}
    </span>
  );
}


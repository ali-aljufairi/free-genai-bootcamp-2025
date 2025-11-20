"use client";

import { GrammarReading } from "@/hooks/api/useGrammar";

interface GrammarReadingDisplayProps {
  readings: GrammarReading[];
  text: string;
}

// Helper function to check if a character is a kanji
function isKanji(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4e00 && code <= 0x9faf) || // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
    (code >= 0x20000 && code <= 0x2a6df) || // CJK Extension B
    (code >= 0x2a700 && code <= 0x2b73f) || // CJK Extension C
    (code >= 0x2b740 && code <= 0x2b81f) || // CJK Extension D
    (code >= 0xf900 && code <= 0xfaff) // CJK Compatibility Ideographs
  );
}

export function GrammarReadingDisplay({ readings, text }: GrammarReadingDisplayProps) {
  if (!readings || readings.length === 0) {
    return <span>{text}</span>;
  }

  // Create maps for quick lookup
  // Map single kanji to reading
  const singleKanjiMap = new Map<string, string>();
  // Map multi-character sequences to reading (sorted by length, longest first)
  const multiKanjiMap = new Map<string, string>();

  readings.forEach((reading) => {
    if (reading.kanji.length === 1) {
      // Single kanji - use first reading if multiple exist
      if (!singleKanjiMap.has(reading.kanji)) {
        singleKanjiMap.set(reading.kanji, reading.reading);
      }
    } else {
      // Multi-character sequence
      multiKanjiMap.set(reading.kanji, reading.reading);
    }
  });

  // Sort multi-character sequences by length (longest first) for proper matching
  const multiKanjiEntries = Array.from(multiKanjiMap.entries()).sort(
    (a, b) => b[0].length - a[0].length
  );

  // Build the ruby-annotated text
  const result: (string | React.ReactElement)[] = [];
  const textArray = Array.from(text);
  let i = 0;

  while (i < textArray.length) {
    let matched = false;

    // First, try to match multi-character kanji sequences (longest first)
    for (const [kanjiSequence, reading] of multiKanjiEntries) {
      const sequenceLength = kanjiSequence.length;
      if (i + sequenceLength <= textArray.length) {
        const textSequence = textArray.slice(i, i + sequenceLength).join('');
        if (textSequence === kanjiSequence) {
          // Found a matching multi-character kanji sequence
          result.push(
            <ruby key={i}>
              {kanjiSequence}
              <rp>(</rp>
              <rt>{reading}</rt>
              <rp>)</rp>
            </ruby>
          );
          i += sequenceLength;
          matched = true;
          break;
        }
      }
    }

    // If no multi-character match, check single kanji
    if (!matched) {
      const char = textArray[i];
      if (isKanji(char)) {
        const reading = singleKanjiMap.get(char);
        if (reading) {
          // Create ruby annotation for single kanji
          result.push(
            <ruby key={i}>
              {char}
              <rp>(</rp>
              <rt>{reading}</rt>
              <rp>)</rp>
            </ruby>
          );
        } else {
          // Kanji without reading, just add the character
          result.push(char);
        }
        i++;
      } else {
        // Not a kanji, just add the character
        result.push(char);
        i++;
      }
    }
  }

  return <span className="inline-block ruby-text">{result}</span>;
}



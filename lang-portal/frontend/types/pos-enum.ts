/**
 * Part of Speech Enum
 * 
 * This enum matches the PostgreSQL pos_enum type defined in the database schema.
 * These are the valid part of speech values that can be used for filtering flashcards.
 */
export enum PartOfSpeech {
  NOUN = 'noun',
  VERB = 'verb',
  ADJECTIVE = 'adjective',
  ADVERB = 'adverb',
  PARTICLE = 'particle',
  CONJUNCTION = 'conjunction',
  INTERJECTION = 'interjection',
  AUXILIARY = 'auxiliary',
  PREFIX = 'prefix',
  SUFFIX = 'suffix',
  COUNTER = 'counter',
  EXPRESSION = 'expression',
  UNCLASSIFIED = 'unclassified',
}

/**
 * Array of all part of speech values for easy iteration
 */
export const PARTS_OF_SPEECH = Object.values(PartOfSpeech);

/**
 * Human-readable labels for parts of speech
 */
export const PART_OF_SPEECH_LABELS: Record<PartOfSpeech, string> = {
  [PartOfSpeech.NOUN]: 'Noun',
  [PartOfSpeech.VERB]: 'Verb',
  [PartOfSpeech.ADJECTIVE]: 'Adjective',
  [PartOfSpeech.ADVERB]: 'Adverb',
  [PartOfSpeech.PARTICLE]: 'Particle',
  [PartOfSpeech.CONJUNCTION]: 'Conjunction',
  [PartOfSpeech.INTERJECTION]: 'Interjection',
  [PartOfSpeech.AUXILIARY]: 'Auxiliary',
  [PartOfSpeech.PREFIX]: 'Prefix',
  [PartOfSpeech.SUFFIX]: 'Suffix',
  [PartOfSpeech.COUNTER]: 'Counter',
  [PartOfSpeech.EXPRESSION]: 'Expression',
  [PartOfSpeech.UNCLASSIFIED]: 'Unclassified',
};

/**
 * Type guard to check if a string is a valid part of speech
 */
export function isValidPartOfSpeech(value: string): value is PartOfSpeech {
  return Object.values(PartOfSpeech).includes(value as PartOfSpeech);
}

/**
 * Get the human-readable label for a part of speech
 */
export function getPartOfSpeechLabel(pos: PartOfSpeech): string {
  return PART_OF_SPEECH_LABELS[pos];
}

import { z } from 'zod'

export const FlashcardConfigSchema = z.object({
  level: z.number().min(1).max(5),
  selectedCourse: z.number().nullable(),
  selectedUnit: z.number().nullable(),
  count: z.number().min(1).max(100),
  selectedPartsOfSpeech: z.array(z.string()),
  
  // Show options
  showKana: z.boolean(),
  showKanji: z.boolean(),
  showRomaji: z.boolean(),
  showEnglish: z.boolean(),
  
  // Ask options  
  askForKana: z.boolean(),
  askForKanji: z.boolean(),
  askForRomaji: z.boolean(),
  askForEnglish: z.boolean(),
}).refine((data) => {
  // Must have at least one ask option
  return data.askForKana || data.askForKanji || data.askForRomaji || 
         data.askForEnglish
}, {
  message: "At least one 'ask for' option must be selected",
  path: ['askOptions']
}).refine((data) => {
  // Must have at least one show option
  return data.showKana || data.showKanji || data.showRomaji || 
         data.showEnglish
}, {
  message: "At least one 'show' option must be selected",
  path: ['showOptions']
}).refine((data) => {
  // Don't show what you're asking for
  const conflicts = [
    data.askForKana && data.showKana,
    data.askForKanji && data.showKanji,
    data.askForRomaji && data.showRomaji,
    data.askForEnglish && data.showEnglish
  ]
  
  return !conflicts.some(Boolean)
}, {
  message: "Cannot show and ask for the same thing",
  path: ['conflictOptions']
})

export type FlashcardConfig = z.infer<typeof FlashcardConfigSchema>

# Flashcard System v2

This document describes the new flashcard system based on API v2, which provides separate components for kanji and vocabulary study.

## Components

### KanjiFlashcard (`/components/study/kanji-flashcard.tsx`)
- Focused on kanji character study
- Displays kanji characters with optional readings (on-yomi, kun-yomi)
- Tests knowledge of English meanings
- Configurable JLPT levels (N5-N1)
- Responsive design for mobile and desktop

**Configuration Options:**
- JLPT Level (N5-N1)
- Number of cards (5-20)
- Show readings toggle

### WordsFlashcard (`/components/study/words-flashcard.tsx`)
- Focused on vocabulary study
- Displays words in hiragana, kanji, and romaji
- Tests knowledge of English translations
- Configurable display options
- Responsive design for mobile and desktop

**Configuration Options:**
- JLPT Level (N5-N1)
- Number of cards (5-20)
- Show romaji toggle
- Show kanji toggle

## Routes

### Direct Access Routes
- `/study/flashcards` - Main flashcard hub
- `/study/flashcards/kanji` - Direct kanji study
- `/study/flashcards/words` - Direct vocabulary study

### Study Session Routes
- `/study/kanji/[id]` - Kanji study session
- `/study/words/[id]` - Word study session
- `/study/flashcards/[id]` - Legacy flashcard session

## API Integration

Both components use the new API v2 flashcard system:
- `flashcardsV2Api.start(config)` - Start new session
- Supports different content sources (JLPT, groups, units)
- Configurable practice options for both kanji and words
- Real-time scoring and progress tracking

## Features

### User Experience
- Smooth animations and transitions
- Mobile-responsive design
- Real-time feedback on answers
- Progress tracking with score display
- Configurable difficulty levels

### Study Options
- **Kanji Study**: Character recognition, meaning association
- **Word Study**: Vocabulary recognition, translation practice
- **Legacy Support**: Maintains compatibility with old flashcard system

### Navigation
Users can access the new flashcard system through:
1. Study Session Hub - Choose "Word Flashcards" or "Kanji Flashcards"
2. Direct navigation to `/study/flashcards`
3. Legacy routing through study sessions

## Technical Details

### State Management
- Session state managed locally in each component
- Configuration persistence during study session
- Real-time score calculation and display

### API Configuration
```typescript
// Kanji Configuration
const config: FlashcardConfig = {
    flashcard_type: 'kanji',
    content_source: 'jlpt',
    kanji_options: {
        show_character: true,
        ask_for_english: true,
        // ... other options
    }
}

// Word Configuration
const config: FlashcardConfig = {
    flashcard_type: 'word',
    content_source: 'jlpt',
    word_options: {
        show_kana: true,
        show_kanji: true,
        ask_for_english: true,
        // ... other options
    }
}
```

### Responsive Design
- Mobile: Single column layout, larger touch targets
- Desktop: Grid layout, larger text for better visibility
- Consistent glass-card styling with backdrop blur effects

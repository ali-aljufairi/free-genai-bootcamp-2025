# Mobile Study Session Implementation Guide

**Date:** October 6, 2025  
**Component:** Word Flashcard Study Session (Mobile & Desktop)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Key Features](#key-features)
4. [Implementation Details](#implementation-details)
5. [Component Structure](#component-structure)
6. [Styling Guidelines](#styling-guidelines)
7. [State Management](#state-management)
8. [How to Apply This Pattern to Other Components](#how-to-apply-this-pattern-to-other-components)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This guide documents the mobile-first study session implementation for the Sorami language learning platform. The system provides a seamless, immersive learning experience with automatic session management and consistent design across mobile and desktop devices.

### Core Principles

1. **Auto-start sessions** - Skip configuration if user preferences exist
2. **Fullscreen mobile experience** - Immersive, distraction-free interface
3. **Consistent feedback** - Visual indicators for correct/incorrect answers
4. **Persistent preferences** - Zustand store maintains user settings
5. **Responsive design** - Optimized for both mobile and desktop

---

## Architecture

### File Structure

```
frontend/
├── app/
│   └── study/
│       └── words/
│           └── page.tsx                      # Page wrapper
├── components/
│   ├── study/
│   │   ├── mobile-study-session.tsx          # Mobile-specific UI ⭐
│   │   └── words-flashcard.tsx               # Main logic component ⭐
│   └── sidebar.tsx                           # Navigation (hides on active sessions) ⭐
└── stores/
    └── flashcard-store.ts                    # Zustand state management
```

---

## Key Features

### 1. **Auto-Start Functionality**

The study session automatically starts if the user has valid saved preferences:

```typescript
// Auto-start session if preferences exist
useEffect(() => {
    const hasValidConfig = askForKana || askForKanji || askForRomaji || 
                          askForEnglish || askForPartOfSpeech
    
    if (hasValidConfig && !hasAutoStarted && !session && !showResults) {
        setHasAutoStarted(true)
        startSession()
    } else if (!hasValidConfig && !hasAutoStarted) {
        setShowConfig(true)
        setHasAutoStarted(true)
    }
}, [hasAutoStarted, session, showResults])
```

**Benefits:**
- Users don't see configuration page every time
- Faster study session start
- Settings accessible via settings button when needed

---

### 2. **Fullscreen Mobile Experience**

Mobile study sessions take over the entire screen:

```tsx
// Mobile component uses fixed positioning
<div className="fixed inset-0 z-50 bg-background flex flex-col">
```

**Features:**
- Hides main app navigation
- Own burger menu for consistency
- Settings and exit buttons in header
- Immersive, distraction-free learning

---

### 3. **Visual Feedback System**

Enhanced color feedback for answer selection:

```tsx
const isCorrectAnswer = index === currentCard.correct_index
const isSelectedWrong = selectedOption === index && !isCorrectAnswer
const isUnselected = selectedOption !== null && selectedOption !== index && !isCorrectAnswer

// Apply classes based on state
className={`
    ${isCorrectAnswer ? 
        "!bg-green-500 !text-white !border-green-600 shadow-lg shadow-green-500/50" : 
    isSelectedWrong ? 
        "!bg-red-500 !text-white !border-red-600 shadow-lg shadow-red-500/50" : 
    isUnselected ? 
        "opacity-40 bg-muted/20 border-muted" : 
        "bg-background/50 hover:bg-accent/70 hover:border-primary/40"
    }
`}
```

**Visual States:**
- ✅ **Green** - Correct answer (with shadow)
- ❌ **Red** - Wrong answer (with shadow)
- 🔘 **Dimmed** - Unselected options
- 🎯 **Default** - Interactive state before selection

---

### 4. **Conditional Navigation**

Sidebar burger menu hides during active study sessions:

```tsx
// In sidebar.tsx
const isStudySessionActive = pathname?.startsWith("/study/") && pathname !== "/study"

// Conditionally render mobile menu
{!isStudySessionActive && (
    <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="md:hidden absolute top-4 left-4 z-50">
            <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
            </Button>
        </SheetTrigger>
        {/* ... sheet content */}
    </Sheet>
)}
```

**Result:**
- No duplicate burger menus
- Clean study session interface
- Proper navigation on other pages

---

## Implementation Details

### Mobile Study Session Component

**File:** `/components/study/mobile-study-session.tsx`

#### Props Interface

```tsx
interface MobileStudySessionProps {
    cards: Flashcard[]
    currentIndex: number
    selectedOption: number | null
    isCorrect: boolean | null
    score: number
    showKanji: boolean
    showRomaji: boolean
    onOptionSelect: (index: number) => void
    onExit: () => void
    onShowSettings?: () => void  // Optional callback for settings
}
```

#### Key Sections

1. **Header (Top Bar)**
```tsx
<div className="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur-sm">
    <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
        <Menu className="h-5 w-5" />
    </Button>
    <div className="flex items-center gap-1">
        <Button onClick={handleSettingsClick}>
            <Settings className="h-5 w-5" />
        </Button>
        <Button onClick={onExit}>
            <X className="h-5 w-5" />
        </Button>
    </div>
</div>
```

2. **Progress Bar**
```tsx
<div className="px-4 py-2 bg-background/50 backdrop-blur-sm">
    <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-muted-foreground">
            Word {currentIndex + 1} of {cards.length}
        </span>
        <span className="text-xs font-bold text-primary">
            {score} / {cards.length}
        </span>
    </div>
    <div className="w-full bg-muted rounded-full h-1.5">
        <div className="bg-primary h-1.5 rounded-full transition-all duration-300"
             style={{ width: `${progressPercentage}%` }} />
    </div>
</div>
```

3. **Question Card**
```tsx
<div className="flex-1 flex items-center justify-center px-4 py-4">
    <Card className="glass-card w-full max-w-md">
        <CardContent className="p-6">
            {currentCard.question.kanji && showKanji && (
                <h1 className="text-5xl font-bold leading-tight">
                    {currentCard.question.kanji}
                </h1>
            )}
            {currentCard.question.kana && (
                <p className="text-4xl text-primary font-medium">
                    {currentCard.question.kana}
                </p>
            )}
            {currentCard.question.romaji && showRomaji && (
                <p className="text-base text-muted-foreground">
                    {currentCard.question.romaji}
                </p>
            )}
        </CardContent>
    </Card>
</div>
```

4. **Answer Buttons**
```tsx
<div className="px-4 pb-safe pb-4 space-y-2.5">
    {currentCard.options.map((option, index) => {
        const isCorrectAnswer = index === currentCard.correct_index
        const isSelectedWrong = selectedOption === index && !isCorrectAnswer
        
        return (
            <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
            >
                <Button
                    className={`w-full min-h-[60px] text-base font-medium 
                               transition-all duration-200 border-2 ${
                        selectedOption !== null
                            ? isCorrectAnswer
                                ? "!bg-green-500 hover:!bg-green-500 !text-white !border-green-600 shadow-lg shadow-green-500/50"
                                : isSelectedWrong
                                    ? "!bg-red-500 hover:!bg-red-500 !text-white !border-red-600 shadow-lg shadow-red-500/50"
                                    : "opacity-40 bg-muted/20 border-muted"
                            : "bg-background/50 hover:bg-accent/70 hover:border-primary/40"
                    }`}
                    variant="outline"
                    onClick={() => onOptionSelect(index)}
                    disabled={selectedOption !== null}
                >
                    {option.english || option.kana || option.romaji || option.kanji}
                </Button>
            </motion.div>
        )
    })}
</div>
```

---

## Component Structure

### Main Flashcard Component Logic

**File:** `/components/study/words-flashcard.tsx`

#### State Management

```tsx
const [session, setSession] = useState<FlashcardSession | null>(null)
const [cards, setCards] = useState<Flashcard[]>([])
const [currentIndex, setCurrentIndex] = useState(0)
const [selectedOption, setSelectedOption] = useState<number | null>(null)
const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
const [showConfig, setShowConfig] = useState(false)  // Start hidden
const [showResults, setShowResults] = useState(false)
const [answers, setAnswers] = useState<FlashcardAnswer[]>([])
const [score, setScore] = useState(0)
const [hasAutoStarted, setHasAutoStarted] = useState(false)  // Track auto-start
```

#### Zustand Store Integration

```tsx
const store = useFlashcardStore()
const {
    level, selectedCourse, selectedUnit, count, selectedPartsOfSpeech,
    showKana, showKanji, showRomaji, showEnglish, showPartOfSpeech,
    askForKana, askForKanji, askForRomaji, askForEnglish, askForPartOfSpeech,
    setLevel, setCourse, setUnit, setCount, setPartsOfSpeech,
    setShowOptions, setAskOptions, validateAndFixOptions
} = store
```

#### Desktop View with Settings Button

```tsx
// Desktop layout includes settings button in progress bar
<div className="space-y-6">
    <div className="space-y-3">
        <div className="flex justify-between text-lg text-muted-foreground items-center">
            <span>{progressText}</span>
            <div className="flex items-center gap-4">
                <span>Score: {score}/{cards.length}</span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfig(true)}
                    className="h-8 px-3 gap-2"
                >
                    <Settings className="h-4 w-4" />
                    Settings
                </Button>
            </div>
        </div>
        {/* Progress bar */}
    </div>
    {/* Question and answers */}
</div>
```

---

## Styling Guidelines

### Glass Card Effect

Used for question cards and buttons:

```css
.glass-card {
    background: rgba(var(--background), 0.6);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(var(--border), 0.2);
}
```

### Color Feedback Classes

#### Correct Answer (Green)
```css
!bg-green-500 hover:!bg-green-500 
!text-white !border-green-600 
shadow-lg shadow-green-500/50
```

#### Wrong Answer (Red)
```css
!bg-red-500 hover:!bg-red-500 
!text-white !border-red-600 
shadow-lg shadow-red-500/50
```

#### Unselected (Dimmed)
```css
opacity-40 bg-muted/20 border-muted
```

#### Interactive Default
```css
bg-background/50 hover:bg-accent/70 
hover:border-primary/40 border-border 
hover:scale-[1.01] active:scale-[0.99]
```

### Responsive Font Sizes

| Element | Mobile | Desktop |
|---------|--------|---------|
| Kanji | `text-5xl` | `text-8xl` |
| Kana | `text-4xl` | `text-5xl` |
| Romaji | `text-base` | `text-4xl` |
| Answer Buttons | `text-base` | `text-3xl` |

---

## State Management

### Zustand Store Structure

**File:** `/stores/flashcard-store.ts`

```typescript
export interface FlashcardPreferences {
  // Content Selection
  level: number
  selectedCourse: number | null
  selectedUnit: number | null
  count: number
  
  // Part of Speech Filtering
  selectedPartsOfSpeech: PartOfSpeech[]
  
  // Display Options
  showKana: boolean
  showKanji: boolean
  showRomaji: boolean
  showEnglish: boolean
  showPartOfSpeech: boolean
  
  // Ask Options (what to quiz)
  askForKana: boolean
  askForKanji: boolean
  askForRomaji: boolean
  askForEnglish: boolean
  askForPartOfSpeech: boolean
}
```

### Default Preferences

```typescript
const defaultPreferences: FlashcardPreferences = {
  level: 5,                    // N5 (Beginner)
  selectedCourse: null,
  selectedUnit: null,
  count: 10,
  
  selectedPartsOfSpeech: [],
  
  showKana: true,              // Show hiragana/katakana
  showKanji: false,
  showRomaji: false,
  showEnglish: false,
  showPartOfSpeech: false,
  
  askForKana: false,
  askForKanji: false,
  askForRomaji: false,
  askForEnglish: true,         // Ask for English translation
  askForPartOfSpeech: false,
}
```

### Persistence

The store uses Zustand's `persist` middleware to save preferences to localStorage:

```typescript
export const useFlashcardStore = create<FlashcardStore>()(
  persist(
    (set, get) => ({
      ...defaultPreferences,
      // ... actions
    }),
    {
      name: 'flashcard-preferences', // localStorage key
    }
  )
)
```

---

## How to Apply This Pattern to Other Components

### Step-by-Step Guide

#### 1. **Create a Mobile-Specific Component**

Create a new file: `components/study/mobile-[feature]-session.tsx`

```tsx
"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { X, Settings, Menu } from "lucide-react"

interface MobileFeatureSessionProps {
    // Your data props
    items: YourDataType[]
    currentIndex: number
    // User interaction state
    selectedOption: number | null
    score: number
    // Display preferences
    showOption1: boolean
    showOption2: boolean
    // Callbacks
    onSelect: (index: number) => void
    onExit: () => void
    onShowSettings?: () => void
}

export function MobileFeatureSession({
    items,
    currentIndex,
    selectedOption,
    score,
    showOption1,
    showOption2,
    onSelect,
    onExit,
    onShowSettings
}: MobileFeatureSessionProps) {
    const currentItem = items[currentIndex]
    const progressPercentage = ((currentIndex + 1) / items.length) * 100

    const handleSettingsClick = () => {
        if (onShowSettings) {
            onShowSettings()
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur-sm">
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 flex items-center justify-center">
                    <Menu className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={handleSettingsClick} 
                            className="h-9 w-9 p-0 flex items-center justify-center">
                        <Settings className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onExit} 
                            className="h-9 w-9 p-0 flex items-center justify-center">
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="px-4 py-2 bg-background/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                        Item {currentIndex + 1} of {items.length}
                    </span>
                    <span className="text-xs font-bold text-primary">
                        {score} / {items.length}
                    </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full transition-all duration-300"
                         style={{ width: `${progressPercentage}%` }} />
                </div>
            </div>

            {/* Main Content - Question/Prompt */}
            <div className="flex-1 flex items-center justify-center px-4 py-4">
                <Card className="glass-card w-full max-w-md">
                    <CardContent className="p-6">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="text-center space-y-2 min-h-[120px] flex flex-col items-center justify-center"
                        >
                            {/* Your content here */}
                            <h1 className="text-4xl font-bold">
                                {currentItem.displayText}
                            </h1>
                        </motion.div>
                    </CardContent>
                </Card>
            </div>

            {/* Answer Options */}
            <div className="px-4 pb-safe pb-4 space-y-2.5">
                {currentItem.options.map((option, index) => {
                    const isCorrectAnswer = index === currentItem.correct_index
                    const isSelectedWrong = selectedOption === index && !isCorrectAnswer
                    
                    return (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                        >
                            <Button
                                className={`w-full min-h-[60px] text-base font-medium 
                                           transition-all duration-200 border-2 ${
                                    selectedOption !== null
                                        ? isCorrectAnswer
                                            ? "!bg-green-500 hover:!bg-green-500 !text-white !border-green-600 shadow-lg shadow-green-500/50"
                                            : isSelectedWrong
                                                ? "!bg-red-500 hover:!bg-red-500 !text-white !border-red-600 shadow-lg shadow-red-500/50"
                                                : "opacity-40 bg-muted/20 border-muted"
                                        : "bg-background/50 hover:bg-accent/70 hover:border-primary/40 hover:scale-[1.01] active:scale-[0.99]"
                                }`}
                                variant="outline"
                                onClick={() => onSelect(index)}
                                disabled={selectedOption !== null}
                            >
                                {option.text}
                            </Button>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}
```

#### 2. **Update Main Component Logic**

In your main component (e.g., `components/study/your-feature.tsx`):

```tsx
export function YourFeatureComponent() {
    const isMobile = useIsMobile()
    const [session, setSession] = useState(null)
    const [items, setItems] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [showConfig, setShowConfig] = useState(false)
    const [score, setScore] = useState(0)
    const [hasAutoStarted, setHasAutoStarted] = useState(false)

    // Your Zustand store
    const store = useYourStore()
    
    // Auto-start logic
    useEffect(() => {
        const hasValidConfig = /* check if user has valid preferences */
        
        if (hasValidConfig && !hasAutoStarted && !session) {
            setHasAutoStarted(true)
            startSession()
        } else if (!hasValidConfig && !hasAutoStarted) {
            setShowConfig(true)
            setHasAutoStarted(true)
        }
    }, [hasAutoStarted, session])

    // Mobile view
    if (isMobile && session && items.length > 0) {
        return (
            <MobileFeatureSession
                items={items}
                currentIndex={currentIndex}
                selectedOption={selectedOption}
                score={score}
                showOption1={/* your preference */}
                showOption2={/* your preference */}
                onSelect={handleSelect}
                onExit={resetSession}
                onShowSettings={() => setShowConfig(true)}
            />
        )
    }

    // Desktop view with settings button
    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <span>Progress</span>
                    <div className="flex items-center gap-4">
                        <span>Score: {score}/{items.length}</span>
                        <Button onClick={() => setShowConfig(true)}>
                            <Settings className="h-4 w-4" />
                            Settings
                        </Button>
                    </div>
                </div>
                {/* Rest of desktop UI */}
            </div>
        </div>
    )
}
```

#### 3. **Hide Sidebar on Active Sessions**

Update `sidebar.tsx`:

```tsx
const isYourFeatureSessionActive = pathname === "/your-feature/active-path"

{!isYourFeatureSessionActive && (
    <Sheet open={open} onOpenChange={setOpen}>
        {/* Mobile menu */}
    </Sheet>
)}
```

#### 4. **Create Zustand Store**

Create `stores/your-feature-store.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface YourFeaturePreferences {
    option1: boolean
    option2: boolean
    setting1: number
    // ... your preferences
}

interface YourFeatureStore extends YourFeaturePreferences {
    setOption1: (value: boolean) => void
    setOption2: (value: boolean) => void
    setSetting1: (value: number) => void
    resetToDefaults: () => void
}

const defaultPreferences: YourFeaturePreferences = {
    option1: true,
    option2: false,
    setting1: 10,
}

export const useYourFeatureStore = create<YourFeatureStore>()(
    persist(
        (set) => ({
            ...defaultPreferences,
            setOption1: (option1) => set({ option1 }),
            setOption2: (option2) => set({ option2 }),
            setSetting1: (setting1) => set({ setting1 }),
            resetToDefaults: () => set(defaultPreferences),
        }),
        {
            name: 'your-feature-preferences',
        }
    )
)
```

---

## Troubleshooting

### Common Issues

#### 1. **Colors Not Showing on Mobile**

**Problem:** Green/red feedback colors aren't visible on mobile buttons.

**Solution:** Use `!important` via Tailwind's `!` prefix:

```tsx
className="!bg-green-500 hover:!bg-green-500 !text-white !border-green-600"
```

#### 2. **Duplicate Burger Menus**

**Problem:** Two burger menus appear - one from app layout, one from study session.

**Solution:** Hide sidebar's burger menu when study session is active:

```tsx
const isStudySessionActive = pathname?.startsWith("/study/") && pathname !== "/study"

{!isStudySessionActive && <MobileBurgerMenu />}
```

#### 3. **Settings Page Shows Every Time**

**Problem:** Configuration screen appears on every visit.

**Solution:** Check for valid saved preferences and auto-start:

```tsx
const hasValidConfig = askForKana || askForKanji || askForRomaji || askForEnglish

if (hasValidConfig && !hasAutoStarted) {
    startSession()  // Skip config, start directly
}
```

#### 4. **Mobile Component Not Fullscreen**

**Problem:** Mobile study session doesn't cover entire screen.

**Solution:** Use fixed positioning:

```tsx
<div className="fixed inset-0 z-50 bg-background">
```

#### 5. **Store Not Persisting**

**Problem:** User preferences reset on page reload.

**Solution:** Ensure Zustand persist middleware is configured:

```typescript
export const useFlashcardStore = create<FlashcardStore>()(
    persist(
        (set, get) => ({ /* ... */ }),
        { name: 'flashcard-preferences' }  // ← This is the key
    )
)
```

---

## Best Practices

### 1. **Mobile-First Design**
- Design for mobile viewport first
- Scale up for desktop, not down for mobile
- Use responsive font sizes and spacing

### 2. **Consistent Visual Feedback**
- Always show clear correct/incorrect states
- Use shadows for depth and emphasis
- Maintain color consistency across components

### 3. **Performance**
- Use `motion` from Framer Motion for smooth animations
- Optimize re-renders with proper state management
- Lazy load heavy components

### 4. **Accessibility**
- Provide proper ARIA labels
- Ensure keyboard navigation works
- Use semantic HTML elements

### 5. **State Management**
- Use Zustand for global preferences
- Keep component state local when possible
- Validate state before auto-starting sessions

---

## Summary

This implementation provides:

✅ **Auto-start** - Sessions begin automatically with saved preferences  
✅ **Fullscreen mobile** - Immersive, distraction-free learning  
✅ **Visual feedback** - Clear green/red indicators  
✅ **Settings access** - Available via button, not forced  
✅ **Consistent design** - Same experience on mobile and desktop  
✅ **Persistent preferences** - Zustand store saves user choices  
✅ **Clean navigation** - No duplicate menus or UI conflicts  

---

## Future Enhancements

- [ ] Add keyboard shortcuts for desktop
- [ ] Implement swipe gestures for mobile
- [ ] Add sound effects for feedback
- [ ] Support offline mode with service workers
- [ ] Add progress animations between cards
- [ ] Implement spaced repetition algorithm
- [ ] Add achievement/streak badges

---

**Last Updated:** October 6, 2025  
**Author:** Development Team  
**Version:** 1.0.0

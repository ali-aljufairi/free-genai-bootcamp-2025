# Sorami Frontend Design Language Analysis

## Overview

Sorami (空見) is a comprehensive Japanese language learning platform built with a sophisticated, modern design language that emphasizes immersion, elegance, and accessibility. The platform combines advanced UI patterns with Japanese aesthetic principles to create an engaging learning environment.

## Brand Identity & Meaning

### Name & Symbolism
- **Sorami** (空見) - "Sky watching" or "seeing the sky" in Japanese
- Represents the concept of looking up, aspiration, and limitless learning potential
- The kanji 空見 suggests both emptiness (空) and seeing/viewing (見), reflecting the Zen-like journey of learning

### Mission
- "Elevate your language learning journey with an immersive, intuitive experience designed for lasting fluency"
- Focus on **immersive language learning** with AI-powered tools
- Emphasis on **lasting fluency** rather than quick fixes

## Design Philosophy

### Core Principles

1. **Glass-Card Aesthetic**
   - Central design pattern throughout the platform
   - Creates depth and layering without overwhelming content
   - Consistent with modern frosted glass UI trends

2. **Atmospheric Design**
   - Subtle background animations and gradients
   - "Paper texture" and "atmospheric background" classes
   - Creates an immersive, ambient learning environment

3. **Japanese Cultural Integration**
   - Bilingual typography (Latin + Japanese characters)
   - Color choices inspired by Japanese aesthetics
   - Respectful integration of Japanese design principles

4. **Accessibility & Inclusivity**
   - Dark/light theme support with seamless transitions
   - Consistent color contrast ratios
   - Mobile-first responsive design




### Semantic Colors
- **Success**: Green tones for progress and completion
- **Warning**: Yellow/amber for attention items
- **Error**: Red tones for mistakes and alerts
- **Info**: Blue tones (consistent with primary palette)

## Typography

### Font Stack
```css
font-family: Inter, system-ui, arial
```

### Hierarchy
- **Hero Headlines**: `text-4xl md:text-5xl lg:text-6xl font-bold`
- **Section Titles**: `text-3xl font-bold`
- **Card Titles**: `text-2xl font-semibold`
- **Body Text**: `text-base` with proper line-height
- **Supporting Text**: `text-sm text-muted-foreground`

### Japanese Integration
- Japanese characters displayed alongside romaji
- Size adjustments for Japanese text: `text-sm md:text-base align-top`
- Proper font fallbacks for Japanese characters

## Layout Patterns

### Glass-Card System
```css
.glass-card {
  backdrop-filter: blur(8px);
  background-color: rgba(255, 255, 255, 0.7);
  border-color: rgba(219, 234, 254, 0.8);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: all 500ms;
  position: relative;
  overflow: hidden;
}

.dark .glass-card {
  background-color: rgba(30, 41, 59, 0.6);
  border-color: rgba(30, 58, 138, 0.7);
}
```

### Component Architecture
1. **Single Glass-Card Pattern**: One primary container per screen/component
2. **Internal Organization**: Content structured with sections, headers, and dividers within the card
3. **Consistent Padding**: `p-6` to `p-8` for card content
4. **Border Styling**: Subtle borders with transparency

### Responsive Design
- **Mobile-first approach**: Base styles for mobile, enhanced for desktop
- **Breakpoints**: Standard Tailwind breakpoints (sm, md, lg, xl, 2xl)
- **Container**: `container mx-auto px-4` pattern
- **Grid Systems**: CSS Grid and Flexbox for complex layouts

## Animation System

### Core Animation Library
- **Framer Motion**: Primary animation framework
- **CSS Animations**: Custom keyframes for specific effects
- **View Transitions**: Advanced page transition effects

### Animation Patterns

#### 1. Entrance Animations
```tsx
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
transition={{ duration: 0.5, delay: 0.1 }}
```

#### 2. Background Animations
```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

.floating {
  animation: float 6s ease-in-out infinite;
}
```

#### 3. Interactive Animations
- **Hover Effects**: Smooth color and transform transitions
- **Click Feedback**: Subtle scale and shadow changes
- **Loading States**: Shimmer and pulse animations

#### 4. Study-Specific Animations
- **Card Flips**: 3D transform animations for flashcards
- **Progress Indicators**: Animated progress bars and circles
- **Feedback Animations**: Success/error state animations

### Performance Considerations
- `transform` and `opacity` properties for optimal performance
- `will-change` property for complex animations
- Reduced motion support: `@media (prefers-reduced-motion: reduce)`

## Component Design Patterns


**Variants:**
- **Default**: Primary blue gradient
- **Outline**: Transparent with blue border
- **Ghost**: Transparent with hover effect
- **Destructive**: Red tones for dangerous actions

### Card Components
```tsx
// Standard Glass Card
<Card className="glass-card overflow-hidden rounded-xl border border-blue-100/80 dark:border-blue-900/70 shadow-xl">
  <CardHeader>
    <CardTitle>Interactive Learning Dashboard</CardTitle>
    <CardDescription>Experience seamless Japanese language learning</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Icon Integration
- **Lucide Icons**: Primary icon library
- **Consistent Sizing**: `h-4 w-4`, `h-6 w-6` standard sizes
- **Color Coordination**: Icons match text color or use accent colors
- **Semantic Usage**: Icons enhance rather than replace text

## Interactive Elements

### Form Controls
- **Input Fields**: Rounded corners, blue focus rings, proper padding
- **Select Dropdowns**: Custom styling matching overall design
- **Switches/Toggles**: Smooth animations, clear states
- **Buttons**: Consistent height and padding across variants

### Feedback Systems
- **Toast Notifications**: Sonner library with custom styling
- **Loading States**: Skeleton components and spinners
- **Error Boundaries**: Graceful error handling with recovery options
- **Progress Indicators**: Visual feedback for user actions




## Accessibility Features

### Standards Compliance
- **WCAG 2.1 AA**: Color contrast ratios
- **Keyboard Navigation**: Focus management and tab order
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Reduced Motion**: Respects user preferences

### Inclusive Design
- **Font Size Options**: Scalable typography
- **High Contrast Options**: Available in dark mode
- **Clear Visual Hierarchy**: Consistent heading structure
- **Error Messaging**: Clear, actionable error text

## Technical Implementation

### CSS Architecture
- **Tailwind CSS**: Utility-first CSS framework
- **CSS Custom Properties**: Theme-aware design tokens
- **PostCSS**: Build-time CSS processing
- **CSS-in-JS**: Styled components for complex interactions

### Component Library
- **Radix UI**: Accessible primitive components
- **Custom Components**: Built on Radix foundations
- **Variant APIs**: Consistent component variants using CVA

### Performance Optimizations
- **Code Splitting**: Lazy loading for components
- **Image Optimization**: Next.js image optimization
- **CSS Purging**: Unused CSS removal
- **Bundle Analysis**: Regular performance monitoring

## Learning-Specific UI Patterns

### Study Interface
- **Flashcard Components**: Flip animations, multiple choice options
- **Progress Tracking**: Visual progress indicators
- **Streak Displays**: Gamification elements
- **Session Management**: Clear session boundaries

### Content Organization
- **JLPT Level Indicators**: Color-coded difficulty levels
- **Vocabulary Grouping**: Topic-based organization
- **Search Functionality**: Instant search with filtering
- **Pagination**: Infinite scroll and traditional pagination

### AI Integration UI
- **Chat Interfaces**: Conversational UI patterns
- **Feedback Systems**: AI-powered progress feedback
- **Recommendation Cards**: Personalized content suggestions
- **Voice Integration**: Speech-to-text and text-to-speech UI

## Conclusion

The Sorami design language successfully combines modern web design principles with Japanese aesthetic sensibilities to create an immersive language learning environment. The consistent use of glass-card aesthetics, thoughtful animation systems, and accessible design patterns creates a cohesive and engaging user experience that supports the platform's educational mission.

Key strengths:
- **Cohesive Visual Identity**: Strong brand consistency
- **Cultural Sensitivity**: Respectful Japanese design integration
- **Technical Excellence**: Modern, performant implementation
- **User-Centered Design**: Accessibility and usability focused
- **Scalable Architecture**: Component-based design system

This design language provides a solid foundation for continued development and expansion of the Sorami platform while maintaining the high-quality user experience that sets it apart in the language learning space.

## Implementation Learnings: Flashcard System Refactoring

### Overview
During the refactoring of the kanji flashcard system to match the words flashcard structure, several important design patterns and best practices were identified and should be followed for future feature development.

### Key Design Patterns Discovered

#### 1. Component Reusability Through Render Props
**Pattern**: Use render function props to create truly reusable components that can handle different content types.

**Example**:
```tsx
interface FlashcardSessionProps {
  renderQuestion: (card: Flashcard) => React.ReactNode
  renderOption: (option: FlashcardContent) => React.ReactNode
  // ... other props
}

// Component can be used for both words and kanji
<FlashcardSession
  renderQuestion={renderWordQuestion}
  renderOption={renderWordOption}
/>
```

**Benefits**:
- Single component handles multiple content types
- Consistent UI/UX across different flashcard types
- Easier maintenance and updates
- Type-safe with TypeScript

**When to Use**: When you have similar UI patterns that differ only in content rendering.

#### 2. Shared Component Architecture
**Pattern**: Create a hierarchy of shared components that handle common functionality.

**Structure**:
```
shared/
  ├── flashcard-session.tsx      # Main container (desktop)
  ├── flashcard-option-list.tsx   # Option rendering logic
  ├── flashcard-option-button.tsx # Individual option button
  ├── flashcard-question-card.tsx # Question display
  ├── flashcard-progress.tsx      # Progress indicator
  ├── flashcard-results.tsx       # Results screen
  └── flashcard-skeleton.tsx      # Loading state
```

**Benefits**:
- Consistent behavior across all flashcard types
- Single source of truth for UI patterns
- Easier to fix bugs (fix once, works everywhere)
- Better code organization

**When to Use**: When multiple features share similar UI patterns.

#### 3. Mobile-First Separate Components
**Pattern**: Create dedicated mobile components rather than trying to make one component work for both.

**Example**:
```tsx
// Desktop: FlashcardSession (shared)
// Mobile: MobileWordsFlashcard / MobileKanjiFlashcard (specific)
if (isMobile) {
  return <MobileKanjiFlashcard {...props} />
}
return <FlashcardSession {...props} />
```

**Benefits**:
- Better mobile UX (optimized layouts)
- Cleaner code (no complex conditional rendering)
- Easier to maintain mobile-specific features
- Better performance (no unused code)

**When to Use**: When mobile and desktop layouts differ significantly.

#### 4. State Management with Zustand
**Pattern**: Use Zustand store for persistent preferences with validation logic.

**Structure**:
```tsx
interface FlashcardStore {
  // Preferences
  level: number
  selectedGroup: number | null
  // ... other preferences
  
  // Actions
  setLevel: (level: number) => void
  setGroup: (groupId: number | null) => void
  
  // Validation
  validateAndFixKanjiOptions: () => void
}
```

**Benefits**:
- Persistent user preferences (localStorage)
- Centralized validation logic
- Type-safe state management
- Easy to extend for new features

**When to Use**: For user preferences that should persist across sessions.

#### 5. React Query for Data Fetching
**Pattern**: Use React Query for all API calls with proper caching strategies.

**Example**:
```tsx
const { data: groups = [] } = useQuery({
  queryKey: ['groups'],
  queryFn: groupApi.getGroups,
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes
})
```

**Benefits**:
- Automatic caching and refetching
- Loading and error states handled
- Prefetching support for better UX
- Reduces unnecessary API calls

**When to Use**: For all API data fetching, especially lists and configurations.

#### 6. Text Overflow Handling
**Pattern**: Always handle text overflow in interactive elements, especially buttons.

**Implementation**:
```tsx
<Button className="overflow-hidden max-h-[120px]">
  <span className="line-clamp-3 break-words overflow-hidden text-ellipsis w-full">
    {longText}
  </span>
</Button>
```

**Key Classes**:
- `overflow-hidden`: Prevents text from overflowing container
- `max-h-[value]`: Sets maximum height
- `line-clamp-N`: Limits to N lines with ellipsis
- `break-words`: Allows word breaking
- `text-ellipsis`: Shows ellipsis for truncated text
- `w-full`: Ensures span takes full width

**When to Use**: Always for user-generated content or variable-length text in buttons/cards.

#### 7. Content Source Abstraction
**Pattern**: Abstract content source selection (groups vs units vs JLPT) in the component logic.

**Example**:
```tsx
let contentSource: ContentSource
let groupId: number | undefined

if (selectedGroup !== null) {
  contentSource = 'group'
  groupId = selectedGroup
} else {
  contentSource = 'jlpt'
  groupId = undefined
}
```

**Benefits**:
- Clean separation of concerns
- Easy to add new content sources
- Type-safe with TypeScript enums
- Consistent API contract

**When to Use**: When features support multiple content sources.

#### 8. Background Submission Pattern
**Pattern**: Show results immediately, submit to backend in background.

**Implementation**:
```tsx
// Calculate and show results instantly
const localResults = calculateLocalResults(finalAnswers)
setResults(localResults)
setShowResults(true)

// Submit to backend in background
setIsSubmitting(true)
submitSessionMutation.mutate(submission)
```

**Benefits**:
- Instant user feedback
- Better perceived performance
- Graceful degradation if submission fails
- Can prefetch next session while submitting

**When to Use**: For non-critical submissions where user can continue without waiting.

#### 9. Auto-Start Pattern
**Pattern**: Auto-start sessions if valid preferences exist, otherwise show config.

**Implementation**:
```tsx
useEffect(() => {
  const hasValidConfig = askForCharacter || askForOnyomi || ...
  
  if (hasValidConfig && !hasAutoStarted && !session && !showResults) {
    setHasAutoStarted(true)
    startSession()
  } else if (!hasValidConfig && !hasAutoStarted) {
    setShowConfig(true)
    setHasAutoStarted(true)
  }
}, [hasAutoStarted, session, showResults])
```

**Benefits**:
- Better UX (less clicks to start)
- Remembers user preferences
- Still allows configuration changes
- Prevents infinite loops with hasAutoStarted flag

**When to Use**: For features where users often repeat the same configuration.

#### 10. Config Component Pattern
**Pattern**: Separate configuration UI into dedicated components with shared sub-components.

**Structure**:
```
configs/
  ├── kanji-flashcard-config.tsx
  ├── word-flashcard-config.tsx
  └── shared/
      ├── jlpt-level-selector.tsx
      ├── card-count-selector.tsx
      ├── group-selector.tsx
      ├── timer-selector.tsx
      └── display-options.tsx
```

**Benefits**:
- Reusable configuration elements
- Consistent configuration UI
- Easy to add new options
- Better code organization

**When to Use**: For complex configuration screens with multiple options.

### Database Schema Considerations

#### Content Organization Patterns
- **Words**: Use `courses` → `units` → `unit_items` structure
- **Kanji**: Use `groups` → `kanji_groups` structure (not units)
- **SRS**: Use `progress` table with `item_type` enum for both

**Key Insight**: Different content types may use different organizational structures. Always verify database schema before assuming structure.

### Backend Handler Patterns

#### Content Source Handling
Always support all content sources in backend handlers:
```go
switch config.ContentSource {
case ContentSourceUnit:
    // Handle unit-based content
case ContentSourceGroup:
    // Handle group-based content (words AND kanji)
case ContentSourceJLPT:
    // Handle JLPT level filtering
case ContentSourceSRS:
    // Handle SRS due items
}
```

**Important**: When adding new content types, ensure all content sources are supported, not just one.

### Validation Patterns

#### Client-Side Validation
- Validate options on mount and when they change
- Auto-fix invalid configurations (e.g., don't show what you're asking for)
- Ensure at least one "ask" option is selected
- Ensure at least one "show" option is selected

#### Backend Validation
- Always validate on backend (client validation can be bypassed)
- Return clear error messages
- Validate content availability (e.g., kanji has required fields)

### Performance Optimizations

#### Caching Strategy
- **Courses/Groups**: 5 minutes stale time, 30 minutes garbage collection
- **Session Prefetch**: 2 minutes stale time (shorter, more dynamic)
- **Query Keys**: Use JSON.stringify(config) for cache keys to ensure uniqueness

#### Prefetching
- Prefetch next session after current session completes
- Use background prefetching (doesn't block UI)
- Handle prefetch failures gracefully (non-critical)

### Error Handling Patterns

#### User-Facing Errors
- Show alerts for critical errors (session start failure)
- Don't show alerts for background operations (submission failures)
- Log all errors to console for debugging
- Use toast notifications for non-critical feedback

#### Graceful Degradation
- Background submission failures don't block user
- Cached data can be used if API fails
- Validation prevents invalid states before API calls

### Testing Considerations

When implementing similar features, test:
1. All content sources (unit, group, JLPT, SRS)
2. Mobile vs desktop rendering
3. Timer functionality (if applicable)
4. Results submission and display
5. Validation logic (client and server)
6. Caching behavior
7. Auto-start logic
8. Text overflow with long content
9. Audio playback (if applicable)
10. Error states and recovery

### Code Organization Best Practices

1. **Separate Concerns**: UI components, business logic, API calls
2. **Shared Components First**: Check if component exists before creating new
3. **Type Safety**: Use TypeScript interfaces for all props and data
4. **Consistent Naming**: Follow existing patterns (e.g., `renderQuestion`, `renderOption`)
5. **Documentation**: Add comments for complex logic
6. **Mobile-First**: Design for mobile, enhance for desktop
7. **Accessibility**: Always include proper ARIA labels and keyboard navigation

### Lessons Learned

1. **Always verify database schema** before implementing features - kanji uses groups, not units
2. **Text overflow is critical** - always handle variable-length content in buttons/cards
3. **Render props enable true reusability** - more flexible than prop-based configuration
4. **Separate mobile components** are cleaner than complex conditional rendering
5. **Background operations** improve perceived performance significantly
6. **Auto-start with validation** creates better UX for repeat users
7. **Shared component architecture** reduces bugs and maintenance burden
8. **React Query caching** is essential for good performance
9. **Validation should be smart** - auto-fix common issues, don't just reject
10. **Type safety catches errors early** - use TypeScript strictly

These patterns and learnings should be applied to all future feature development in the Sorami platform to maintain consistency and quality.
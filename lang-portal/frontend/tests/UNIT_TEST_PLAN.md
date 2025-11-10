# Unit Test Plan for useVocabularyBrowser Hook

Since the project currently only has Playwright for E2E testing, this document outlines
comprehensive unit tests that should be implemented if Jest or Vitest is added to the project.

## Hook: useVocabularyBrowser

### Test File: `hooks/api/__tests__/useVocabularyBrowser.test.ts`

#### Setup Requirements
- Mock `useWords` hook
- Mock `useKanji` hook
- Test with React Testing Library's `renderHook`
- Mock React Query's QueryClient

#### Test Cases

##### 1. Basic Functionality Tests

```typescript
describe('useVocabularyBrowser - Basic Functionality', () => {
  test('should return empty items when no data is loaded', () => {
    // Mock useWords and useKanji to return undefined
    // Assert items array is empty
    // Assert isLoading is true
  });

  test('should combine words and kanji when contentType is "both"', () => {
    // Mock useWords to return sample words
    // Mock useKanji to return sample kanji
    // Assert items contains both types
    // Assert correct kind tags ('word' and 'kanji')
  });

  test('should return only words when contentType is "words"', () => {
    // Mock useWords to return sample words
    // Mock useKanji to return sample kanji
    // Assert items contains only word items
    // Assert kanji items are excluded
  });

  test('should return only kanji when contentType is "kanji"', () => {
    // Mock useWords to return sample words
    // Mock useKanji to return sample kanji
    // Assert items contains only kanji items
    // Assert word items are excluded
  });
});
```

##### 2. Filter Handling Tests

```typescript
describe('useVocabularyBrowser - Filters', () => {
  test('should pass search query to appropriate hooks', () => {
    // Mock hooks and spy on their calls
    // Render hook with search filter
    // Assert useWords called with search query
    // Assert useKanji called with search query when contentType includes kanji
  });

  test('should handle JLPT filter correctly', () => {
    // Render hook with JLPT filter
    // Assert useWords called with jlpt parameter
    // Assert useKanji called with jlpt parameter
  });

  test('should handle hasKanji filter for words', () => {
    // Render hook with hasKanji=true
    // Assert useWords called with has_kanji=true
    // Assert filter is passed correctly
  });

  test('should handle partOfSpeech filter with single value', () => {
    // Render hook with single partOfSpeech
    // Assert useWords called with correct part_of_speech
  });

  test('should handle partOfSpeech filter with multiple values', () => {
    // Render hook with multiple partOfSpeech values
    // Assert useWords called with first value
    // Assert client-side filtering applied for additional values
  });

  test('should handle correctCountMin filter', () => {
    // Render hook with correctCountMin
    // Assert useWords called with correct_count parameter
  });

  test('should handle onyomi and kunyomi filters', () => {
    // Render hook with onyomi=true
    // Assert useKanji called with onyomi=true
    // Repeat for kunyomi
  });

  test('should handle group filter', () => {
    // Render hook with group filter
    // Assert both hooks called with group_id parameter
  });

  test('should determine useSearch flag correctly', () => {
    // Test various filter combinations
    // Assert useSearch is true when any filter is present
    // Assert useSearch is false when no filters
  });
});
```

##### 3. Sorting Tests

```typescript
describe('useVocabularyBrowser - Sorting', () => {
  test('should sort kanji by frequency when sortBy is "frequency"', () => {
    // Mock kanji data with different frequency values
    // Render hook with sortBy='frequency' and contentType='kanji'
    // Assert items are sorted in descending frequency order
  });

  test('should not sort words by frequency', () => {
    // Mock words data
    // Render hook with sortBy='frequency' and contentType='words'
    // Assert words maintain original order (no frequency field)
  });

  test('should handle default sorting', () => {
    // Render hook without sortBy parameter
    // Assert items maintain default order from API
  });

  test('should handle mixed content with frequency sort', () => {
    // Mock both words and kanji
    // Render with contentType='both' and sortBy='frequency'
    // Assert only kanji portion is sorted
  });
});
```

##### 4. Pagination Tests

```typescript
describe('useVocabularyBrowser - Pagination', () => {
  test('should handle page parameter correctly', () => {
    // Render hook with page=2
    // Assert useWords called with page=2
    // Assert useKanji called with page=2
  });

  test('should default to page 1 when not specified', () => {
    // Render hook without page parameter
    // Assert hooks called with page=1
  });

  test('should calculate total correctly for words-only', () => {
    // Mock useWords with total=100
    // Render with contentType='words'
    // Assert total=100
  });

  test('should calculate total correctly for kanji-only', () => {
    // Mock useKanji with total=50
    // Render with contentType='kanji'
    // Assert total=50
  });

  test('should calculate total correctly for both', () => {
    // Mock useWords with total=100, useKanji with total=50
    // Render with contentType='both'
    // Assert total=100 (max of both)
  });

  test('should calculate totalPages correctly', () => {
    // Mock data with known totalPages values
    // Assert totalPages matches expected logic
  });

  test('should determine hasMore correctly', () => {
    // Test various scenarios:
    // - Current page < total pages: hasMore=true
    // - Current page = total pages: hasMore=false
    // - Derived from pagination data when totalPages=0
  });

  test('should determine hasPrevious correctly', () => {
    // page=1: hasPrevious=false
    // page>1: hasPrevious=true
  });
});
```

##### 5. Loading State Tests

```typescript
describe('useVocabularyBrowser - Loading States', () => {
  test('should be loading when words are loading and no data', () => {
    // Mock useWords with isLoading=true, empty data
    // Assert isLoading=true
  });

  test('should be loading when kanji are loading and no data', () => {
    // Mock useKanji with isLoading=true, empty data
    // Assert isLoading=true
  });

  test('should not be loading when data exists even if still fetching', () => {
    // Mock with isLoading=true but non-empty data
    // Assert isLoading=false (has cached data)
  });

  test('should handle loading states based on contentType', () => {
    // contentType='words': only consider words loading
    // contentType='kanji': only consider kanji loading
    // contentType='both': consider both loading states
  });
});
```

##### 6. Edge Cases and Error Handling

```typescript
describe('useVocabularyBrowser - Edge Cases', () => {
  test('should handle undefined data from hooks', () => {
    // Mock hooks returning undefined
    // Assert no crashes, returns empty items
  });

  test('should handle empty arrays from hooks', () => {
    // Mock hooks returning empty items arrays
    // Assert returns empty unified items
  });

  test('should handle malformed filter objects', () => {
    // Pass filters with missing required fields
    // Assert hook handles gracefully with defaults
  });

  test('should handle very large page numbers', () => {
    // Pass page=999999
    // Assert hook handles without errors
  });

  test('should filter multiple partOfSpeech correctly', () => {
    // Mock words with various partOfSpeech values
    // Pass multiple partOfSpeech filters
    // Assert correct client-side filtering
  });

  test('should handle null frequency values in sorting', () => {
    // Mock kanji with some null/undefined frequency values
    // Apply frequency sorting
    // Assert items with null frequency sorted correctly (treated as 0)
  });
});
```

##### 7. Integration with Dependencies

```typescript
describe('useVocabularyBrowser - Hook Integration', () => {
  test('should pass all parameters correctly to useWords', () => {
    // Create comprehensive filter object
    // Spy on useWords
    // Assert all expected parameters passed
  });

  test('should pass all parameters correctly to useKanji', () => {
    // Create comprehensive filter object
    // Spy on useKanji
    // Assert all expected parameters passed
  });

  test('should not call useWords when contentType is kanji', () => {
    // Spy on useWords
    // Render with contentType='kanji'
    // Assert useWords either not called or ignores results
  });

  test('should not call useKanji when contentType is words', () => {
    // Spy on useKanji
    // Render with contentType='words'
    // Assert useKanji either not called or ignores results
  });
});
```

##### 8. Type Safety Tests

```typescript
describe('useVocabularyBrowser - TypeScript Types', () => {
  test('should correctly type unified items', () => {
    // Assert UnifiedItem has correct discriminated union structure
    // Verify 'kind' field enables type narrowing
  });

  test('should export correct filter interface', () => {
    // Verify VocabularyBrowserFilters interface
    // Check all optional and required fields
  });

  test('should export correct return type interface', () => {
    // Verify UseVocabularyBrowserReturn interface
    // Check all returned fields and their types
  });
});
```

### Mock Data Examples

```typescript
const mockWords = [
  { id: 1, word: '食べる', reading: 'たべる', meaning: 'to eat', part_of_speech: 'verb' },
  { id: 2, word: '本', reading: 'ほん', meaning: 'book', part_of_speech: 'noun' },
];

const mockKanji = [
  { id: 1, character: '日', meaning: 'sun, day', onyomi: 'ニチ', kunyomi: 'ひ', frequency: 100 },
  { id: 2, character: '月', meaning: 'moon, month', onyomi: 'ゲツ', kunyomi: 'つき', frequency: 90 },
];
```

### Implementation Notes

1. Use `@testing-library/react-hooks` or `@testing-library/react` for hook testing
2. Mock `useWords` and `useKanji` using Jest's `jest.mock()`
3. Create comprehensive fixture data for various scenarios
4. Test both sync and async behaviors
5. Ensure proper cleanup between tests
6. Test with actual React Query QueryClient when appropriate

### Coverage Goals

- Line coverage: >95%
- Branch coverage: >90%
- Function coverage: 100%
- Statement coverage: >95%

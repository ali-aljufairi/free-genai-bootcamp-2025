# Sorami Application - Issues & Tasks

**Analysis Date:** October 6, 2025  
**Analysis Method:** Playwright browser automation with screenshots

---

## 🔴 Critical Issues (High Priority)

### 1. Vocabulary Browser - No QueryFn Error
- **Location:** `/vocabulary` page
- **Severity:** Critical - Page is broken
- **Issue:** Console shows error: `No queryFn was passed as an option, and no default queryFn was found. The query will not run.`
- **Impact:** The vocabulary browser appears to be completely broken - no content is loading, search box is disabled
- **Screenshot:** `.playwright-mcp/vocabulary-browser.png`
- **Fix Needed:** 
  - Check the React Query setup in the vocabulary browser component
  - Ensure queryFn is properly configured for the "words" query
  - Verify API endpoint integration

### 2. Settings Page - Empty/Incomplete
- **Location:** `/settings` page
- **Severity:** Critical - Feature missing
- **Issue:** The page only shows a heading and description but no actual settings controls or options
- **Impact:** Users cannot configure any application settings
- **Screenshot:** `.playwright-mcp/settings-page.png`
- **Fix Needed:** 
  - Implement the settings UI components
  - Add user preferences controls
  - Add theme settings
  - Add notification preferences
  - Add study preferences

### 3. Mobile Study Settings - Dropdown Display Issues
- **Location:** `/study/words` on mobile (375px width)
- **Severity:** High - UX issue
- **Issue:** The dropdown menus (JLPT Level, Course, Number of Cards) don't show selected values in mobile view - they only show icons
- **Impact:** Poor user experience - users can't see what options are currently selected without opening the dropdown
- **Screenshot:** `.playwright-mcp/mobile-word-study.png`
- **Fix Needed:** 
  - Adjust mobile styling for combobox/select components to show selected values
  - Ensure proper text truncation for long option names
  - Test on actual mobile devices

---

## ⚠️ Medium Priority Issues

### 4. Dashboard - Multiple Disabled Features
- **Location:** `/dashboard` page
- **Severity:** Medium - Reduced functionality
- **Issue:** Multiple sections show "temporarily disabled due to database migration"
  - Activity tracking shows: "Activity tracking temporarily disabled"
  - Streak calendar shows: "Streak tracking temporarily disabled"
  - View All Activity button is disabled
- **Impact:** Dashboard provides limited value to users - can't track progress effectively
- **Screenshot:** `.playwright-mcp/dashboard.png`
- **Fix Needed:** 
  - Complete database migration
  - Re-enable activity tracking
  - Re-enable streak tracking
  - Restore full dashboard functionality

### 5. Study Hub - Limited Study Options
- **Location:** `/study` page
- **Severity:** Medium - Limited features
- **Issue:** 7 out of 9 study activities are disabled
  - ✅ Working: Word Flashcards, Kanji Flashcards
  - ❌ Disabled: Legacy Flashcards, Grammar Quiz, Sentence Constructor, Writing Practice, Learning Resources, Speech to Image, Companion
- **Impact:** Users have very limited study options, reducing the value proposition of the app
- **Screenshot:** `.playwright-mcp/study-hub.png`
- **Fix Needed:** 
  - Prioritize and re-enable core features (Grammar Quiz, Sentence Constructor)
  - Provide timeline for when features will be available
  - Consider removing permanently deprecated features from UI

---

## ℹ️ Low Priority / Future Enhancements

### 6. Database Migration Warning
- **Location:** Homepage and Dashboard
- **Severity:** Low - Informational
- **Issue:** Persistent warning banner about database migration
- **Impact:** May confuse or concern users
- **Fix Needed:** 
  - Remove warning once migration is complete
  - Consider less prominent notification style
  - Add link to status page or more information

### 7. Console Warnings
- **Issue:** Development-related console messages:
  - "Clerk has been loaded with development keys"
  - "Download the React DevTools" info message
- **Impact:** None in production, but should be cleaned up
- **Fix Needed:** 
  - Ensure production builds suppress these warnings
  - Verify Clerk production keys are configured

---

## ✅ What's Working Well

### Positive Observations
1. **Homepage** - Beautiful design with good visual hierarchy and responsive layout
2. **Word Flashcards** - Study session works correctly with proper quiz flow
3. **Mobile Responsiveness** - Generally good responsive design across breakpoints
4. **Navigation** - Sidebar and navigation function properly
5. **Authentication** - Clerk integration appears functional
6. **UI Components** - Clean, modern design with consistent styling
7. **User Profile** - User button and profile integration working

---

## 📸 Available Screenshots

All screenshots saved in `.playwright-mcp/`:
- `homepage.png` - Landing page (desktop, 1920x1080)
- `dashboard.png` - Dashboard view with disabled features
- `study-hub.png` - Study session hub showing available activities
- `word-study-settings.png` - Word study configuration page
- `word-study-quiz.png` - Active quiz interface
- `vocabulary-browser.png` - Broken vocabulary page
- `settings-page.png` - Empty settings page
- `mobile-homepage.png` - Mobile landing page (375x667)
- `mobile-word-study.png` - Mobile study settings showing dropdown issue

---

## 🎯 Recommended Action Plan

### Phase 1: Critical Fixes (This Week)
1. Fix vocabulary browser React Query error
2. Implement basic settings page
3. Fix mobile dropdown display issue

### Phase 2: Feature Restoration (Next 2 Weeks)
4. Complete database migration
5. Re-enable dashboard activity tracking
6. Re-enable streak tracking

### Phase 3: Feature Enhancement (Next Month)
7. Re-enable Grammar Quiz
8. Re-enable Sentence Constructor
9. Remove or implement remaining study activities

### Phase 4: Polish (Ongoing)
10. Remove database migration warnings
11. Clean up console warnings for production
12. User testing and feedback collection

---

## 🔧 Technical Notes

- **Testing Tool:** Playwright browser automation
- **Browsers Tested:** Chromium
- **Viewports Tested:** 
  - Desktop: Default (1920x1080)
  - Mobile: 375x667 (iPhone SE)
- **Console Errors Detected:** Yes (detailed above)
- **Network Errors:** React Query missing queryFn

---

## 📝 Next Steps

1. Review and prioritize tasks with team
2. Assign issues to developers
3. Create GitHub issues for tracking
4. Set up automated visual regression testing
5. Schedule follow-up Playwright test run after fixes

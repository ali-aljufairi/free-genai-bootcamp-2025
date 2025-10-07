# Playwright Testing Guide

This project uses Playwright for end-to-end testing with Clerk authentication integration.

## Setup

### 1. Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### 2. Configure Clerk API Keys

1. Go to [Clerk Dashboard > API Keys](https://dashboard.clerk.com/last-active?path=api-keys)
2. Copy your Publishable Key and Secret Key
3. Create a `.env.test` file in the `frontend` directory:

```env
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**Important:** Never commit `.env.test` to version control. It's already in `.gitignore`.

### 3. Ensure Test User Exists

For authenticated tests, you'll need a test user with username and password:

1. Go to Clerk Dashboard > Users
2. Create a test user or use an existing one
3. Enable username/password authentication in Clerk Dashboard > User & Authentication > Email, Phone, Username

## Running Tests

### Run All Tests (Headless)
```bash
npm run test
```

### Run Tests with UI Mode (Interactive)
```bash
npm run test:ui
```

### Run Tests in Headed Mode (Visible Browser)
```bash
npm run test:headed
```

### Run Specific Test File
```bash
npx playwright test tests/auth.spec.ts
```

### Run Tests on Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Structure

### Global Setup (`tests/global.setup.ts`)

The global setup file initializes Clerk testing tokens for all tests:

- Calls `clerkSetup()` to obtain a Testing Token
- Runs serially before all tests
- Makes the token available for all subsequent tests

### Test Files

All test files should:

1. Import `setupClerkTestingToken` from `@clerk/testing/playwright`
2. Call `setupClerkTestingToken({ page })` at the start of each test
3. This bypasses Clerk's bot detection for reliable testing

Example:

```typescript
import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await setupClerkTestingToken({ page });
  
  await page.goto('/my-page');
  // Your test logic here
});
```

## Writing Tests

### Authentication Tests

Tests in `tests/auth.spec.ts` cover:

- Protected route redirection
- Sign-in form display
- Sign-up form display
- Public route access

### Mobile Responsiveness Tests

Tests verify:

- Mobile viewport rendering
- Touch-friendly UI elements
- Responsive layouts

### Best Practices

1. **Always use `setupClerkTestingToken`**: This ensures Clerk authentication works properly in tests
2. **Test on multiple browsers**: The config includes Chromium, Firefox, WebKit, Mobile Chrome, and Mobile Safari
3. **Use meaningful test names**: Describe what the test does clearly
4. **Test mobile viewports**: Include mobile-specific test cases
5. **Keep tests independent**: Each test should work in isolation

## Debugging Tests

### Debug Mode
```bash
npx playwright test --debug
```

### Show Test Report
```bash
npx playwright show-report
```

### Trace Viewer
Traces are automatically captured on first retry. View them with:
```bash
npx playwright show-trace trace.zip
```

## CI/CD Integration

The Playwright config is already set up for CI:

- Runs tests serially in CI (`workers: 1`)
- Retries failed tests 2 times
- Fails if `test.only` is found
- Captures traces on failures

### GitHub Actions Example

```yaml
name: Playwright Tests
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps
      - name: Run Playwright tests
        env:
          CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_PUBLISHABLE_KEY }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
        run: npm run test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Troubleshooting

### "Missing CLERK_SECRET_KEY" Error

Make sure you've created `.env.test` with your Clerk API keys.

### Authentication Tests Failing

1. Verify your Clerk API keys are correct
2. Ensure the test user exists in Clerk Dashboard
3. Check that username/password auth is enabled
4. Make sure the dev server is running (`npm run dev`)

### Browser Not Installed

Run:
```bash
npx playwright install
```

### Port Already in Use

If port 3000 is already in use, either:
- Stop the other process using port 3000
- Change the `baseURL` in `playwright.config.ts`

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Clerk Testing Guide](https://clerk.com/docs/guides/development/testing/playwright/overview)
- [Clerk Demo Repo](https://github.com/clerk/clerk-playwright-nextjs)

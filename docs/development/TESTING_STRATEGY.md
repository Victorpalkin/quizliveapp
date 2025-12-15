# Automated Testing Strategy for Zivo

> **Status**: Planned, not yet implemented
> **Created**: December 2025
> **Estimated Effort**: ~32 days total (~12 days for MVP)

## Overview

This document outlines a comprehensive automated testing strategy for the Zivo real-time quiz application. Currently **no tests exist** in the project.

## Current State

- No test framework configured
- No test files in the codebase
- Manual testing only

## Recommended Test Stack

| Layer | Framework | Why |
|-------|-----------|-----|
| Unit Tests | **Vitest** | Fast, native ESM, works with Next.js 15 |
| React Testing | **Vitest + React Testing Library** | Industry standard |
| Integration | **Vitest + Firebase Emulator** | Real Firestore behavior |
| E2E | **Playwright** | Multi-tab/multi-user for real-time multiplayer |

### Why Vitest over Jest?

1. **Native ESM support** - Next.js 15 uses ESM, Vitest handles this natively
2. **Faster execution** - Uses Vite's transform pipeline
3. **Watch mode** - Superior DX with instant feedback
4. **Compatible with Jest API** - Easy migration if needed

### Why Playwright for E2E?

1. **Multi-browser, multi-tab** - Can simulate host + multiple players simultaneously
2. **Built-in parallelization** - Critical for testing concurrent player scenarios
3. **Network interception** - Can mock Firebase responses for edge cases
4. **Trace viewer** - Excellent debugging for flaky real-time tests

---

## Test Folder Structure

```
quizliveapp/
├── vitest.workspace.ts           # Workspace config
├── vitest.config.ts              # Shared config
├── playwright.config.ts          # E2E config
├── src/__tests__/                # Frontend unit tests
│   ├── hooks/                    # Hook tests
│   └── lib/                      # Utility tests
├── functions/src/__tests__/      # Cloud Functions tests
├── functions-ai/src/__tests__/   # AI Functions tests
├── e2e/                          # Playwright E2E tests
│   └── fixtures/                 # Test helpers
└── test-utils/                   # Shared utilities
    ├── firebase-emulator.ts
    ├── mock-firestore.ts
    └── test-factories.ts
```

---

## Implementation Phases

### Phase 1: Foundation (~6 days) - HIGH PRIORITY

Pure function unit tests - easy to write, high value.

| File | Tests |
|------|-------|
| `functions/src/utils/scoring.ts` | scoreSingleChoice, scoreMultipleChoice, scoreSlider, calculateStreak |
| `functions/src/utils/validation.ts` | validateBasicFields, validateTimeRemaining, validateQuestionData |
| `functions/src/utils/fuzzyMatch.ts` | levenshteinDistance, checkFreeResponseAnswer |
| `functions/src/utils/rateLimit.ts` | checkRateLimitInMemory, enforceRateLimitInMemory |

### Phase 2: Cloud Functions Integration (~6 days) - HIGH PRIORITY

Test with Firebase Emulator for real Firestore behavior.

| File | Tests |
|------|-------|
| `functions/src/functions/submitAnswer.ts` | Correct/wrong answers, duplicate prevention, scoring accuracy |
| `functions/src/functions/computeQuestionResults.ts` | Leaderboard computation, streak calculation |
| `functions/src/functions/createHostAccount.ts` | Account creation, rate limiting |

### Phase 3: React Hooks (~8 days) - MEDIUM PRIORITY

Test complex state logic with mocked Firestore.

| File | Tests |
|------|-------|
| `src/app/play/quiz/[gamePin]/hooks/use-player-state-machine.ts` | All state transitions |
| `src/app/play/quiz/[gamePin]/hooks/use-question-timer.ts` | Timer sync, timeout handling |
| `src/app/play/quiz/[gamePin]/hooks/use-answer-submission.ts` | Optimistic updates, error handling |
| `src/app/host/quiz/game/[gameId]/hooks/use-game-controls.ts` | Start/next/end game |

### Phase 4: E2E Tests (~10 days) - MEDIUM PRIORITY

Full user flows with Playwright.

| Test | Description |
|------|-------------|
| `quiz-flow.spec.ts` | Host creates quiz → starts → players answer → results |
| `multiplayer.spec.ts` | Multiple players answering simultaneously |
| `reconnection.spec.ts` | Player disconnects and reconnects |
| `scoring.spec.ts` | Verify correct scores awarded |

### Phase 5: CI/CD (~2 days)

GitHub Actions workflow for automated testing.

---

## Setup Instructions

### Step 1: Install Dependencies

**Root package.json:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom @playwright/test
```

**functions/package.json:**
```bash
cd functions && npm install -D vitest
```

### Step 2: Add npm Scripts

**Root package.json:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run",
    "test:watch": "vitest --watch",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

**functions/package.json:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run",
    "test:integration": "firebase emulators:exec 'vitest run --config vitest.integration.config.ts'"
  }
}
```

### Step 3: Create Vitest Config

**vitest.config.ts (root):**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test-utils/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**functions/vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

### Step 4: Create Playwright Config

**playwright.config.ts:**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:9002',
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:9002',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Test Examples

### Scoring Unit Test

```typescript
// functions/src/__tests__/scoring.test.ts
import { describe, it, expect } from 'vitest';
import { scoreSingleChoice, scoreMultipleChoice, scoreSlider } from '../utils/scoring';

describe('scoreSingleChoice', () => {
  it('awards base 100 + time bonus for correct answer', () => {
    const result = scoreSingleChoice(2, 2, 10, 20); // 50% time remaining

    expect(result.isCorrect).toBe(true);
    expect(result.points).toBe(550); // 100 + (10/20)*900
  });

  it('awards 0 points for incorrect answer', () => {
    const result = scoreSingleChoice(1, 2, 15, 20);

    expect(result.isCorrect).toBe(false);
    expect(result.points).toBe(0);
  });

  it('handles timeout (answerIndex = -1)', () => {
    const result = scoreSingleChoice(-1, 2, 0, 20);

    expect(result.isCorrect).toBe(false);
    expect(result.points).toBe(0);
  });

  it('awards maximum 1000 points for instant correct answer', () => {
    const result = scoreSingleChoice(0, 0, 20, 20);

    expect(result.points).toBe(1000);
  });
});

describe('scoreMultipleChoice', () => {
  it('awards full points when all correct answers selected', () => {
    const result = scoreMultipleChoice([0, 1], [0, 1], 10, 20);

    expect(result.isCorrect).toBe(true);
    expect(result.isPartiallyCorrect).toBe(false);
  });

  it('applies 20% penalty per wrong answer', () => {
    const result = scoreMultipleChoice([0, 1, 2], [0, 1], 10, 20);

    expect(result.isCorrect).toBe(false);
    expect(result.isPartiallyCorrect).toBe(true);
  });
});

describe('scoreSlider', () => {
  it('awards full points for exact correct value', () => {
    const result = scoreSlider(50, 50, 0, 100, 10, 20);

    expect(result.isCorrect).toBe(true);
  });

  it('uses quadratic scoring for distance', () => {
    const exact = scoreSlider(50, 50, 0, 100, 10, 20);
    const close = scoreSlider(45, 50, 0, 100, 10, 20);
    const far = scoreSlider(25, 50, 0, 100, 10, 20);

    expect(exact.points).toBeGreaterThan(close.points);
    expect(close.points).toBeGreaterThan(far.points);
  });
});
```

### Fuzzy Matching Tests

```typescript
// functions/src/__tests__/fuzzyMatch.test.ts
import { describe, it, expect } from 'vitest';
import { levenshteinDistance, checkFreeResponseAnswer } from '../utils/fuzzyMatch';

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
  });

  it('counts single character difference', () => {
    expect(levenshteinDistance('hello', 'hallo')).toBe(1);
  });
});

describe('checkFreeResponseAnswer', () => {
  it('accepts exact match', () => {
    const result = checkFreeResponseAnswer('Paris', 'Paris', [], false, false);
    expect(result.isCorrect).toBe(true);
  });

  it('accepts case-insensitive match', () => {
    const result = checkFreeResponseAnswer('PARIS', 'paris', [], false, true);
    expect(result.isCorrect).toBe(true);
  });

  it('accepts typos when allowTypos is true', () => {
    const result = checkFreeResponseAnswer('Pariss', 'Paris', [], false, true);
    expect(result.isCorrect).toBe(true);
  });

  it('accepts alternative answers', () => {
    const result = checkFreeResponseAnswer('NYC', 'New York', ['NYC'], false, true);
    expect(result.isCorrect).toBe(true);
  });
});
```

### Rate Limiting Tests

```typescript
// functions/src/__tests__/rateLimit.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimitInMemory, enforceRateLimitInMemory } from '../utils/rateLimit';

describe('checkRateLimitInMemory', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('allows first request', () => {
    const result = checkRateLimitInMemory('user-1', 5, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('blocks when limit exceeded', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimitInMemory('user-3', 5, 60);
    }

    const result = checkRateLimitInMemory('user-3', 5, 60);

    expect(result.allowed).toBe(false);
  });

  it('resets after window expires', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimitInMemory('user-4', 5, 60);
    }

    vi.advanceTimersByTime(61000);

    const result = checkRateLimitInMemory('user-4', 5, 60);

    expect(result.allowed).toBe(true);
  });
});
```

### Integration Test with Firebase Emulator

```typescript
// functions/src/__tests__/submitAnswer.integration.test.ts
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { setupEmulator, clearFirestoreData } from '../../../test-utils/firebase-emulator';

describe('submitAnswer Integration', () => {
  let db: FirebaseFirestore.Firestore;

  beforeAll(async () => {
    const setup = await setupEmulator();
    db = setup.db;
  });

  beforeEach(async () => {
    await clearFirestoreData(db);
  });

  it('should award correct points for single-choice correct answer', async () => {
    // Setup game, player, answer key
    const gameId = 'test-game-1';
    const playerId = 'test-player-1';

    // ... setup code ...

    const response = await callSubmitAnswer({
      gameId,
      playerId,
      questionIndex: 0,
      answerIndex: 2,
      timeRemaining: 10,
      questionType: 'single-choice',
    });

    expect(response.success).toBe(true);
    expect(response.isCorrect).toBe(true);
    expect(response.points).toBeGreaterThan(500);
  });

  it('should reject duplicate answer submissions', async () => {
    // Setup with existing answer
    // ...

    await expect(callSubmitAnswer({ questionIndex: 0 }))
      .rejects.toThrow('already answered');
  });
});
```

### Player State Machine Tests

```typescript
// src/__tests__/hooks/use-player-state-machine.test.ts
import { renderHook, act } from '@testing-library/react';
import { usePlayerStateMachine } from '@/app/play/quiz/[gamePin]/hooks/use-player-state-machine';

describe('usePlayerStateMachine', () => {
  it('starts in joining state without session', () => {
    const { result } = renderHook(() =>
      usePlayerStateMachine('123456', false, null, 5, false)
    );
    expect(result.current.state).toBe('joining');
  });

  it('transitions to lobby when game is in lobby state', () => {
    const game = { state: 'lobby', currentQuestionIndex: 0 };

    const { result, rerender } = renderHook(
      ({ game }) => usePlayerStateMachine('123456', false, game, 5, false),
      { initialProps: { game: null } }
    );

    rerender({ game });
    expect(result.current.state).toBe('lobby');
  });

  it('resets to preparing when question index changes', () => {
    // Test question index change triggers state reset
  });
});
```

### Playwright E2E Test

```typescript
// e2e/multiplayer.spec.ts
import { test, expect, Page } from '@playwright/test';

test.describe('Multiplayer Quiz Flow', () => {
  test('complete quiz flow with 2 players', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const player1Context = await browser.newContext();
    const player2Context = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();

    // Host creates and starts game
    await hostPage.goto('/login');
    // ... login and start game ...

    const gamePin = await hostPage.textContent('[data-testid="game-pin"]');

    // Players join
    await joinGame(player1Page, gamePin, 'Alice');
    await joinGame(player2Page, gamePin, 'Bob');

    // Verify players in lobby
    await expect(hostPage.locator('[data-testid="player-count"]')).toHaveText('2');

    // Host starts quiz
    await hostPage.click('[data-testid="start-quiz"]');

    // Players answer
    await Promise.all([
      answerQuestion(player1Page, 0),
      answerQuestion(player2Page, 1),
    ]);

    // Verify scores
    const player1Score = await player1Page.textContent('[data-testid="your-score"]');
    expect(parseInt(player1Score!)).toBeGreaterThan(0);
  });
});

async function joinGame(page: Page, pin: string, name: string) {
  await page.goto('/join');
  await page.fill('[data-testid="game-pin"]', pin);
  await page.click('[data-testid="join-button"]');
  await page.fill('[data-testid="player-name"]', name);
  await page.click('[data-testid="enter-game"]');
}

async function answerQuestion(page: Page, optionIndex: number) {
  await page.waitForSelector('[data-testid="question-screen"]');
  await page.click(`[data-testid="answer-option-${optionIndex}"]`);
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: |
          npm ci
          cd functions && npm ci

      - name: Run frontend unit tests
        run: npm run test:unit

      - name: Run functions unit tests
        run: cd functions && npm run test:unit

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Firebase CLI
        run: npm install -g firebase-tools

      - name: Install dependencies
        run: |
          npm ci
          cd functions && npm ci

      - name: Run integration tests with emulator
        run: |
          cd functions
          firebase emulators:exec 'npm run test:integration' --project test-project

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Install Firebase CLI
        run: npm install -g firebase-tools

      - name: Run E2E tests
        run: firebase emulators:exec 'npx playwright test' --project test-project

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Effort Estimates

| Phase | Effort |
|-------|--------|
| Phase 1: Foundation (Unit Tests) | ~6 days |
| Phase 2: Integration Tests | ~6 days |
| Phase 3: React Hooks | ~8 days |
| Phase 4: E2E | ~10 days |
| Phase 5: CI/CD Setup | ~2 days |
| **Total** | **~32 days** |

**Recommended MVP (Phase 1-2 only):** ~12 days

---

## Critical Files Reference

### Files to Test (Priority Order)

1. `functions/src/utils/scoring.ts` - Core scoring algorithms
2. `functions/src/utils/validation.ts` - Input validation
3. `functions/src/utils/fuzzyMatch.ts` - Free-response matching
4. `functions/src/utils/rateLimit.ts` - Rate limiting
5. `functions/src/functions/submitAnswer.ts` - Main answer submission
6. `functions/src/functions/computeQuestionResults.ts` - Leaderboard computation
7. `src/app/play/quiz/[gamePin]/hooks/use-player-state-machine.ts` - Player state
8. `src/app/play/quiz/[gamePin]/hooks/use-question-timer.ts` - Timer sync
9. `src/app/host/quiz/game/[gameId]/hooks/use-game-controls.ts` - Host controls

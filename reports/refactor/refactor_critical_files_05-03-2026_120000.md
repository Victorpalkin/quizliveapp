# Refactoring Analysis Report — 5 Critical Files (500+ Lines)

**Generated:** 2026-03-05
**Codebase:** Zivo — Real-time audience engagement platform
**Rule Violated:** CLAUDE.md §5 — "Keep pages under 500 lines - extract sub-components"

---

## 1. Executive Summary

Five files exceed the project's 500-line limit. Together they total **2,833 lines** — approximately 35% over budget. This report provides actionable refactoring guidance for each file, identifies cross-file shared patterns, and proposes a 4-phase roadmap.

| # | File | Lines | Over Limit | Severity |
|---|------|------:|----------:|----------|
| 1 | `functions-ai/src/functions/generatePresentationWithAI.ts` | 626 | +126 | High |
| 2 | `src/components/app/evaluation-form-fields.tsx` | 593 | +93 | Medium |
| 3 | `functions/src/functions/computeGameAnalytics.ts` | 588 | +88 | Medium |
| 4 | `functions/src/types.ts` | 525 | +25 | Low |
| 5 | `src/components/app/poll-form.tsx` | 501 | +1 | Low |

**Key findings:**
- **~150 lines of identical boilerplate** duplicated across 3 AI generator functions (auth, rate limiting, Gemini init, error handling, markdown cleanup)
- **17 occurrences** of the `shadow-lg rounded-2xl` Card pattern and **12 occurrences** of the Switch toggle settings pattern across form components — candidates for shared wrappers
- **Naming inconsistency** between backend (`Ranking*`) and frontend (`Evaluation*`) types
- **Local type re-declarations** in `computeGameAnalytics.ts` that drift from canonical `types.ts`

---

## 2. Codebase-Wide Context

### 2.1 AI Generator Duplication (functions-ai/)

Three files follow an identical structure:

| File | Lines | System Prompt | Parse Function | onCall Handler |
|------|------:|:---:|:---:|:---:|
| `generatePresentationWithAI.ts` | 626 | L16-214 (199) | L317-493 (177) | L498-626 (128) |
| `generateQuizWithAI.ts` | 362 | L14-114 (101) | L153-237 (85) | L242-362 (120) |
| `generatePollWithAI.ts` | 335 | L14-103 (90) | L142-210 (69) | L215-335 (120) |

**Identical boilerplate across all three** (~150 lines each):
- `buildContents()` function (conversation history → Gemini format): lines vary but logic is identical
- `onCall` config object: identical 9-line config block
- Auth verification + rate limiting: identical 15-line block
- Prompt validation: identical 12-line block
- Gemini client initialization: identical 5-line block
- Gemini API call with config: identical 10-line block
- Error handling catch block: identical 25-line block
- Markdown code-block stripping: identical 8-line block

### 2.2 Form Component Patterns (src/components/app/)

**Card container pattern** — 17 occurrences across 10 files:
```tsx
<Card className="shadow-lg rounded-2xl border border-card-border">
```

**Switch toggle settings pattern** — 12 occurrences across 6 files:
```tsx
<div className="flex items-center justify-between rounded-lg border p-4">
  <div className="space-y-0.5">
    <Label htmlFor="...">Label Text</Label>
    <p className="text-sm text-muted-foreground">Description</p>
  </div>
  <Switch id="..." checked={value} onCheckedChange={onChange} />
</div>
```

Files using this pattern:
- `evaluation-form-fields.tsx` — 3 instances (L531-543, L560-572, L574-586)
- `poll-form.tsx` — 2 instances (L277-295, L297-315)
- `quiz-form/question-editors/free-response-editor.tsx` — 2 instances
- `host/thoughts-gathering/edit/[activityId]/page.tsx` — 2 instances
- `host/thoughts-gathering/create/page.tsx` — 2 instances
- `host/poll/create-ai/page.tsx` — 1 instance

**GripVertical drag handle pattern** — 9 occurrences across 4 files:
- `evaluation-form-fields.tsx` — 3 instances
- `poll-form.tsx` — 2 instances
- `quiz-form/question-card.tsx` — 2 instances
- `presentation/editor/SlidePanel.tsx` — 2 instances

### 2.3 Naming Inconsistency: Backend vs Frontend

| Concept | Backend (`functions/src/types.ts`) | Frontend (`src/lib/types/evaluation.ts`) |
|---------|----------------------------------|-----------------------------------------|
| Metric type | `RankingMetric` (L351) | `EvaluationMetric` (L10) |
| Item type | `PredefinedItem` (L366) | `PredefinedItem` (L25) |
| Config type | `RankingConfig` (L375) | `EvaluationConfig` (inferred) |
| Activity type | `RankingActivity` (L387) | Activity type `'evaluation'` |
| Item type | `RankingItem` (L399) | `EvaluationItem` (inferred) |
| Results type | `RankingResults` (L455) | — |

The backend uses "Ranking" terminology while the frontend uses "Evaluation" — both refer to the same activity type. The field structures are **identical** (both have `id`, `name`, `description`, `scaleType`, `scaleMin`, `scaleMax`, `scaleLabels`, `weight`, `lowerIsBetter`).

---

## 3. Per-File Analysis

---

### 3.1 `functions-ai/src/functions/generatePresentationWithAI.ts` (626 lines)

**Domain:** AI Cloud Function — generates presentation slides via Gemini
**Exports:** 1 (`generatePresentationWithAI`)
**Internal functions:** 3 (`buildContents`, `linkResultsSlides`, `parsePresentationResponse`)

#### 3.1.1 Current State Metrics

| Metric | Value |
|--------|-------|
| Total lines | 626 |
| System prompt (constant) | 199 lines (L16-214) — 32% of file |
| `parsePresentationResponse` | 177 lines (L317-493) |
| `onCall` handler | 128 lines (L498-626) |
| `linkResultsSlides` | 55 lines (L258-312) |
| `buildContents` | 35 lines (L219-253) |
| Max nesting depth | 5 levels (switch inside for inside try inside async inside onCall) |
| Switch cases | 11 (L347-469) |
| Estimated cyclomatic complexity of `parsePresentationResponse` | ~30 |

#### 3.1.2 Code Smell Inventory

| # | Smell | Location | Severity |
|---|-------|----------|----------|
| S1 | **God function** — `parsePresentationResponse` handles JSON extraction, validation of 11 slide types, default setting, and linking | L317-493 | High |
| S2 | **Massive inline constant** — SYSTEM_PROMPT is 199 lines of string, obscuring the actual code | L16-214 | Medium |
| S3 | **Duplicated boilerplate** — auth, rate limiting, Gemini init, error handling identical to quiz/poll generators | L498-626 | High |
| S4 | **Duplicated markdown cleanup** — identical 8-line block in all 3 generators | L319-330 | Medium |
| S5 | **Magic numbers** — timeLimit defaults (20, 30), max characters (2000, 50000), rate limit (10, 3600) scattered inline | L362, 372, 538, 546, 517 | Low |
| S6 | **Type assertion** — `(slide as any).question = slide.pollQuestion` bypasses type safety | L378 | Medium |
| S7 | **Console.log in production** — violates CLAUDE.md §7 | L487, 593, 597 | Low |

#### 3.1.3 Dependency / Import Analysis

```
Imports:
├── firebase-functions/v2/https  → onCall, HttpsError
├── @google/genai                → GoogleGenAI
├── ../config                    → ALLOWED_ORIGINS, REGION, GEMINI_MODEL, AI_SERVICE_ACCOUNT
├── ../utils/appCheck            → verifyAppCheck
├── ../utils/rateLimit           → enforceRateLimitInMemory
├── ../types                     → 5 types (GeneratePresentationRequest, Response, GeneratedPresentation, GeneratedPresentationSlide, ChatMessage)
└── crypto                       → randomUUID
```

No circular dependencies. Clean import tree.

#### 3.1.4 Extraction Candidates

**E1: Move SYSTEM_PROMPT to dedicated file**
- Create `functions-ai/src/prompts/presentationPrompt.ts`
- **Saves:** 199 lines → file drops to 427

**E2: Extract `stripMarkdownCodeBlocks()` utility**
- Shared across all 3 AI generators
- Create `functions-ai/src/utils/jsonParsing.ts`
- **Saves:** ~8 lines per file × 3 files

**E3: Extract per-slide-type validators**
- Each `case` in the switch can become a standalone validator function
- Create `functions-ai/src/validators/slideValidators.ts`
- Pattern: `Record<SlideType, (slide) => void>`
- **Saves:** `parsePresentationResponse` goes from 177 → ~40 lines

**E4: Extract shared AI generator base**
- Create `functions-ai/src/utils/aiGeneratorBase.ts` with:
  - `createAIHandler(config)` — wraps onCall with auth, rate limit, Gemini init, error handling
  - Generators only supply: system prompt, parse function, log message template
- **Saves:** ~80 lines per generator × 3 generators = ~240 lines total

**E5: Extract `TempIdMapper` class from `linkResultsSlides`**
- Encapsulate the two-pass temp ID resolution
- Could be reused if other generators need slide linking
- **Saves:** Cleaner single-responsibility, ~10 lines of inline logic

**E6: Extract constants**
- Create `functions-ai/src/constants.ts` for magic numbers:
  - `MAX_PROMPT_LENGTH = 2000`
  - `MAX_ATTACHED_CONTENT_LENGTH = 50000`
  - `RATE_LIMIT_COUNT = 10`
  - `RATE_LIMIT_WINDOW_SECONDS = 3600`
  - Default time limits per slide type

#### 3.1.5 Expected Outcome

| Function | Before | After |
|----------|-------:|------:|
| File total | 626 | ~280 (with prompt externalized) |
| `parsePresentationResponse` | 177 | ~40 |
| `onCall` handler | 128 | ~30 (using `createAIHandler`) |
| SYSTEM_PROMPT | 199 inline | 0 (separate file) |

#### 3.1.6 Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Prompt changes break generation | High | Prompt file is isolated, easy to test |
| Shared base breaks one generator | Medium | Each generator still provides its own parse function |
| Validator registry misses new slide type | Low | TypeScript exhaustive check on switch |

---

### 3.2 `src/components/app/evaluation-form-fields.tsx` (593 lines)

**Domain:** React form components for the Evaluation activity editor
**Exports:** 4 components + 2 constants

| Export | Type | Lines | Line Range |
|--------|------|------:|-----------|
| `DEFAULT_METRIC` | Factory function | 11 | L37-47 |
| `EVALUATION_TEMPLATES` | Constant array | 40 | L57-96 |
| `EvaluationTemplatePicker` | Component | 45 | L106-151 |
| `EvaluationMetricsEditor` | Component | 222 | L163-385 |
| `EvaluationPredefinedItemsEditor` | Component | 103 | L394-497 |
| `EvaluationParticipantSettings` | Component | 80 | L512-592 |

#### 3.2.1 Current State Metrics

| Metric | Value |
|--------|-------|
| Total lines | 593 |
| Components | 4 |
| Largest component | `EvaluationMetricsEditor` — 222 lines |
| Max JSX nesting depth | 7 levels (Card > CardContent > map > div > grid > div > Input) |
| useState hooks | 2 (in `EvaluationPredefinedItemsEditor`) |
| Imports | 13 external modules |

#### 3.2.2 Code Smell Inventory

| # | Smell | Location | Severity |
|---|-------|----------|----------|
| S1 | **Large component** — `EvaluationMetricsEditor` at 222 lines, hard to scan | L163-385 | Medium |
| S2 | **Repeated Card wrapper** — identical `Card className="shadow-lg rounded-2xl border border-card-border"` pattern, 4 times | L191, 413, 523, and in other files | Medium |
| S3 | **Repeated Switch toggle pattern** — 3 identical layout blocks for boolean settings | L531-543, L560-572, L574-586 | Medium |
| S4 | **Inline scale-type logic** — `onValueChange` handler at L251-261 sets different defaults per scale type inline | L250-261 | Low |
| S5 | **Conditional rendering blocks** — numeric scale inputs (L284-307) and label scale inputs (L309-329) are independent sub-sections mixed into the metric card | L284-329 | Low |
| S6 | **Template data mixed with component code** — `EVALUATION_TEMPLATES` array with JSX icons defined inline | L57-96 | Low |

#### 3.2.3 Extraction Candidates

**E1: `SettingToggle` shared component**
```tsx
// Before (repeated 12x across codebase):
<div className="flex items-center justify-between rounded-lg border p-4">
  <div className="space-y-0.5">
    <Label htmlFor={id}>{label}</Label>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
  <Switch id={id} checked={checked} onCheckedChange={onChange} />
</div>

// After:
<SettingToggle
  id="allowItems"
  label="Allow Participant Item Submissions"
  description="Let participants suggest items to be ranked"
  checked={allowParticipantItems}
  onCheckedChange={onAllowParticipantItemsChange}
/>
```
- **Impact:** Eliminates 12 instances across 6 files (~7 lines each = ~84 lines saved)
- **Location:** Create `src/components/app/setting-toggle.tsx`

**E2: `FormCard` shared wrapper**
```tsx
// Before (repeated 17x across codebase):
<Card className="shadow-lg rounded-2xl border border-card-border">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>

// After:
<FormCard title="Title" description="Description">
  ...
</FormCard>
```
- **Impact:** Reduces boilerplate across 10 files
- **Location:** Create `src/components/app/form-card.tsx`

**E3: Split `EvaluationMetricsEditor` into sub-components**
- Extract `MetricCard` (the per-metric `.map()` body, L220-381) — ~160 lines
- Extract `NumericScaleInputs` (L284-307) — ~23 lines
- Extract `LabelScaleInputs` (L309-329) — ~20 lines
- `EvaluationMetricsEditor` becomes an orchestrator: add/remove metrics + map to `MetricCard`
- **Saves:** ~200 lines from the main component

**E4: Move templates to data file**
- Move `EVALUATION_TEMPLATES` to `src/lib/constants/evaluation-templates.ts`
- **Saves:** ~40 lines

#### 3.2.4 Expected Outcome

| Metric | Before | After |
|--------|-------:|------:|
| File total | 593 | ~300 |
| `EvaluationMetricsEditor` | 222 | ~50 (orchestrator) |
| `EvaluationParticipantSettings` | 80 | ~30 (using SettingToggle) |
| New shared components created | 0 | 2 (SettingToggle, FormCard) |

#### 3.2.5 Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| SettingToggle doesn't cover all variants (e.g., with tooltip) | Low | Add optional `tooltip` prop |
| FormCard too rigid for complex headers | Low | Accept `headerExtra` render prop for action buttons |
| MetricCard props become unwieldy | Low | Pass `metric` object + `onUpdate` callback |

---

### 3.3 `functions/src/functions/computeGameAnalytics.ts` (588 lines)

**Domain:** Cloud Function — computes comprehensive post-game analytics
**Exports:** 1 (`computeGameAnalytics`)
**Internal functions:** 5 (`buildQuestionStats`, `buildPositionHistory`, `buildScoreDistribution`, `buildFullLeaderboard`, `computeSummary`, `buildCrowdsourceStats`)

#### 3.3.1 Current State Metrics

| Metric | Value |
|--------|-------|
| Total lines | 588 |
| `onCall` handler | 133 lines (L70-203) |
| `buildQuestionStats` | 139 lines (L208-346) |
| `buildPositionHistory` | 45 lines (L353-397) |
| `buildScoreDistribution` | 44 lines (L402-445) |
| `buildFullLeaderboard` | 46 lines (L450-495) |
| `computeSummary` | 48 lines (L500-547) |
| `buildCrowdsourceStats` | 37 lines (L552-588) |
| Local interface declarations | 4 (Question, Quiz, Game, QuestionSubmission) — L21-64 |
| Max nesting depth | 5 (map > if > forEach > if > set) |

#### 3.3.2 Code Smell Inventory

| # | Smell | Location | Severity |
|---|-------|----------|----------|
| S1 | **Duplicate type definitions** — local `Question` (L21-36), `Quiz` (L41-44), `Game` (L49-54), `QuestionSubmission` (L59-64) duplicate/overlap with `types.ts` | L21-64 | High |
| S2 | **God function** — `buildQuestionStats` handles 6 question types with deeply nested conditionals | L208-346 | High |
| S3 | **O(n×m) data access** — `player.answers?.find(a => a.questionIndex === index)` inside `players.forEach` inside `questions.map` | L231 | Medium |
| S4 | **Mixed concerns in handler** — the `onCall` handler does auth, data fetching, orchestration, and persistence all in one block | L70-203 | Medium |
| S5 | **Magic strings** — question type strings repeated as literals: `'slide'`, `'single-choice'`, `'poll-single'`, etc. | L211, 244, 263, 276, 290, 302, 458, 506 | Low |
| S6 | **Console.log in production** — violates CLAUDE.md §7 | L180, 191 | Low |
| S7 | **Unused parameter** — `_questions` in `buildFullLeaderboard` | L452 | Low |

#### 3.3.3 Extraction Candidates

**E1: Use canonical types from `types.ts`**
- Remove local `Question`, `Quiz`, `Game`, `QuestionSubmission` interfaces (L21-64)
- Import from `../types` — extend if necessary with `Pick<>` or `Partial<>`
- **Saves:** 44 lines, eliminates type drift risk

**E2: Extract per-question-type distribution builders**
- Create `functions/src/utils/questionDistributions.ts`:
  - `buildSingleChoiceDistribution(question, answers)`
  - `buildMultipleChoiceDistribution(question, answers)`
  - `buildSliderDistribution(question, answers)`
  - `buildFreeResponseDistribution(question, answers)`
- `buildQuestionStats` becomes a thin orchestrator using a registry:
  ```ts
  const distributionBuilder = distributionBuilders[question.type];
  const distribution = distributionBuilder?.(question, answers);
  ```
- **Saves:** `buildQuestionStats` goes from 139 → ~50 lines

**E3: Pre-index player answers**
- Replace O(n×m) `.find()` with a pre-built index:
  ```ts
  // Build once: Map<questionIndex, PlayerAnswer[]>
  const answersByQuestion = new Map<number, PlayerAnswer[]>();
  players.forEach(p => p.answers?.forEach(a => {
    if (!answersByQuestion.has(a.questionIndex)) answersByQuestion.set(a.questionIndex, []);
    answersByQuestion.get(a.questionIndex)!.push(a);
  }));
  ```
- **Saves:** O(n×m) → O(n+m), significant for large games

**E4: Extract statistical utilities**
- Functions like median, stdDev, weighted average are reusable
- `computeRankingResults.ts` (the evaluation analytics function) likely uses similar calculations
- Create `functions/src/utils/statistics.ts`

**E5: Extract data fetching layer**
- Move Firestore queries (game, quiz, players, submissions) to `functions/src/utils/gameDataFetcher.ts`
- The handler becomes purely orchestration
- **Saves:** ~40 lines from handler, reusable across other analytics functions

#### 3.3.4 Expected Outcome

| Function | Before | After |
|----------|-------:|------:|
| File total | 588 | ~350 |
| Local type declarations | 44 | 0 (use imports) |
| `buildQuestionStats` | 139 | ~50 |
| `onCall` handler | 133 | ~80 (with data fetcher) |

#### 3.3.5 Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Canonical types missing fields needed by analytics | Medium | Extend with `Pick<Game, 'quizId' | 'hostId' | 'state' | 'questions'>` |
| Distribution builders break for edge cases | Low | Port existing switch cases 1:1, add unit tests |
| Pre-indexing uses more memory | Low | Negligible for game sizes (<1000 players) |

---

### 3.4 `functions/src/types.ts` (525 lines)

**Domain:** Shared TypeScript type definitions for Cloud Functions
**Exports:** 41 types/interfaces across 7 domains

#### 3.4.1 Current State Metrics

| Metric | Value |
|--------|-------|
| Total lines | 525 |
| Exported interfaces | 34 |
| Exported types | 3 |
| Logical domains | 7 |
| Comments (JSDoc) | ~120 lines (~23%) |
| Section separators | 3 (`// ===` blocks) |

#### 3.4.2 Domain Inventory

| Domain | Types | Line Range | Lines |
|--------|------:|-----------|------:|
| Quiz submission | `SubmitAnswerRequest`, `AnswerKeyEntry`, `AnswerKey`, `PlayerAnswer`, `SubmitAnswerResult` | L8-122 | 115 |
| Game/Player | `Game`, `Player` | L57-96 | 40 |
| Host accounts | `CreateHostAccountRequest`, `CreateHostAccountResult` | L99-132 | 34 |
| Leaderboard | `LeaderboardEntry`, `PlayerRankInfo`, `GameLeaderboard` | L137-166 | 30 |
| Game analytics | `GameAnalytics`, `GameAnalyticsSummary`, `CrowdsourceAnalytics`, `QuestionStats`, `PositionHistoryEntry`, `ScoreBin`, `LeaderboardWithStats`, `ComputeGameAnalyticsRequest`, `ComputeGameAnalyticsResult` | L168-275 | 108 |
| Poll analytics | `PollAnalytics`, `PollAnalyticsSummary`, `PollQuestionStats`, `ComputePollAnalyticsRequest`, `ComputePollAnalyticsResult`, `PollQuestionType`, `SubmitPollAnswerRequest`, `SubmitPollAnswerResult`, `PollPlayerAnswer` | L277-525 | 248 |
| Ranking/Evaluation | `RankingMetric`, `PredefinedItem`, `RankingConfig`, `RankingActivity`, `RankingItem`, `PlayerRatings`, `MetricScoreDetails`, `RankingItemResult`, `RankingResults`, `ComputeRankingResultsRequest`, `ComputeRankingResultsResult` | L344-479 | 136 |

#### 3.4.3 Code Smell Inventory

| # | Smell | Location | Severity |
|---|-------|----------|----------|
| S1 | **God file** — 41 exports across 7 unrelated domains in a single file | Entire file | High |
| S2 | **Naming inconsistency** — `RankingMetric` vs frontend `EvaluationMetric`, `RankingConfig` vs frontend `EvaluationConfig` | L351-479 | Medium |
| S3 | **Field-level inconsistency** — `functions/src/types.ts:Game` (L57-68) has different fields than `computeGameAnalytics.ts` local `Game` (which adds `questions?` field) | L57-68 | Medium |
| S4 | **No barrel re-export** — consumers import directly from the god file | All consumers | Low |
| S5 | **`admin.firestore.FieldValue` coupling** — types are coupled to the Firebase Admin SDK, making them non-portable | L76, 165, 182, 291, 459, 520 | Low |

#### 3.4.4 Split Target

Create `functions/src/types/` directory:

```
functions/src/types/
├── index.ts                      # Barrel re-export (backward compatible)
├── submission.ts                 # SubmitAnswerRequest, AnswerKeyEntry, AnswerKey, PlayerAnswer, SubmitAnswerResult
├── game.ts                       # Game, Player
├── auth.ts                       # CreateHostAccountRequest, CreateHostAccountResult
├── leaderboard.ts                # LeaderboardEntry, PlayerRankInfo, GameLeaderboard
├── analytics.ts                  # GameAnalytics, GameAnalyticsSummary, CrowdsourceAnalytics, QuestionStats, etc.
├── poll.ts                       # PollAnalytics, PollQuestionStats, SubmitPollAnswerRequest, PollPlayerAnswer, etc.
└── evaluation.ts                 # RankingMetric→EvaluationMetric, RankingConfig, RankingItem, etc.
```

**Backward compatibility:** The barrel `index.ts` re-exports everything, so all existing `import { X } from '../types'` statements continue to work with zero changes.

```ts
// functions/src/types/index.ts
export * from './submission';
export * from './game';
export * from './auth';
export * from './leaderboard';
export * from './analytics';
export * from './poll';
export * from './evaluation';
```

#### 3.4.5 Naming Alignment Recommendation

Rename backend types to match frontend convention (evaluation > ranking):

| Current (Backend) | Proposed | Frontend Equivalent |
|-------------------|----------|-------------------|
| `RankingMetric` | `EvaluationMetric` | `EvaluationMetric` |
| `RankingConfig` | `EvaluationConfig` | `EvaluationConfig` |
| `RankingActivity` | `EvaluationActivity` | — |
| `RankingItem` | `EvaluationItem` | — |
| `RankingItemResult` | `EvaluationItemResult` | — |
| `RankingResults` | `EvaluationResults` | — |
| `ComputeRankingResultsRequest` | `ComputeEvaluationResultsRequest` | — |
| `ComputeRankingResultsResult` | `ComputeEvaluationResultsResult` | — |

**Search-and-replace scope:** `functions/src/` directory only. The `type: 'evaluation'` field in `RankingActivity` (L389) already uses the correct name.

#### 3.4.6 Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking imports during split | High | Barrel `index.ts` re-export ensures zero breaking changes |
| Renaming causes runtime field mismatches in Firestore | High | Only rename TypeScript interfaces, NOT Firestore field names |
| Circular dependencies in split files | Low | Types are pure interfaces with no logic — no circular risk |

---

### 3.5 `src/components/app/poll-form.tsx` (501 lines)

**Domain:** React form component for creating/editing Polls
**Exports:** 2 (`PollFormData` interface, `PollForm` component)

#### 3.5.1 Current State Metrics

| Metric | Value |
|--------|-------|
| Total lines | 501 |
| `PollForm` component | 417 lines (L84-501) |
| Helper functions (module-level) | 3 (`createEmptyQuestion`, `questionToFormData`, types) |
| `useState` hooks | 5 (title, description, allowAnonymous, defaultShowLiveResults, questions) |
| `useEffect` hooks | 1 (reset form on initialData change) |
| Max JSX nesting depth | 8 (div > Card > CardContent > map > div > div > map > div) |
| Handler functions inside component | 9 |

#### 3.5.2 Code Smell Inventory

| # | Smell | Location | Severity |
|---|-------|----------|----------|
| S1 | **Monolithic component** — `PollForm` is 417 lines with JSX, handlers, and validation all in one | L84-501 | High |
| S2 | **Deep JSX nesting** — the question card JSX (L329-461) is 133 lines of deeply nested markup | L329-461 | Medium |
| S3 | **Repeated Card wrapper** — 2 instances of the `shadow-lg rounded-2xl` Card pattern | L247, 320 | Low (shared with E-2.2) |
| S4 | **Repeated Switch toggle** — 2 instances of the settings toggle pattern | L277-295, L297-315 | Low (shared with E-2.2) |
| S5 | **Inline type conversion** — `convertToApiQuestion` (L147-174) has branching logic with `as` casts | L147-174 | Low |
| S6 | **Handler proliferation** — 9 handler functions (addQuestion, removeQuestion, updateQuestion, updateAnswer, addAnswer, removeAnswer, validateQuestions, handleSubmit, + 2 icon/name helpers) defined inside component | L110-243 | Medium |

#### 3.5.3 Extraction Candidates

**E1: Extract `PollQuestionCard` component**
- The per-question `.map()` body (L329-461) is a natural extraction unit
- Props: `question`, `index`, `onUpdate`, `onRemove`, `onUpdateAnswer`, `onAddAnswer`, `onRemoveAnswer`, `questionsCount`
- **Saves:** ~133 lines from PollForm

**E2: Extract validation utilities**
- `validateQuestions()` (L176-199) and the title check in `handleSubmit` (L201-226)
- Create `src/lib/utils/poll-validation.ts` or keep as module-level function
- **Saves:** ~50 lines from component body

**E3: Extract type conversion helpers**
- `convertToApiQuestion` (L147-174), `questionToFormData` (L62-82), `createEmptyQuestion` (L36-46)
- Move to `src/lib/utils/poll-converters.ts`
- **Saves:** ~60 lines, cleaner separation of data transformation from UI

**E4: Use shared `SettingToggle` and `FormCard`**
- Replace 2 Switch toggle blocks with `SettingToggle` (from E-2.1 above)
- Replace 2 Card wrappers with `FormCard` (from E-2.2 above)
- **Saves:** ~30 lines

**E5: Extract question type helpers**
- `getQuestionIcon` (L228-233) and `getQuestionTypeName` (L236-242) to a shared constant map
- Potentially reusable in host poll pages
- **Saves:** ~15 lines

#### 3.5.4 Expected Outcome

| Metric | Before | After |
|--------|-------:|------:|
| File total | 501 | ~250 |
| `PollForm` component | 417 | ~200 |
| New `PollQuestionCard` | 0 | ~160 |
| Type converters (extracted) | inline | separate file |

#### 3.5.5 Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Prop drilling in PollQuestionCard | Low | Callbacks are already defined; pass them through |
| Breaking form behavior during extraction | Medium | No logic changes — pure structural refactor |
| Shared SettingToggle missing poll-specific tooltip variant | Low | SettingToggle already designed with optional tooltip |

---

## 4. Cross-File Refactoring Opportunities

### 4.1 Shared UI Components (New Files)

| Component | Used By | Instances Replaced | Lines Saved |
|-----------|---------|-------------------:|------------:|
| `SettingToggle` | 6 files | 12 | ~84 |
| `FormCard` | 10 files | 17 | ~85 |
| **Total** | | **29** | **~169** |

### 4.2 AI Generator Base (functions-ai/)

| Utility | Used By | Lines Saved Per File | Total Saved |
|---------|---------|--------------------:|-----------:|
| `createAIHandler()` | 3 generators | ~80 | ~240 |
| `stripMarkdownCodeBlocks()` | 3 generators | ~8 | ~24 |
| `constants.ts` | 3 generators | ~5 | ~15 |
| **Total** | | | **~279** |

### 4.3 Backend Type Reorganization

| Action | Files Affected | Risk |
|--------|---------------:|------|
| Split `types.ts` into 7 domain files | 1 → 8 | Zero (barrel re-export) |
| Rename `Ranking*` → `Evaluation*` | ~8 files in functions/ | Low (search-replace) |
| Remove local type re-declarations | 1 file (computeGameAnalytics) | Low |

### 4.4 Statistics Utilities (functions/)

| Utility | Potential Consumers |
|---------|-------------------|
| `median(values)` | computeGameAnalytics, computeRankingResults |
| `stdDev(values)` | computeGameAnalytics, computeRankingResults |
| `weightedAverage(values, weights)` | computeRankingResults |
| `distribution(values, bins)` | computeGameAnalytics |

---

## 5. Prioritized Refactoring Roadmap

### Phase 1: Zero-Risk Structural Moves (Est. impact: ~300 lines)
> No logic changes, no behavior changes, barrel re-exports preserve compatibility.

1. **Split `functions/src/types.ts`** into 7 domain files + barrel `index.ts`
2. **Move `SYSTEM_PROMPT`** constants to `functions-ai/src/prompts/*.ts`
3. **Move `EVALUATION_TEMPLATES`** to `src/lib/constants/evaluation-templates.ts`
4. **Remove local type re-declarations** from `computeGameAnalytics.ts` (use imports)

### Phase 2: Shared Component Extraction (Est. impact: ~170 lines)
> Create 2 new shared components, update consumers.

1. **Create `SettingToggle`** component → update 6 consumer files
2. **Create `FormCard`** component → update 10 consumer files
3. **Extract `PollQuestionCard`** from `poll-form.tsx`
4. **Extract `MetricCard`** (+ `NumericScaleInputs`, `LabelScaleInputs`) from `evaluation-form-fields.tsx`

### Phase 3: AI Generator Consolidation (Est. impact: ~280 lines)
> Requires more careful testing since it modifies Cloud Function behavior.

1. **Create `stripMarkdownCodeBlocks()`** utility
2. **Create `createAIHandler()` base** — shared auth, rate limiting, Gemini init, error handling
3. **Refactor all 3 generators** to use the base
4. **Extract slide validators** to registry pattern

### Phase 4: Analytics Optimization (Est. impact: ~100 lines)
> Performance and code quality improvements.

1. **Pre-index player answers** in `buildQuestionStats`
2. **Extract per-question-type distribution builders** to registry
3. **Create shared statistics utilities** (median, stdDev)
4. **Rename `Ranking*` → `Evaluation*`** across backend (coordinate with frontend types)
5. **Extract data fetching layer** for analytics functions

---

## 6. Risk Assessment Matrix

| Risk | Probability | Impact | Phase | Mitigation |
|------|:-----------:|:------:|:-----:|------------|
| Breaking imports during types split | Low | High | 1 | Barrel `index.ts` re-export |
| SettingToggle doesn't cover all UI variants | Low | Low | 2 | Optional `tooltip`, `children`, `disabled` props |
| AI generator base changes break production | Medium | High | 3 | Deploy behind feature flag, test each generator independently |
| Firestore field mismatch on type rename | Low | High | 4 | Rename TS interfaces only, NOT Firestore document fields |
| Pre-indexing increases memory usage | Low | Low | 4 | Negligible for <1000 player games |
| Shared statistics utilities have edge cases | Low | Medium | 4 | Port existing logic 1:1, add unit tests |

---

## 7. Implementation Checklist

### Phase 1: Structural Moves
- [ ] Create `functions/src/types/` directory
- [ ] Create `functions/src/types/submission.ts` with quiz submission types
- [ ] Create `functions/src/types/game.ts` with Game, Player types
- [ ] Create `functions/src/types/auth.ts` with host account types
- [ ] Create `functions/src/types/leaderboard.ts` with leaderboard types
- [ ] Create `functions/src/types/analytics.ts` with game analytics types
- [ ] Create `functions/src/types/poll.ts` with poll types
- [ ] Create `functions/src/types/evaluation.ts` with ranking/evaluation types
- [ ] Create `functions/src/types/index.ts` barrel re-export
- [ ] Delete original `functions/src/types.ts`
- [ ] Verify all imports still resolve (`npm run build` in functions/)
- [ ] Create `functions-ai/src/prompts/presentationPrompt.ts`
- [ ] Create `functions-ai/src/prompts/quizPrompt.ts`
- [ ] Create `functions-ai/src/prompts/pollPrompt.ts`
- [ ] Move SYSTEM_PROMPT from each generator to its prompt file
- [ ] Create `src/lib/constants/evaluation-templates.ts`
- [ ] Move `EVALUATION_TEMPLATES` from `evaluation-form-fields.tsx`
- [ ] Remove local interfaces from `computeGameAnalytics.ts` (L21-64)
- [ ] Add necessary fields to canonical `Game` type or use `Pick<>`
- [ ] Verify `npm run build` passes for all packages

### Phase 2: Shared Components
- [ ] Create `src/components/app/setting-toggle.tsx`
- [ ] Create `src/components/app/form-card.tsx`
- [ ] Update `evaluation-form-fields.tsx` to use SettingToggle (3 instances)
- [ ] Update `poll-form.tsx` to use SettingToggle (2 instances)
- [ ] Update remaining 4 consumer files to use SettingToggle
- [ ] Update all 10 files to use FormCard (17 instances)
- [ ] Extract `PollQuestionCard` from `poll-form.tsx`
- [ ] Extract `MetricCard`, `NumericScaleInputs`, `LabelScaleInputs` from `evaluation-form-fields.tsx`
- [ ] Verify dark mode rendering for all new components
- [ ] Verify mobile responsiveness

### Phase 3: AI Generator Consolidation
- [ ] Create `functions-ai/src/utils/jsonParsing.ts` with `stripMarkdownCodeBlocks()`
- [ ] Create `functions-ai/src/utils/aiGeneratorBase.ts` with `createAIHandler()`
- [ ] Create `functions-ai/src/constants.ts` for shared magic numbers
- [ ] Refactor `generateQuizWithAI.ts` to use base (smallest file first)
- [ ] Refactor `generatePollWithAI.ts` to use base
- [ ] Refactor `generatePresentationWithAI.ts` to use base
- [ ] Create `functions-ai/src/validators/slideValidators.ts`
- [ ] Extract per-slide-type validators to registry
- [ ] Test all 3 generators with sample prompts
- [ ] Deploy and verify in staging

### Phase 4: Analytics Optimization
- [ ] Create `functions/src/utils/statistics.ts` (median, stdDev, etc.)
- [ ] Create `functions/src/utils/questionDistributions.ts`
- [ ] Refactor `buildQuestionStats` to use distribution registry
- [ ] Add answer pre-indexing in `buildQuestionStats`
- [ ] Rename `Ranking*` → `Evaluation*` in `functions/src/types/evaluation.ts`
- [ ] Update all consuming files in `functions/src/`
- [ ] Create `functions/src/utils/gameDataFetcher.ts`
- [ ] Refactor analytics handler to use data fetcher
- [ ] Replace `console.log/error` with error-logging utility (CLAUDE.md §7)
- [ ] Add unit tests for statistics utilities
- [ ] Verify analytics output unchanged (compare with existing game)

---

## 8. Success Metrics

| Metric | Current | Target | Measurement |
|--------|--------:|-------:|-------------|
| Files over 500 lines | 5 | 0 | `find . -name '*.ts' -o -name '*.tsx' \| xargs wc -l \| awk '$1 > 500'` |
| Largest file | 626 lines | <350 lines | Same command |
| Total lines across 5 files | 2,833 | <2,000 | Sum of refactored files |
| Duplicated AI boilerplate | ~450 lines (150×3) | ~50 lines | Manual review |
| SettingToggle pattern instances | 12 (inline) | 12 (component uses) | Grep for pattern |
| FormCard pattern instances | 17 (inline) | 17 (component uses) | Grep for pattern |
| Type domains in single file | 7 | 1 per file | File count in types/ |
| Backend/Frontend naming alignment | Mismatched | Aligned | Manual review |
| Console.log in production | 5+ instances | 0 | `grep -r 'console\.' functions/` |

---

## 9. Appendices

### Appendix A: Function Complexity Table

| File | Function | Lines | Est. Cyclomatic Complexity | Nesting Depth |
|------|----------|------:|---------------------------:|--------------:|
| generatePresentationWithAI.ts | `parsePresentationResponse` | 177 | ~30 | 5 |
| generatePresentationWithAI.ts | `onCall` handler | 128 | ~8 | 4 |
| generatePresentationWithAI.ts | `linkResultsSlides` | 55 | ~10 | 3 |
| generatePresentationWithAI.ts | `buildContents` | 35 | ~4 | 2 |
| computeGameAnalytics.ts | `buildQuestionStats` | 139 | ~20 | 5 |
| computeGameAnalytics.ts | `onCall` handler | 133 | ~6 | 3 |
| computeGameAnalytics.ts | `computeSummary` | 48 | ~5 | 2 |
| computeGameAnalytics.ts | `buildFullLeaderboard` | 46 | ~4 | 2 |
| computeGameAnalytics.ts | `buildPositionHistory` | 45 | ~4 | 3 |
| computeGameAnalytics.ts | `buildScoreDistribution` | 44 | ~5 | 2 |
| computeGameAnalytics.ts | `buildCrowdsourceStats` | 37 | ~3 | 2 |
| evaluation-form-fields.tsx | `EvaluationMetricsEditor` | 222 | ~8 | 7 |
| evaluation-form-fields.tsx | `EvaluationPredefinedItemsEditor` | 103 | ~4 | 5 |
| evaluation-form-fields.tsx | `EvaluationParticipantSettings` | 80 | ~3 | 4 |
| evaluation-form-fields.tsx | `EvaluationTemplatePicker` | 45 | ~3 | 4 |
| poll-form.tsx | `PollForm` | 417 | ~15 | 8 |

### Appendix B: AI Generator Duplication Map

Lines that are **identical or near-identical** across the 3 generators:

| Block | Presentation | Quiz | Poll | Lines (each) |
|-------|-------------|------|------|-------------:|
| Imports | L1-13 | L1-11 | L1-11 | ~12 |
| `buildContents()` | L219-253 | L119-148 | L108-137 | ~30 |
| Markdown stripping | L319-330 | L155-166 | L144-155 | ~8 |
| `onCall` config | L499-510 | L243-254 | L216-227 | ~10 |
| Auth + rate limiting | L512-526 | L256-270 | L229-243 | ~15 |
| Prompt validation | L530-551 | L274-288 | L248-261 | ~12 |
| Gemini client init | L555-559 | L291-295 | L264-268 | ~5 |
| Gemini API call | L570-579 | L305-314 | L278-287 | ~10 |
| Response null check | L582-588 | L317-323 | L290-296 | ~7 |
| Error catch block | L596-624 | L331-360 | L304-333 | ~25 |
| **Total duplicated** | | | | **~134** |

### Appendix C: Type Domain Dependency Graph

```
submission.ts ──→ (standalone, no deps)
game.ts ──→ submission.ts (Player.answers uses PlayerAnswer)
auth.ts ──→ (standalone)
leaderboard.ts ──→ (standalone, uses admin.firestore.FieldValue)
analytics.ts ──→ (standalone, uses admin.firestore.FieldValue)
poll.ts ──→ (standalone, uses admin.firestore.FieldValue)
evaluation.ts ──→ (standalone, uses admin.firestore.FieldValue)
```

All domain files are effectively standalone (depend only on `firebase-admin` for `FieldValue`). `game.ts` has a soft dependency on `submission.ts` through the `Player.answers` field type.

### Appendix D: Files Affected by Shared Component Introduction

**SettingToggle adoption:**
1. `src/components/app/evaluation-form-fields.tsx` (3 instances)
2. `src/components/app/poll-form.tsx` (2 instances)
3. `src/components/app/quiz-form/question-editors/free-response-editor.tsx` (2 instances)
4. `src/app/host/thoughts-gathering/edit/[activityId]/page.tsx` (2 instances)
5. `src/app/host/thoughts-gathering/create/page.tsx` (2 instances)
6. `src/app/host/poll/create-ai/page.tsx` (1 instance)

**FormCard adoption:**
1. `src/components/app/poll-form.tsx` (2 instances)
2. `src/app/host/poll/[activityId]/page.tsx` (2 instances)
3. `src/components/app/evaluation-form-fields.tsx` (4 instances)
4. `src/app/host/thoughts-gathering/[activityId]/page.tsx` (2 instances)
5. `src/app/host/thoughts-gathering/edit/[activityId]/page.tsx` (1 instance)
6. `src/app/host/thoughts-gathering/create/page.tsx` (1 instance)
7. `src/app/host/evaluation/create/page.tsx` (1 instance)
8. `src/app/host/evaluation/create-from-thoughts/page.tsx` (2 instances)
9. `src/app/host/evaluation/[activityId]/page.tsx` (1 instance)
10. `src/app/host/evaluation/edit/[activityId]/page.tsx` (1 instance)

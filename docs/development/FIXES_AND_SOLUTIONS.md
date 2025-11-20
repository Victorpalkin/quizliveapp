# gQuiz - Bug Fixes and Technical Solutions

**Last Updated:** 2025-11-19

Compact reference of all bug fixes, technical solutions, and architectural decisions.

---

## Table of Contents

1. [Player State Synchronization](#player-state-synchronization)
2. [Timer Synchronization & Clock Skew](#timer-synchronization--clock-skew)
3. [Race Conditions & Performance](#race-conditions--performance)
4. [Quiz Sharing & Permissions](#quiz-sharing--permissions)
5. [React & UI Issues](#react--ui-issues)
6. [Security](#security)

---

## Player State Synchronization

### Problem
Players stuck on result/preparing screens when host moved to next question.

### Root Causes
1. Missing `state` in effect dependencies → no multi-step transitions
2. `timedOut` in dependencies → unwanted effect re-runs
3. Time not reset in preparing state → false timeouts
4. Host auto-transitions too fast (preparing → question in milliseconds)

### Solution
```typescript
// Use ref to track question index (prevents re-render loops)
const lastQuestionIndexRef = useRef<number>(-1);

// Question index change = primary signal for new questions
if (questionChanged) {
  setState('preparing');
  return;
}

// Include state in dependencies for multi-step transitions
}, [game?.state, game?.currentQuestionIndex, gameLoading, state]);
// Removed: timedOut

// Reset ALL state in preparing (including time!)
if (state === 'preparing') {
  setTime(timeLimit); // ✅ Critical
  setAnswerSelected(null);
  setTimedOut(false);
  setLastAnswer(null);
}
```

**Files Modified:**
- `src/app/play/[gameId]/hooks/use-player-state-machine.ts` - Removed timedOut parameter/dependency
- `src/app/play/[gameId]/page.tsx` - Reset time in preparing state

---

## Timer Synchronization & Clock Skew

### Problem
3-second timer discrepancies between devices despite initial clock sync implementation.

### Root Causes (5 Critical Issues)
1. **Stale Closure in Drift Detection** (90% likelihood) - `time` captured in closure never updates
2. **Race Condition** (95% likelihood) - Offset calculated using different server timestamp than questionStartTime
3. **Single-Sample Offset** (60% likelihood) - Vulnerable to network spikes
4. **Mixed Time Sources** (50% likelihood) - performance.now() vs Date.now()
5. **Loose Drift Thresholds** - 0.5s threshold too loose, checked too infrequently (5s)

### Solution: 5-Phase Hybrid Clock Synchronization

#### Fix #1: Stale Closure
```typescript
const timeRef = useRef(time);
useEffect(() => { timeRef.current = time; }, [time]);

// In drift detection:
detectDrift(timeRef.current, ..., DRIFT_THRESHOLD_SECONDS);
```

#### Fix #2: Pre-Calculate Offset in Preparing State
```typescript
// Eliminates race condition - offset ready before question starts
useEffect(() => {
  if (isPreparing && useClockSync && !offsetReadyRef.current) {
    const offset = await calculateClockOffset(firestore);
    clockOffsetRef.current = offset;
    offsetReadyRef.current = true;
  }
}, [isPreparing, useClockSync, firestore, isActive, currentQuestionIndex]);
```

#### Fix #3: Multi-Sample with Median Filtering
```typescript
// Take 3 samples, sort by RTT, average fastest half
for (let i = 0; i < DEFAULT_SAMPLES; i++) {
  results.push(await calculateClockOffsetDetailed(firestore));
  if (i < samples - 1) await delay(SAMPLE_DELAY_MS);
}
const fastSamples = sortedByRTT.slice(0, Math.ceil(results.length / 2));
return average(fastSamples.map(r => r.offset));
```

#### Fix #4: Consistent Time Source
```typescript
// Use Date.now() consistently (removed performance.now() mixing)
const clientSendTime = Date.now();
const clientReceiveTime = Date.now();
const roundTripTime = clientReceiveTime - clientSendTime;
```

#### Fix #5: Tighter Thresholds & Async Cleanup
```typescript
// Constants
const DRIFT_THRESHOLD_SECONDS = 0.2;  // 200ms (tighter)
const DRIFT_CHECK_INTERVAL_MS = 2000; // Check every 2s (faster)

// Cleanup to prevent stale updates
useEffect(() => {
  let cancelled = false;
  // ... async operations ...
  if (cancelled) return; // Don't update state if cancelled
  return () => { cancelled = true; };
}, [...]);
```

### Expected Impact
Timer differences reduced from 3 seconds to <0.5 seconds.

**Files Modified:**
- `src/hooks/use-question-timer.ts` - All 5 fixes + constants
- `src/lib/utils/clock-sync.ts` - Multi-sample, consistent time source, constants
- `src/app/play/[gameId]/hooks/use-question-timer.ts` - Pass isPreparing flag

---

## Race Conditions & Performance

### Critical Fixes (2025-11-19)

#### 1. Host Auto-Transition Race Condition
```typescript
// BEFORE: Stale closure, circular dependency
const startQuestion = useCallback(() => {
  if (game?.state === 'preparing') { /* ... */ }
}, [game?.state, updateGame]);

// AFTER: Stable callback, caller checks state
const startQuestion = useCallback(() => {
  updateGame({ state: 'question', questionStartTime: serverTimestamp() });
}, [updateGame]);
```

#### 2. Answer Submission Deduplication
Added to ALL submit functions (single, multiple, slider, poll-single, poll-multiple, timeout):
```typescript
if (answerSubmittedRef.current) {
  console.log('[Answer] Submission already in progress, ignoring duplicate');
  return;
}
answerSubmittedRef.current = true;
```

#### 3. Async Cleanup (Pre-calculation & Visibility Re-sync)
```typescript
useEffect(() => {
  let cancelled = false;

  const asyncOperation = async () => {
    const result = await someAsyncCall();
    if (cancelled) return; // Don't update state
    setState(result);
  };

  asyncOperation();
  return () => { cancelled = true; };
}, [...]);
```

#### 4. Performance Optimizations
- **Memoized answered players calculation**: `useMemo` to avoid recalc on every render
- **Stabilized callbacks**: Removed unnecessary dependencies from `finishQuestion`
- **Extracted constants**: All magic numbers replaced with named constants

**Files Modified:**
- `src/app/host/game/[gameId]/hooks/use-game-controls.ts` - Stable callbacks
- `src/app/play/[gameId]/hooks/use-answer-submission.ts` - Deduplication guards
- `src/hooks/use-question-timer.ts` - Async cleanup, memoization, constants

---

## Quiz Sharing & Permissions

### Problem
Hosts couldn't create games with shared quizzes: "Missing or insufficient permissions"

### Root Cause
Share documents created with random IDs, but security rules expected email as ID:
```
❌ Actual: /quizzes/quiz123/shares/randomId1234
✅ Expected: /quizzes/quiz123/shares/user@example.com
```

### Solution
```typescript
// Use email as document ID (not addDoc with random ID)
const shareDocRef = doc(firestore, 'quizzes', quizId, 'shares', trimmedEmail);
await setDoc(shareDocRef, { sharedWith: trimmedEmail, ... });
```

**Benefits:** Efficient O(1) exists() check, prevents duplicates, one share per email enforced.

### Firestore Index Configuration
Use field overrides (not composite indexes) for single-field collectionGroup queries:
```json
{
  "fieldOverrides": [{
    "collectionGroup": "shares",
    "fieldPath": "sharedWith",
    "indexes": [
      { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" }
    ]
  }]
}
```

### Copy Shared Quiz - Image Independence

**Critical Issue:** Images not duplicated → deleting original quiz breaks copied quiz.

**Solution:**
```typescript
// 1. Create quiz doc first to get ID
const newQuizDoc = await addDoc(quizzesRef, newQuiz);

// 2. Copy images in parallel
const imagePromises = quiz.questions.map(async (q, i) => {
  if (!q.imageUrl) return null;
  const blob = await (await fetch(q.imageUrl)).blob();
  const newRef = ref(storage, `quizzes/${newQuizDoc.id}/questions/${i}/image`);
  await uploadBytes(newRef, blob);
  return getDownloadURL(newRef);
});
const newImageUrls = await Promise.all(imagePromises);

// 3. Update quiz with new URLs
await updateDoc(newQuizDoc, { questions: updatedQuestions });
```

**Storage Rules:**
```javascript
match /quizzes/{quizId}/questions/{questionIndex}/{imageName} {
  allow read;
  allow write: if request.auth.uid ==
    firestore.get(/databases/(default)/documents/quizzes/$(quizId)).data.hostId;
}
```

**Files Modified:**
- `src/components/app/quiz-share-manager.tsx` - setDoc with email ID
- `src/components/app/shared-quizzes.tsx` - Image copying
- `firestore.rules` - Validate shareId matches email
- `firestore.indexes.json` - Field override
- `storage.rules` - Quiz-specific paths

---

## React & UI Issues

### 1. React DOM Props Validation
**Problem:** `isCorrect` prop spread to DOM element.

**Solution:** Destructure custom props before spreading:
```typescript
const CustomBar = (props: any) => {
  const { fill, x, y, width, height, isCorrect, name, ...restProps } = props;
  return <rect {...restProps} fill={...} />;
};
```

### 2. Nested Forms
**Problem:** `<form>` inside `<form>` (invalid HTML).

**Solution:** Replace inner form with div + manual Enter handling:
```typescript
<div className="flex gap-2">
  <Input onKeyDown={(e) => { if (e.key === 'Enter') handleShare(); }} />
  <Button type="button" onClick={handleShare}>Share</Button>
</div>
```

**Files Modified:**
- `src/app/host/game/[gameId]/page.tsx` - CustomBar
- `src/components/app/quiz-share-manager.tsx` - Nested forms

---

## Security

### CORS for Cloud Functions

**Critical Issue:** No CORS restrictions → any website could call functions.

**Solution:**
```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://gquiz-{hash}.a.run.app'  // Update after deployment
];

export const submitAnswer = onCall({ cors: ALLOWED_ORIGINS }, async (request) => {
  const origin = request.rawRequest?.headers?.origin;
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    throw new HttpsError('permission-denied', 'Unauthorized origin');
  }
  // ...
});
```

**Post-Deployment Steps:**
1. Get Cloud Run URL: `gcloud run services describe gquiz --format='value(status.url)'`
2. Update `ALLOWED_ORIGINS` in `functions/src/index.ts`
3. Redeploy functions: `firebase deploy --only functions`

**Recommended:** Add Firebase App Check for additional security.

**Files Modified:**
- `functions/src/index.ts` - CORS validation

---

## Best Practices Learned

### State Management
- Use `useRef` for tracking non-UI state (prevents re-renders)
- Be meticulous with effect dependencies
- Question index changes = atomic, more reliable than transient states
- Always reset ALL state when entering preparing state

### React Hooks
- Never spread all props to DOM elements
- Add cleanup to async effects with cancellation tokens
- Memoize expensive calculations
- Minimize callback dependencies for stability

### Firestore
- Use meaningful document IDs (email for shares)
- Never set fields to `undefined` (use destructuring to exclude)
- Field overrides for single-field collectionGroup queries
- Test security rules thoroughly

### Performance
- Memoize filtered/calculated values
- Parallel operations when possible (Promise.all for images)
- Extract constants for maintainability
- Minimize effect re-runs with stable dependencies

### Testing Strategy
- Test race conditions and async timing
- Test state transitions comprehensively
- Test with real network latency
- Test edge cases (timeouts, rapid clicks, tab backgrounding)

---

## Related Files

### Core State Management
- `src/app/play/[gameId]/page.tsx` - Player game page
- `src/app/play/[gameId]/hooks/use-player-state-machine.ts` - Player state sync
- `src/app/play/[gameId]/hooks/use-answer-submission.ts` - Answer handling
- `src/app/host/game/[gameId]/page.tsx` - Host game page
- `src/app/host/game/[gameId]/hooks/use-game-controls.ts` - Host controls

### Timer & Clock Sync
- `src/hooks/use-question-timer.ts` - Shared timer hook
- `src/app/play/[gameId]/hooks/use-question-timer.ts` - Player wrapper
- `src/app/host/game/[gameId]/hooks/use-question-timer.ts` - Host wrapper
- `src/lib/utils/clock-sync.ts` - Clock synchronization utility

### Quiz Sharing
- `src/components/app/quiz-share-manager.tsx` - Share creation
- `src/components/app/shared-quizzes.tsx` - Shared quizzes display
- `src/firebase/firestore/use-shared-quizzes.ts` - CollectionGroup query

### Configuration
- `firestore.rules` - Security rules
- `firestore.indexes.json` - Index configuration
- `storage.rules` - Storage security rules
- `functions/src/index.ts` - Cloud Functions

---

## Constants Reference

### Timer Synchronization (`src/hooks/use-question-timer.ts`)
```typescript
const DRIFT_THRESHOLD_SECONDS = 0.2;      // 200ms drift threshold
const DRIFT_CHECK_INTERVAL_MS = 2000;     // Check every 2s
const AUTO_FINISH_DELAY_MS = 1500;        // 1.5s delay for in-flight answers
```

### Clock Sync (`src/lib/utils/clock-sync.ts`)
```typescript
const DEFAULT_SAMPLES = 3;                // Number of offset samples
const SAMPLE_DELAY_MS = 100;              // Delay between samples
const MAX_OFFSET_SECONDS = 300;           // Max acceptable offset (5 min)
```

---

**End of Document**

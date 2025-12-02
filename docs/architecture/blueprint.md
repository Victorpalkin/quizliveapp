# gQuiz - Architecture Blueprint

**Last Updated:** 2025-12-02

Comprehensive architecture documentation covering system design, state management, security, and synchronization.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Tech Stack & Infrastructure](#tech-stack--infrastructure)
3. [State Management Architecture](#state-management-architecture)
4. [Timer Synchronization System](#timer-synchronization-system)
5. [Security Architecture](#security-architecture)
6. [Data Models](#data-models)
7. [Real-Time Synchronization](#real-time-synchronization)
8. [Question Crowdsourcing](#question-crowdsourcing)
9. [Performance & Reliability](#performance--reliability)

---

## System Overview

### Product Description
gQuiz is a real-time multiplayer quiz application inspired by Kahoot. Hosts create quizzes and launch live games with unique PINs. Players join via their devices and compete in synchronized real-time gameplay with immediate scoring feedback and live leaderboards.

### Core Features
- **Quiz Creation**: Multiple question types (single/multiple choice, slider, polls), time limits, images
- **Live Game Hosting**: Real-time game control, question progression, player management
- **Player Participation**: PIN-based joining, synchronized gameplay, instant feedback
- **Real-time Leaderboard**: Live rankings based on accuracy and speed
- **Quiz Sharing**: Share quizzes via email, copy shared quizzes with independent assets
- **Synchronized Timers**: NTP-like clock synchronization for fair gameplay across devices
- **Question Crowdsourcing**: Players submit questions during lobby, AI evaluates and selects best ones

### User Flows

#### Host Flow
```
Create Account → Login → Create/Edit Quiz → Host Game →
Generate PIN → Lobby (wait for players) → Start Game →
For each question: Show Question → Monitor Answers → Show Leaderboard →
End Game → View Final Results
```

#### Player Flow
```
Enter PIN → Join Lobby → Wait for Start →
For each question: View Question → Submit Answer → View Result →
View Leaderboard → Final Scores
```

---

## Tech Stack & Infrastructure

### Frontend
- **Framework**: Next.js 15.3.3 (App Router, React Server Components)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + ShadCN UI components
- **State Management**: React hooks (useState, useEffect, useCallback, useMemo, useRef)
- **Build Tool**: Turbopack (development), Webpack (production)

### Backend & Services
- **Hosting**: Google Cloud Run (containerized Next.js app)
- **Functions**: Firebase Cloud Functions (Node.js, europe-west4)
- **Database**: Firebase Firestore (real-time NoSQL)
- **Storage**: Firebase Cloud Storage (quiz images)
- **Authentication**: Firebase Auth (email/password, hosts only)

### Deployment Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Client Devices                       │
│              (Hosts & Players - Web Browsers)           │
└────────────────────┬────────────────────────────────────┘
                     │
            ┌────────┴────────┐
            │                 │
    ┌───────▼────────┐  ┌────▼──────────┐
    │  Cloud Run     │  │   Firebase    │
    │  (Next.js)     │  │  Cloud Funcs  │
    │  Port 3000     │  │  (submitAnswer)│
    └───────┬────────┘  └────┬──────────┘
            │                │
            └────────┬───────┘
                     │
         ┌───────────▼──────────────┐
         │   Firebase Services      │
         ├──────────────────────────┤
         │ Firestore (Real-time DB) │
         │ Cloud Storage (Images)   │
         │ Authentication (Hosts)   │
         └──────────────────────────┘
```

### Key Technical Decisions

1. **Hybrid Deployment**: Next.js on Cloud Run + Firebase Functions for server-side logic
   - Rationale: Scalability, cost optimization, separation of concerns

2. **Firestore for Real-Time**: NoSQL database with live listeners
   - Rationale: Built-in real-time sync, no WebSocket management needed

3. **Server-Side Scoring**: Cloud Functions calculate all scores
   - Rationale: Prevent cheating, centralized validation

4. **Client-Side Timer with Sync**: Hybrid approach (server timestamp + local countdown)
   - Rationale: Smooth UX + fair gameplay across device clock skew

---

## State Management Architecture

### Player State Machine

```
┌──────────┐
│ joining  │  Initial state when page loads
└────┬─────┘
     │ Host starts game
     ▼
┌──────────┐
│  lobby   │  Waiting for game to start
└────┬─────┘
     │ Host clicks "Start Game"
     ▼
┌──────────┐
│preparing │  Get ready - ALL STATE RESET HERE ⚠️
└────┬─────┘
     │ Auto-transition (host)
     ▼
┌──────────┐
│ question │  Active question, timer running
└────┬─────┘
     │ Player answers OR timeout
     ▼
┌──────────┐
│ waiting  │  Waiting for host to show leaderboard
└────┬─────┘
     │ Host shows leaderboard
     ▼
┌──────────┐
│  result  │  Viewing correct/incorrect feedback
└────┬─────┘
     │ Host clicks next → back to preparing
     │            OR
     │ Host ends game
     ▼
┌──────────┐
│  ended   │  Final scores
└──────────┘

Additional States:
- cancelled: Host cancelled game
- reconnecting: Player reconnecting after disconnect
- session-invalid: Session expired
```

### Host-Player Synchronization

| Host State    | Player Transition Rule                                    |
|---------------|----------------------------------------------------------|
| lobby         | `joining` → `lobby`                                       |
| preparing     | Any (except joining/cancelled) → `preparing`              |
| question      | `preparing` → `question`                                  |
| leaderboard   | `waiting` OR `question` → `result`                       |
| ended         | Any → `ended`                                             |

### Critical State Management Patterns

#### 1. Question Index as Primary Signal
```typescript
// Use ref to track question changes (prevents re-render loops)
const lastQuestionIndexRef = useRef<number>(-1);

useEffect(() => {
  const questionChanged =
    currentQuestionIndex !== lastQuestionIndexRef.current &&
    lastQuestionIndexRef.current !== -1;

  if (questionChanged) {
    lastQuestionIndexRef.current = currentQuestionIndex;
    setState('preparing'); // Force reset
    return;
  }

  // Normal state sync logic...
}, [game?.state, game?.currentQuestionIndex, gameLoading, state]);
```

**Why:** Host auto-transitions preparing → question in milliseconds. Players often never see preparing state in Firestore. Question index change is atomic and reliable.

#### 2. State Reset in Preparing
```typescript
useEffect(() => {
  if (state === 'preparing') {
    // ⚠️ CRITICAL: Reset ALL state before next question
    setTime(timeLimit);           // Prevent false timeouts
    setAnswerSelected(null);       // Clear previous answer
    setTimedOut(false);            // Reset timeout flag
    setLastAnswer(null);           // Clear result display
    answerSubmittedRef.current = false; // Allow new submission
  }
}, [state, game?.currentQuestionIndex]);
```

**Why:** Failing to reset time causes false timeouts on new questions. Failing to reset answer state causes duplicate submissions.

#### 3. Deduplication Guards
```typescript
const answerSubmittedRef = useRef(false);

const submitAnswer = useCallback(async (answerIndex: number) => {
  // Prevent duplicate submissions from rapid clicks or race conditions
  if (answerSubmittedRef.current) {
    console.log('[Answer] Submission already in progress, ignoring duplicate');
    return;
  }
  answerSubmittedRef.current = true;

  // Optimistic UI update
  setLastAnswer({ selected: answerIndex, ... });

  // Server submission
  await submitAnswerFn({ ... });
}, [gameDocId, playerId, currentQuestionIndex]);
```

**Files:**
- `src/app/play/[gameId]/hooks/use-player-state-machine.ts` - State machine logic
- `src/app/play/[gameId]/hooks/use-answer-submission.ts` - Answer submission with deduplication
- `src/app/play/[gameId]/page.tsx` - Player UI and state resets

---

## Timer Synchronization System

### The Clock Skew Problem

**Issue:** Device clocks can be ahead or behind server time by seconds or minutes due to:
- Manual time adjustments
- NTP sync delays
- Timezone configuration errors
- Clock drift over time

**Impact:** Players with clocks ahead get less time (unfair disadvantage).

**Example:**
```
Server time:        12:00:00 (questionStartTime set)
Player A clock:     12:00:00 (synchronized) → 20 seconds ✅
Player B clock:     12:00:03 (3s ahead) → 17 seconds ❌
```

### Solution: 5-Phase Hybrid Clock Synchronization

Inspired by NTP protocol and Kahoot's architecture.

#### Phase 1: Offset Pre-Calculation (Preparing State)
```typescript
// Calculate offset BEFORE question starts (eliminates race condition)
useEffect(() => {
  if (isPreparing && useClockSync && !offsetReadyRef.current) {
    const offset = await calculateClockOffset(firestore);
    clockOffsetRef.current = offset;
    offsetReadyRef.current = true;
  }
}, [isPreparing, useClockSync, firestore]);
```

#### Phase 2: Multi-Sample Offset Calculation
```typescript
// Take 3 samples, filter by RTT, average fastest samples
export async function calculateClockOffset(firestore: Firestore): Promise<number> {
  const results = [];

  for (let i = 0; i < 3; i++) {
    const t1 = Date.now();                    // Client send
    await setDoc(syncRef, { timestamp: serverTimestamp() });
    const syncDoc = await getDoc(syncRef);
    const t4 = Date.now();                    // Client receive

    const t3 = syncDoc.data().timestamp.toMillis(); // Server time
    const rtt = t4 - t1;                      // Round-trip time
    const estimatedServerTime = t3 + (rtt / 2);
    const offset = estimatedServerTime - t4;

    results.push({ offset, rtt });
    await delay(100); // Avoid overwhelming Firestore
  }

  // Sort by RTT (fastest = most reliable), average fastest half
  const sortedByRTT = results.sort((a, b) => a.rtt - b.rtt);
  const fastSamples = sortedByRTT.slice(0, Math.ceil(results.length / 2));
  return average(fastSamples.map(r => r.offset));
}
```

#### Phase 3: Initial Time Calculation
```typescript
// Use pre-calculated offset to set initial time
const initialTime = calculateTimeRemaining(
  questionStartTime.toMillis(),
  timeLimit,
  clockOffsetRef.current
);
setTime(initialTime);
```

#### Phase 4: Local Countdown (Smooth UX)
```typescript
// Count down locally for smooth 1-second ticks
const interval = setInterval(() => {
  setTime(prev => {
    if (prev <= 1) {
      clearInterval(interval);
      onAutoFinish(); // Host only
      return 0;
    }
    return prev - 1;
  });
}, 1000);
```

#### Phase 5: Drift Auto-Correction
```typescript
// Check for drift every 2 seconds, auto-correct if >200ms
const timeRef = useRef(time); // Avoid stale closure
useEffect(() => { timeRef.current = time; }, [time]);

const driftCheckInterval = setInterval(() => {
  const drift = detectDrift(
    timeRef.current,
    questionStartTime.toMillis(),
    timeLimit,
    clockOffsetRef.current,
    0.2 // 200ms threshold
  );

  if (drift.hasDrift) {
    console.warn(`[Timer] Auto-correcting: ${timeRef.current}s → ${drift.correctTime}s`);
    setTime(drift.correctTime);
  }
}, 2000);
```

### Phase 6: Tab Visibility Re-sync
```typescript
// Re-sync when tab becomes visible (handles device sleep)
useEffect(() => {
  let cancelled = false;

  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible') {
      const offset = await calculateClockOffset(firestore);
      if (cancelled) return; // Don't update if unmounted

      clockOffsetRef.current = offset;
      const correctTime = calculateTimeRemaining(questionStartTime, timeLimit, offset);
      setTime(correctTime);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    cancelled = true;
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [useClockSync, isActive, questionStartTime]);
```

### Performance Impact
- **Firestore reads**: 6 per question (3 samples × 2 operations)
- **When**: During preparing state (before timer starts)
- **Duration**: ~600ms total (3 samples with 100ms delays)
- **Ongoing overhead**: None (local countdown after sync)

### Expected Accuracy
- **Before fixes**: 3-second discrepancies common
- **After fixes**: <0.5 seconds typical, <0.2 seconds with good network

**Files:**
- `src/hooks/use-question-timer.ts` - Shared timer hook (all phases)
- `src/lib/utils/clock-sync.ts` - NTP-like clock sync algorithm
- `src/app/play/[gameId]/hooks/use-question-timer.ts` - Player wrapper
- `src/app/host/game/[gameId]/hooks/use-question-timer.ts` - Host wrapper

---

## Security Architecture

### Defense in Depth Strategy

```
┌──────────────────────────────────────────────────────┐
│             Client (Untrusted)                       │
│  • Input validation (UX only, not security)          │
│  • Optimistic UI updates                             │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼ HTTPS + CORS
┌──────────────────────────────────────────────────────┐
│          Cloud Functions (Trusted)                   │
│  • Origin validation (CORS whitelist)                │
│  • Answer validation & scoring                       │
│  • Firestore transactions (prevent duplicates)       │
│  • Time validation (prevent timing attacks)          │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼ Admin SDK (bypasses rules)
┌──────────────────────────────────────────────────────┐
│          Firestore Security Rules                    │
│  • Player score updates: DENY direct writes          │
│  • Quiz ownership validation                         │
│  • Share permission checks (email-based)             │
│  • Field-level validation                            │
└──────────────────────────────────────────────────────┘
```

### 1. Server-Side Score Calculation (Critical)

**Threat:** Client-side scoring allows players to manipulate scores.

**Solution:** All scoring logic in Cloud Functions.

```typescript
// functions/src/index.ts
export const submitAnswer = onCall(
  { region: 'europe-west4', cors: ALLOWED_ORIGINS },
  async (request) => {
    const { gameId, playerId, questionIndex, answerIndex, timeRemaining } = request.data;

    // 1. Validate authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    // 2. Validate origin (CORS)
    const origin = request.rawRequest?.headers?.origin;
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      throw new HttpsError('permission-denied', 'Unauthorized origin');
    }

    // 3. Load game and validate state
    const gameDoc = await admin.firestore().doc(`games/${gameId}`).get();
    const game = gameDoc.data();

    if (game.state !== 'question') {
      throw new HttpsError('failed-precondition', 'Game not in question state');
    }

    if (game.currentQuestionIndex !== questionIndex) {
      throw new HttpsError('failed-precondition', 'Wrong question index');
    }

    // 4. Validate time remaining
    const timeLimit = quiz.questions[questionIndex].timeLimit;
    if (timeRemaining < 0 || timeRemaining > timeLimit) {
      throw new HttpsError('invalid-argument', 'Invalid time remaining');
    }

    // 5. Calculate score (server-side only!)
    const isCorrect = answerIndex === quiz.questions[questionIndex].correctAnswerIndex;
    const points = calculateTimeBasedScore(isCorrect, timeRemaining, timeLimit);

    // 6. Transaction: Prevent duplicate submissions
    await admin.firestore().runTransaction(async (transaction) => {
      const playerRef = admin.firestore().doc(`games/${gameId}/players/${playerId}`);
      const playerDoc = await transaction.get(playerRef);
      const player = playerDoc.data();

      // Check if already answered this question
      if (player.answers?.some(a => a.questionIndex === questionIndex)) {
        throw new HttpsError('already-exists', 'Already answered this question');
      }

      // Update player with new answer and score
      transaction.update(playerRef, {
        score: player.score + points,
        answers: [...(player.answers || []), {
          questionIndex,
          answerIndex,
          points,
          isCorrect,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        }]
      });
    });

    return { points, newScore: player.score + points };
  }
);
```

### 2. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Quizzes: Only owner can read/write
    match /quizzes/{quizId} {
      function isOwner() {
        return request.auth != null &&
               request.auth.uid == resource.data.hostId;
      }

      function hasQuizAccess(quizId) {
        return request.auth != null &&
               exists(/databases/$(database)/documents/quizzes/$(quizId)/shares/$(request.auth.token.email));
      }

      allow read: if isOwner() || hasQuizAccess(quizId);
      allow write: if isOwner();

      // Quiz shares: Email as document ID for efficient exists() check
      match /shares/{shareId} {
        allow read: if request.auth != null &&
                      request.auth.token.email == shareId;
        allow create: if request.auth != null &&
                        request.auth.uid == get(/databases/$(database)/documents/quizzes/$(quizId)).data.hostId &&
                        shareId == request.resource.data.sharedWith;
        allow delete: if request.auth != null &&
                        (request.auth.token.email == shareId ||
                         request.auth.uid == get(/databases/$(database)/documents/quizzes/$(quizId)).data.hostId);
      }
    }

    // Games: Host can write, anyone can read
    match /games/{gameId} {
      allow read: if true;
      allow write: if request.auth != null &&
                     request.auth.uid == resource.data.hostId;

      // Players: Can only update their own name (NOT score!)
      match /players/{playerId} {
        allow read: if true;
        allow create: if request.resource.data.score == 0 &&
                        request.resource.data.id == playerId &&
                        request.resource.data.name is string &&
                        request.resource.data.name.size() >= 2 &&
                        request.resource.data.name.size() <= 20;

        // ⚠️ CRITICAL: Players cannot update score directly
        // Scores updated via Cloud Functions (admin SDK bypasses rules)
        allow update: if request.resource.data.diff(resource.data).affectedKeys()
                        .hasOnly(['name', 'answers']) &&
                        request.resource.data.score == resource.data.score;
      }
    }
  }
}
```

### 3. CORS Protection

```typescript
// functions/src/index.ts
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://localhost:3000',
  'https://gquiz-{hash}.a.run.app', // Update after deployment!
];

export const submitAnswer = onCall(
  { region: 'europe-west4', cors: ALLOWED_ORIGINS },
  async (request) => {
    // Runtime validation (defense in depth)
    const origin = request.rawRequest?.headers?.origin;
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      console.warn(`[SECURITY] Blocked: ${origin}`);
      throw new HttpsError('permission-denied', 'Unauthorized origin');
    }
    // ...
  }
);
```

**Post-Deployment Checklist:**
1. Deploy to Cloud Run
2. Get URL: `gcloud run services describe gquiz --format='value(status.url)'`
3. Update `ALLOWED_ORIGINS` in `functions/src/index.ts`
4. Redeploy functions: `firebase deploy --only functions`

### 4. Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Quiz images: Quiz-specific paths with owner validation
    match /quizzes/{quizId}/questions/{questionIndex}/{imageName} {
      // Anyone can read quiz images
      allow read;

      // Only quiz owner can upload/delete images
      allow write: if request.auth != null &&
                     request.auth.uid == firestore.get(/databases/(default)/documents/quizzes/$(quizId)).data.hostId;
    }
  }
}
```

**Benefits:**
- Public read for quiz images (needed for players)
- Write restricted to quiz owner (prevents tampering)
- Quiz-specific paths (isolated storage namespaces)
- Owner verified via Firestore lookup

### 5. Input Validation

**Client-Side (UX only):**
```typescript
// Nickname validation
const MAX_NICKNAME_LENGTH = 20;
const MIN_NICKNAME_LENGTH = 2;

// Image validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const VALID_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];

if (file.size > MAX_FILE_SIZE) {
  toast({ title: 'File too large', description: 'Max 5MB' });
  return;
}
```

**Server-Side (Firestore rules - enforced):**
```javascript
allow create: if request.resource.data.name.size() >= 2 &&
                request.resource.data.name.size() <= 20;
```

### Threat Model & Mitigations

| Threat                     | Mitigation                                    |
|----------------------------|----------------------------------------------|
| Score manipulation         | Server-side calculation + Firestore rules    |
| Duplicate submissions      | Firestore transactions + deduplication guards|
| Timing attacks             | Server validates timeRemaining ≤ timeLimit   |
| CSRF                       | CORS whitelist + origin validation           |
| Unauthorized quiz access   | Firestore rules + share email validation     |
| Image storage abuse        | File size limits + ownership validation      |
| API abuse                  | CORS + (optional) Firebase App Check         |

---

## Data Models

### Quiz
```typescript
interface Quiz {
  id: string;
  title: string;
  description?: string;
  hostId: string;               // Firebase Auth UID
  questions: Question[];
  crowdsource?: CrowdsourceSettings;  // Optional crowdsource configuration
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface CrowdsourceSettings {
  enabled: boolean;
  topicPrompt: string;           // e.g., "European geography"
  questionsNeeded: number;       // How many to select
  maxSubmissionsPerPlayer: number; // Default: 3
  integrationMode: 'append' | 'replace' | 'prepend';
}
```

### Question Types
```typescript
type Question =
  | SingleChoiceQuestion
  | MultipleChoiceQuestion
  | SliderQuestion
  | SlideQuestion
  | PollSingleQuestion
  | PollMultipleQuestion;

interface SingleChoiceQuestion {
  type: 'single-choice';
  text: string;
  answers: { text: string }[];
  correctAnswerIndex: number;
  timeLimit: 10 | 20 | 30 | 60;
  imageUrl?: string;
}

interface MultipleChoiceQuestion {
  type: 'multiple-choice';
  text: string;
  answers: { text: string }[];
  correctAnswerIndices: number[];
  timeLimit: 10 | 20 | 30 | 60;
  imageUrl?: string;
}

interface SliderQuestion {
  type: 'slider';
  text: string;
  minValue: number;
  maxValue: number;
  correctValue: number;
  acceptableError?: number;     // e.g., ±5 from correctValue
  timeLimit: 10 | 20 | 30 | 60;
  imageUrl?: string;
}

interface SlideQuestion {
  type: 'slide';
  text: string;
  imageUrl?: string;
  // No answers, no correct answer, display only
}

interface PollSingleQuestion {
  type: 'poll-single';
  text: string;
  answers: { text: string }[];
  timeLimit: 10 | 20 | 30 | 60;
  imageUrl?: string;
  // No correct answer - for gathering opinions
}

interface PollMultipleQuestion {
  type: 'poll-multiple';
  text: string;
  answers: { text: string }[];
  timeLimit: 10 | 20 | 30 | 60;
  imageUrl?: string;
  // No correct answers - for gathering opinions
}
```

### Game
```typescript
interface Game {
  id: string;
  pin: string;                  // 8-character game PIN
  quizId: string;
  hostId: string;
  state: 'lobby' | 'preparing' | 'question' | 'leaderboard' | 'ended';
  currentQuestionIndex: number;
  questionStartTime?: Timestamp; // Server timestamp when question shown
  crowdsourceState?: CrowdsourceState;  // Runtime state for crowdsourced questions
  questions?: Question[];        // Override questions (used when crowdsourced questions are integrated)
  createdAt: Timestamp;
}

interface CrowdsourceState {
  submissionsLocked: boolean;    // True when AI evaluation starts
  evaluationComplete: boolean;   // Has AI evaluated yet
  selectedCount: number;         // How many questions selected
}
```

### Player
```typescript
interface Player {
  id: string;                   // Auto-generated player ID
  gameId: string;
  name: string;                 // Nickname (2-20 chars)
  score: number;
  answers: PlayerAnswer[];      // All answers for entire game
  joinedAt: Timestamp;
}

interface PlayerAnswer {
  questionIndex: number;
  questionType: 'single-choice' | 'multiple-choice' | 'slider' | 'poll-single' | 'poll-multiple';
  timestamp: Timestamp;
  answerIndex?: number;         // For single-choice, poll-single
  answerIndices?: number[];     // For multiple-choice, poll-multiple
  sliderValue?: number;         // For slider
  points: number;               // Score earned (0 for polls)
  isCorrect: boolean;           // false for polls
  wasTimeout: boolean;
}
```

### Quiz Share
```typescript
interface QuizShare {
  quizId: string;
  sharedWith: string;           // Email address (also document ID!)
  sharedBy: string;             // Firebase Auth UID
  sharedAt: Timestamp;
}
```

**Storage Structure:**
```
/quizzes/{quizId}/shares/{email}
```

**Why email as ID:**
- Efficient exists() check in security rules
- One share per email enforced at DB level
- No duplicate shares possible

---

## Real-Time Synchronization

### Firestore Listeners

#### Player Listening to Game State
```typescript
const gameRef = doc(firestore, 'games', gameId);
const unsubscribe = onSnapshot(gameRef, (snapshot) => {
  const game = snapshot.data() as Game;

  // State machine triggers on game state changes
  // See "State Management Architecture" section
});
```

#### Host Listening to Players
```typescript
const playersRef = collection(firestore, 'games', gameId, 'players');
const unsubscribe = onSnapshot(playersRef, (snapshot) => {
  const players = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Player[];

  // Update leaderboard in real-time
  // Auto-finish when all players answered (with 1.5s delay)
});
```

### Update Patterns

#### Optimistic UI Updates
```typescript
// 1. Update local state immediately (optimistic)
setLastAnswer({ selected: answerIndex, points: estimatedPoints });
setPlayer(p => ({ ...p, score: p.score + estimatedPoints }));

// 2. Submit to server in background
const result = await submitAnswerFn({ ... });

// 3. Reconcile with server response if different
if (result.data.points !== estimatedPoints) {
  setLastAnswer(prev => ({ ...prev, points: result.data.points }));
  setPlayer(p => ({ ...p, score: result.data.newScore }));
}
```

**Benefits:**
- Instant feedback (no waiting for server)
- Graceful degradation (works even if server slow)
- Reconciliation ensures correctness

#### Server Timestamp for Critical Events
```typescript
// Always use serverTimestamp() for questionStartTime
updateDoc(gameRef, {
  state: 'question',
  questionStartTime: serverTimestamp() as unknown as Timestamp
});
```

**Why:** Ensures all clients use same reference time regardless of clock skew.

### Firestore Index Configuration

```json
{
  "indexes": [],
  "fieldOverrides": [{
    "collectionGroup": "shares",
    "fieldPath": "sharedWith",
    "indexes": [
      { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" },
      { "order": "DESCENDING", "queryScope": "COLLECTION_GROUP" }
    ]
  }]
}
```

**Why field overrides:** Single-field collectionGroup queries don't need composite indexes, just field scope extension.

---

## Question Crowdsourcing

### Feature Overview

Crowdsourcing enables player-contributed quiz questions. During the lobby phase, players submit questions which are evaluated by AI (Gemini) and selectively included in the game. This creates engaging, participant-driven content.

### Flow Diagram

```
Host enables crowdsourcing in quiz → Game created with crowdsource settings
                                              ↓
        ┌─────────────── LOBBY PHASE ──────────────┐
        │                                          │
        │  Players submit questions (max N each)   │
        │  Stored in games/{gameId}/submissions    │
        │                                          │
        └────────────────────┬─────────────────────┘
                             │
                Host clicks "Evaluate with AI"
                             │
                             ▼
        ┌─────────────── EVALUATION ───────────────┐
        │                                          │
        │  1. Lock submissions (no new ones)       │
        │  2. 2-second grace period                │
        │  3. Call evaluateSubmissions function    │
        │  4. AI scores each submission 0-100      │
        │  5. Select top N questions               │
        │                                          │
        └────────────────────┬─────────────────────┘
                             │
                Host reviews & saves selection
                             │
                             ▼
                Game starts with crowd questions
```

### Data Models

```typescript
// Quiz-level configuration (set during quiz creation/edit)
interface CrowdsourceSettings {
  enabled: boolean;
  topicPrompt: string;           // e.g., "European geography"
  questionsNeeded: number;       // How many to select (default: 10)
  maxSubmissionsPerPlayer: number; // Default: 3
  integrationMode: 'append' | 'replace' | 'prepend';  // How to combine with existing questions
}

// Runtime state during game (stored on Game document)
interface CrowdsourceState {
  submissionsLocked: boolean;    // True when AI evaluation starts
  evaluationComplete: boolean;   // Has AI evaluated yet
  selectedCount: number;         // How many questions were selected
}

// Individual player submission (stored in subcollection)
interface QuestionSubmission {
  id: string;
  playerId: string;
  playerName: string;
  submittedAt: Timestamp;
  expireAt: Timestamp;           // TTL: 24 hours for auto-cleanup

  // Question content (single-choice only for MVP)
  questionText: string;
  answers: string[];             // 4 answer options
  correctAnswerIndex: number;    // Stored but NOT shown to host during review

  // AI evaluation results (populated after evaluation)
  aiScore?: number;              // 0-100 quality score
  aiReasoning?: string;          // Why this score
  aiSelected?: boolean;          // Selected for inclusion in quiz
}
```

### AI Evaluation Criteria

The Gemini model scores submissions based on:

| Criterion | Points | Description |
|-----------|--------|-------------|
| Topic relevance | 0-25 | How well the question matches the specified topic |
| Clarity | 0-20 | Is the question clear and unambiguous? |
| Difficulty balance | 0-15 | Challenging but fair (not too easy, not impossible) |
| Answer correctness | 0-25 | Is the marked correct answer factually accurate? (Heavy penalty if wrong!) |
| Distractor quality | 0-15 | Are wrong answers plausible but clearly incorrect? |

**Critical**: The AI verifies that the player-marked correct answer is factually accurate. Questions with incorrect answers receive scores of 0-20 maximum.

### Firestore Structure

```
games/{gameId}/
├── ... (standard game fields)
├── crowdsourceState: {
│   submissionsLocked: boolean,
│   evaluationComplete: boolean,
│   selectedCount: number
│ }
└── submissions/                    # Subcollection
    └── {submissionId}/
        ├── playerId, playerName
        ├── submittedAt, expireAt
        ├── questionText
        ├── answers: string[]
        ├── correctAnswerIndex
        └── aiScore?, aiReasoning?, aiSelected?
```

### Cleanup Strategy

Submissions are automatically cleaned up:
1. **On game end**: `onGameUpdated` trigger deletes all submissions when state → 'ended'
2. **On game delete**: `onGameDeleted` trigger cleans up players, submissions, and aggregates
3. **Scheduled cleanup**: `cleanupOldGames` runs daily at 3:00 AM UTC, deleting games older than 30 days

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/types.ts` | CrowdsourceSettings, CrowdsourceState, QuestionSubmission types |
| `src/components/app/quiz-form.tsx` | Crowdsource settings in quiz editor |
| `src/app/play/[gameId]/components/question-submission-form.tsx` | Player submission form |
| `src/app/play/[gameId]/components/screens/lobby-screen.tsx` | Lobby with submission UI |
| `src/app/host/lobby/[gameId]/components/submissions-panel.tsx` | Host review panel |
| `functions-ai/src/functions/evaluateSubmissions.ts` | AI evaluation Cloud Function |
| `functions/src/functions/cleanupSubmissions.ts` | Firestore triggers for cleanup |
| `functions/src/functions/cleanupOldGames.ts` | Scheduled cleanup function |

---

## Performance & Reliability

### Critical Performance Patterns

#### 1. Memoization
```typescript
// Avoid recalculating on every render
const answeredPlayers = useMemo(() => {
  if (!players) return 0;
  return players.filter(p =>
    p.answers?.some(a => a.questionIndex === currentQuestionIndex)
  ).length;
}, [players, currentQuestionIndex]);
```

#### 2. Stable Callbacks
```typescript
// Minimize dependencies to prevent unnecessary re-renders
const finishQuestion = useCallback(() => {
  updateGame({ state: 'leaderboard' });
}, [updateGame]); // Don't include game?.state (caller checks it)
```

#### 3. Async Cleanup
```typescript
useEffect(() => {
  let cancelled = false;

  const asyncOperation = async () => {
    const result = await longRunningTask();
    if (cancelled) return; // Don't update state if unmounted
    setState(result);
  };

  asyncOperation();
  return () => { cancelled = true }; // Cleanup
}, [...]);
```

#### 4. Parallel Operations
```typescript
// Copy all quiz images in parallel
const imagePromises = questions.map(async (q, i) => {
  if (!q.imageUrl) return null;
  return copyImageToNewQuiz(q.imageUrl, newQuizId, i);
});

const newImageUrls = await Promise.all(imagePromises);
```

### Reliability Patterns

#### 1. Race Condition Prevention
- **Deduplication guards** on all submit functions
- **Transaction-based** answer submissions
- **Ref-based** question tracking (avoids re-render loops)
- **Async cleanup** prevents stale state updates

#### 2. Error Handling
```typescript
try {
  await submitAnswerFn(submitData);
} catch (error: any) {
  if (error.code === 'functions/deadline-exceeded') {
    toast({ title: 'Answer Too Late', description: '...' });
  } else if (error.code === 'functions/failed-precondition') {
    toast({ title: 'Answer Not Accepted', description: error.message });
  } else {
    toast({ title: 'Submission Error', description: '...' });
  }
}
```

#### 3. Graceful Degradation
- Optimistic UI continues working even if server slow
- Timer sync falls back to basic sync if offset calculation fails
- Image copy falls back to original URL if copy fails

### Performance Metrics

| Operation                  | Target           | Notes                          |
|---------------------------|------------------|--------------------------------|
| Question transition       | <500ms           | Host to all players            |
| Timer sync accuracy       | <500ms           | After all fixes                |
| Answer submission         | <1s              | Including optimistic UI        |
| Leaderboard update        | <200ms           | Firestore real-time listener   |
| Image upload              | <5s              | 5MB max, client-side compress  |

---

## File Structure Reference

```
src/
├── app/
│   ├── host/
│   │   ├── page.tsx                           # Host dashboard
│   │   ├── create/page.tsx                    # Create quiz
│   │   ├── edit/[quizId]/page.tsx            # Edit quiz
│   │   ├── lobby/[gameId]/
│   │   │   ├── page.tsx                       # Game lobby
│   │   │   └── components/
│   │   │       └── submissions-panel.tsx      # Crowdsource review panel
│   │   └── game/[gameId]/
│   │       ├── page.tsx                       # Live game host view
│   │       └── hooks/
│   │           ├── use-game-controls.ts       # Game state control
│   │           └── use-question-timer.ts      # Host timer wrapper
│   └── play/[gameId]/
│       ├── page.tsx                           # Player game view
│       ├── components/
│       │   ├── question-submission-form.tsx   # Player question submission
│       │   └── screens/
│       │       └── lobby-screen.tsx           # Lobby with crowdsource UI
│       └── hooks/
│           ├── use-player-state-machine.ts    # State synchronization
│           ├── use-answer-submission.ts       # Answer handling
│           └── use-question-timer.ts          # Player timer wrapper
│
├── components/
│   ├── app/
│   │   ├── quiz-share-manager.tsx            # Share quiz UI
│   │   ├── shared-quizzes.tsx                # Shared quizzes display
│   │   └── quiz-preview.tsx                  # Preview before hosting
│   └── ui/                                    # ShadCN components
│
├── hooks/
│   └── use-question-timer.ts                 # Shared timer (5-phase sync)
│
├── lib/
│   ├── types.ts                              # TypeScript definitions (incl. Crowdsource types)
│   ├── scoring.ts                            # Scoring algorithms
│   ├── constants.ts                          # App constants
│   └── utils/
│       ├── clock-sync.ts                     # NTP-like sync algorithm
│       ├── game-utils.ts                     # Game helper functions
│       └── error-utils.ts                    # Error handling
│
├── firebase/
│   ├── config.ts                             # Firebase initialization
│   ├── provider.tsx                          # Firebase context
│   ├── auth/                                 # Auth hooks
│   └── firestore/                            # Firestore hooks
│
functions/
└── src/
    ├── index.ts                              # Cloud Functions exports
    └── functions/
        ├── submitAnswer.ts                   # Answer validation & scoring
        ├── computeQuestionResults.ts         # Leaderboard aggregation
        ├── cleanupSubmissions.ts             # Firestore triggers for cleanup
        └── cleanupOldGames.ts                # Scheduled cleanup (daily)
│
functions-ai/
└── src/
    ├── index.ts                              # AI Functions exports
    └── functions/
        ├── generateQuizWithAI.ts             # Quiz generation
        ├── generateQuestionImage.ts          # Image generation
        └── evaluateSubmissions.ts            # Crowdsource evaluation

docs/
├── architecture/
│   └── blueprint.md                          # This file
├── development/
│   ├── FIXES_AND_SOLUTIONS.md               # Bug fixes reference
│   └── BACKLOG.md                            # Feature backlog
└── deployment/
    └── DEPLOYMENT.md                         # Deployment guide
```

---

## Constants Reference

### Timer Synchronization
```typescript
// src/hooks/use-question-timer.ts
const DRIFT_THRESHOLD_SECONDS = 0.2;      // 200ms drift auto-correction threshold
const DRIFT_CHECK_INTERVAL_MS = 2000;     // Check for drift every 2 seconds
const AUTO_FINISH_DELAY_MS = 1500;        // Delay before auto-finish (in-flight answers)
```

### Clock Sync
```typescript
// src/lib/utils/clock-sync.ts
const DEFAULT_SAMPLES = 3;                // Number of offset samples
const SAMPLE_DELAY_MS = 100;              // Delay between samples
const MAX_OFFSET_SECONDS = 300;           // Max acceptable offset (5 minutes)
```

### Validation
```typescript
// src/lib/constants.ts (example - check actual file)
const MAX_NICKNAME_LENGTH = 20;
const MIN_NICKNAME_LENGTH = 2;
const MAX_FILE_SIZE = 5 * 1024 * 1024;    // 5MB
const VALID_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
```

---

## Key Architectural Principles

1. **Security First**: Server-side validation for all critical operations
2. **Real-Time Sync**: Firestore listeners for instant updates
3. **Optimistic UI**: Immediate feedback, reconcile with server
4. **Clock Synchronization**: NTP-like approach for fair gameplay
5. **State Management**: Ref-based tracking, deduplication guards, async cleanup
6. **Error Handling**: Graceful degradation, user-friendly messages
7. **Performance**: Memoization, stable callbacks, parallel operations
8. **Reliability**: Transaction-based updates, race condition prevention

---

**End of Document**

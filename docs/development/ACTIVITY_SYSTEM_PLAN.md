# Activity Type System Implementation Plan

> **Plan Status**: Draft - Ready for implementation
> **Created**: 2025-12-03

## Overview
Introduce an Activity abstraction layer to support multiple engagement types beyond quizzes. Implement the Interest Cloud feature as the first non-quiz activity type.

## Architecture Decisions
- **New Activity entity**: Create `activities` collection. Quiz becomes one type of activity content.
- **Type-specific routes**: `/host/interest-cloud/[id]`, `/play/interest-cloud/[id]`, etc.
- **Shared infrastructure**: Join flow, player model, and session management remain shared.

---

## Phase 1: Type System Foundation

### 1.1 New Types (`src/lib/types.ts`)

```typescript
// Activity types
export type ActivityType = 'quiz' | 'poll' | 'interest-cloud' | 'qna' | 'vote';

// Base activity interface
export interface BaseActivity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  hostId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Quiz activity (wraps existing Quiz)
export interface QuizActivity extends BaseActivity {
  type: 'quiz';
  quizId: string;  // Reference to existing quiz document
}

// Interest Cloud activity
export interface InterestCloudActivity extends BaseActivity {
  type: 'interest-cloud';
  config: InterestCloudConfig;
}

export interface InterestCloudConfig {
  prompt: string;           // "What topics interest you most?"
  maxSubmissionsPerPlayer: number;  // Default: 3
  allowMultipleRounds: boolean;     // Can host reopen for more submissions
}

// Discriminated union
export type Activity = QuizActivity | InterestCloudActivity;

// Updated Game interface
export interface Game {
  id: string;
  activityType: ActivityType;
  activityId: string;      // Reference to activity document
  hostId: string;
  state: GameState;        // State varies by activity type
  gamePin: string;
  // ... activity-specific runtime fields
}

// State types per activity
export type QuizGameState = 'lobby' | 'preparing' | 'question' | 'leaderboard' | 'ended';
export type InterestCloudGameState = 'lobby' | 'collecting' | 'processing' | 'display' | 'ended';
```

### 1.2 Interest Cloud Specific Types

```typescript
// Player interest submission
export interface InterestSubmission {
  id: string;
  playerId: string;
  playerName: string;
  rawText: string;
  submittedAt: Timestamp;
  extractedTopics?: string[];  // Filled by AI
}

// Aggregated topic cloud result
export interface TopicCloudResult {
  topics: TopicEntry[];
  totalSubmissions: number;
  processedAt: Timestamp;
}

export interface TopicEntry {
  topic: string;
  count: number;
  variations: string[];
  submissionIds: string[];
}
```

---

## Phase 2: Database Structure

### 2.1 New Collections

```
/activities/{activityId}
  - type: ActivityType
  - title: string
  - hostId: string
  - config: { ... }  // Type-specific config

/games/{gameId}
  - activityType: ActivityType
  - activityId: string
  - hostId: string
  - state: string
  - gamePin: string

  /players/{playerId}  (existing structure)

  /submissions/{submissionId}  (for interest submissions)
    - playerId: string
    - rawText: string
    - extractedTopics?: string[]

  /aggregates/topics  (for interest cloud results)
    - topics: TopicEntry[]
    - totalSubmissions: number
```

### 2.2 Firestore Rules Updates (`firestore.rules`)

Add rules for:
- `/activities/{activityId}` - Host CRUD
- `/games/{gameId}/submissions` for interest cloud

---

## Phase 3: Host Dashboard Updates

### 3.1 Files to Modify

| File | Changes |
|------|---------|
| `src/app/host/page.tsx` | Add "Create Activity" section, list activities |
| `src/app/host/create-activity/page.tsx` | NEW: Activity type selector |
| `src/app/host/create-interest-cloud/page.tsx` | NEW: Interest cloud creation form |

### 3.2 Activity Creation Flow

1. Host clicks "New Activity"
2. Selects activity type (Quiz, Interest Cloud, etc.)
3. Configures activity-specific settings
4. Creates activity document
5. Can launch game from activity

---

## Phase 4: Interest Cloud Host UI

### 4.1 New Route Structure

```
src/app/host/
  interest-cloud/
    create/page.tsx           # Create new interest cloud activity
    [activityId]/
      page.tsx                 # Activity details / launch game
    lobby/[gameId]/page.tsx   # Interest cloud lobby (collecting)
    game/[gameId]/page.tsx    # Interest cloud display
```

### 4.2 Host Game States

| State | UI | Host Actions |
|-------|-----|--------------|
| `lobby` | Show join info, player count | Wait for players |
| `collecting` | Show submission count | "Stop Collecting" button |
| `processing` | Loading spinner | Automatic (AI processing) |
| `display` | Word cloud visualization | "Collect More" or "End" |
| `ended` | Final cloud + export option | Return to dashboard |

---

## Phase 5: Interest Cloud Player UI

### 5.1 New Route Structure

```
src/app/play/
  interest-cloud/[gamePin]/
    page.tsx                   # Player interest cloud experience
    hooks/
      use-interest-submission.ts
    components/
      screens/
        lobby-screen.tsx
        submission-screen.tsx
        waiting-screen.tsx
        result-screen.tsx
```

### 5.2 Player States

| State | UI |
|-------|-----|
| `joining` | Enter name |
| `lobby` | Wait for host to start |
| `submitting` | Text input for interests |
| `waiting` | "Submitted! Waiting for results..." |
| `viewing` | See the topic cloud |
| `ended` | Final summary |

---

## Phase 6: AI Topic Extraction

### 6.1 New Cloud Function (`functions-ai/src/functions/extractTopics.ts`)

```typescript
// Input: Array of raw text submissions
// Output: Aggregated topics with counts

// Gemini prompt:
// "Extract distinct topics/interests from these submissions.
//  Normalize synonyms and variations.
//  Return structured JSON with topic, count, and source mappings."
```

### 6.2 Function Trigger

- Callable function triggered by host clicking "Process"
- Reads all submissions for the game
- Sends to Gemini for topic extraction
- Writes aggregated results to `/games/{gameId}/aggregates/topics`

---

## Phase 7: Shared Infrastructure

### 7.1 Reusable Components

These components work across all activity types:
- Join flow (`/join` page with PIN entry)
- Player session management
- QR code display
- Player list in lobby
- Theme toggle

### 7.2 Activity Router

Create a smart router that:
1. Looks up game by PIN
2. Reads `activityType`
3. Redirects to appropriate player route

```typescript
// src/app/play/[gamePin]/page.tsx
// Acts as router based on activityType
```

---

## Implementation Order

1. **Types & Models** - Add new types to `types.ts`
2. **Firestore Rules** - Add activity and submission rules
3. **Activity CRUD** - Create activity management on host dashboard
4. **Interest Cloud Creation** - Host creates interest cloud activity
5. **Game Launch** - Start game from activity
6. **Player Join Router** - Route players to correct experience
7. **Host Lobby** - Interest cloud lobby with player list
8. **Player Submission** - Text input and submission
9. **AI Processing** - Cloud function for topic extraction
10. **Display** - Word cloud visualization
11. **Polish** - Error handling, loading states, animations

---

## Files to Create

| Path | Description |
|------|-------------|
| `src/lib/types/activity.ts` | Activity type definitions |
| `src/app/host/activities/page.tsx` | Activities list |
| `src/app/host/create-activity/page.tsx` | Activity type picker |
| `src/app/host/interest-cloud/create/page.tsx` | Create interest cloud |
| `src/app/host/interest-cloud/[activityId]/page.tsx` | Activity detail |
| `src/app/host/interest-cloud/lobby/[gameId]/page.tsx` | IC lobby |
| `src/app/host/interest-cloud/game/[gameId]/page.tsx` | IC game |
| `src/app/play/interest-cloud/[gamePin]/page.tsx` | Player IC |
| `functions-ai/src/functions/extractTopics.ts` | AI function |

## Files to Modify

| Path | Changes |
|------|---------|
| `src/lib/types.ts` | Add ActivityType, Activity interfaces |
| `src/app/host/page.tsx` | Add activities section |
| `src/app/play/[gamePin]/page.tsx` | Add activity type router |
| `firestore.rules` | Add activity rules |
| `functions-ai/src/index.ts` | Export extractTopics |

---

## Migration Strategy

- Existing quizzes remain unchanged
- New games from quizzes auto-set `activityType: 'quiz'`
- Old games without `activityType` default to `'quiz'`

---

## Success Criteria

1. Host can create Interest Cloud activity from dashboard
2. Host can launch game and see players join
3. Host can start collection and see submission count
4. Players can submit interests via text input
5. AI extracts and aggregates topics
6. Host and players see animated word cloud
7. Host can export results or run another round

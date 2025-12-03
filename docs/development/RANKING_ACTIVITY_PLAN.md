# Ranking/Prioritization Activity Implementation Plan

> **Status**: Planned (not yet implemented)
> **Created**: December 2025
> **Activity Type**: `ranking`

## Overview

A collaborative ranking activity where participants score items across multiple configurable metrics. The host manages items (with optional participant submissions), then participants rate each item on predefined criteria. Results are analyzed with aggregate rankings, heatmaps, and consensus visualizations.

## Requirements Summary

### Core Features
- **Multi-dimensional scoring**: Items scored on multiple metrics (e.g., Impact, Effort, Feasibility)
- **Configurable scales**: Host defines scale per metric (1-5 stars, 1-10 numeric, custom labels)
- **Participant item submissions**: Optional - participants can suggest items for ranking
- **Partial completion allowed**: Participants can submit without rating every item/metric
- **Hidden rankings**: Results only visible after host triggers analysis
- **Join anytime**: Like Interest Cloud, participants can join mid-session

### Game Flow (States)
1. `collecting` - Host adds items, participants can submit suggestions (if enabled)
2. `ranking` - Participants score items on each metric
3. `analyzing` - Computing aggregate results
4. `results` - Display visualizations (rankings, heatmaps, consensus)
5. `ended` - Session complete

### Visualizations
- **Aggregate ranking**: Bar chart with final scores per item
- **Heat map**: Grid showing individual participant ratings per item/metric
- **Consensus view**: Highlight agreement levels (low variance = consensus, high variance = controversy)
- **Multi-dimension matrix**: If 2 key metrics, show 2x2 quadrant view (like Impact/Effort matrix)

---

## Data Model

### Activity Configuration (Firestore: `/activities/{activityId}`)

```typescript
export interface RankingMetric {
  id: string;
  name: string;                    // e.g., "Impact", "Effort", "Complexity"
  description?: string;            // Help text for participants
  scaleType: 'stars' | 'numeric' | 'labels';
  scaleMin: number;                // e.g., 1
  scaleMax: number;                // e.g., 5 or 10
  scaleLabels?: string[];          // For 'labels' type: ["Low", "Medium", "High"]
  weight?: number;                 // Optional weight for aggregate calculation (default: 1)
  lowerIsBetter: boolean;          // true for metrics like "Complexity", "Effort", "Risk"
                                   // When true, lower scores contribute positively to overall ranking
}

export interface RankingConfig {
  metrics: RankingMetric[];              // 1-5 metrics to rate on
  allowParticipantItems: boolean;        // Can participants suggest items?
  maxItemsPerParticipant: number;        // If allowed, how many? (default: 3)
  requireApproval: boolean;              // Must host approve participant items?
  showItemSubmitter: boolean;            // Show who submitted each item?
}

export interface RankingActivity {
  id: string;
  type: 'ranking';
  title: string;
  description?: string;
  hostId: string;
  config: RankingConfig;
  createdAt: Date;
  updatedAt: Date;
}
```

### Game State (Firestore: `/games/{gameId}`)

```typescript
export type RankingGameState = 'collecting' | 'ranking' | 'analyzing' | 'results' | 'ended';

// Extended Game interface for ranking
export interface RankingGameFields {
  activityType: 'ranking';
  activityId: string;
  state: RankingGameState;
  itemSubmissionsOpen: boolean;     // During collecting phase
}
```

### Items (Firestore: `/games/{gameId}/items/{itemId}`)

```typescript
export interface RankingItem {
  id: string;
  text: string;                     // Item name/description
  description?: string;             // Optional longer description
  submittedBy?: string;             // Player name (if participant-submitted)
  submittedByPlayerId?: string;     // Player ID
  isHostItem: boolean;              // true if added by host
  approved: boolean;                // For participant items requiring approval
  order: number;                    // Display order
  createdAt: Timestamp;
}
```

### Participant Ratings (Firestore: `/games/{gameId}/ratings/{playerId}`)

```typescript
export interface PlayerRatings {
  playerId: string;
  playerName: string;
  ratings: {
    [itemId: string]: {
      [metricId: string]: number;   // The score given
    };
  };
  submittedAt: Timestamp;
  isComplete: boolean;              // Rated all items on all metrics
}
```

### Aggregated Results (Firestore: `/games/{gameId}/aggregates/rankings`)

```typescript
export interface RankingResults {
  items: RankingItemResult[];
  totalParticipants: number;
  participantsWhoRated: number;
  processedAt: Timestamp;
}

export interface RankingItemResult {
  itemId: string;
  itemText: string;
  overallScore: number;             // Weighted average across metrics (0-1 normalized)
  rank: number;                     // Final position
  metricScores: {
    [metricId: string]: {
      rawAverage: number;           // Original scale average (e.g., 3.5 on 1-5 scale)
      normalizedAverage: number;    // 0-1 normalized (accounts for lowerIsBetter)
      median: number;
      stdDev: number;               // For consensus calculation
      distribution: number[];       // Count per score value
      responseCount: number;
    };
  };
  consensusLevel: 'high' | 'medium' | 'low';  // Based on stdDev
}
```

---

## Implementation Steps

### Step 1: Add Types
**File**: `src/lib/types.ts`

Add all the interfaces defined above:
- `RankingMetric`, `RankingConfig`, `RankingActivity`
- `RankingGameState`, `RankingItem`, `PlayerRatings`
- `RankingResults`, `RankingItemResult`
- Update `ActivityType` to include `'ranking'`
- Update `Game` interface to support ranking fields

### Step 2: Create Firestore Converters
**File**: `src/firebase/converters.ts`

Add converters for:
- `rankingActivityConverter`
- `rankingItemConverter`
- `playerRatingsConverter`

### Step 3: Host - Create Activity Page
**File**: `src/app/host/ranking/create/page.tsx`

Form with:
- Title & description
- Metrics configuration (add/remove metrics)
  - Name, description, scale type, min/max, labels
  - Optional weight
- Participant settings (allow submissions, require approval, max per person)
- Save creates activity in `/activities`

### Step 4: Host - Edit Activity Page
**File**: `src/app/host/ranking/edit/[activityId]/page.tsx`

Same form as create, pre-filled with existing data.

### Step 5: Host - Activity Detail Page (Launch)
**File**: `src/app/host/ranking/[activityId]/page.tsx`

- Shows activity details
- "Start Session" button → creates game document, redirects to game page
- Shows past sessions (games) for this activity

### Step 6: Host - Game Page (Collecting State)
**File**: `src/app/host/ranking/game/[gameId]/page.tsx`

During `collecting` state:
- PIN/QR display for joining
- Participant count
- **Item Management Panel**:
  - Add item form (text, optional description)
  - List of items with edit/delete/reorder
  - If participant items enabled: pending submissions with approve/reject
- "Start Ranking" button → transitions to `ranking` state

### Step 7: Host - Game Page (Ranking State)

During `ranking` state:
- Shows item list (read-only)
- Live counter: "X of Y participants have submitted ratings"
- Progress bar per participant (optional)
- "End Ranking" button → transitions to `analyzing`

### Step 8: Host - Game Page (Analyzing State)

During `analyzing` state:
- Loading spinner
- Triggers Cloud Function to compute aggregates
- Auto-transitions to `results` when complete

### Step 9: Host - Game Page (Results State)

During `results` state:
- **Aggregate Ranking View**: Horizontal bar chart, items sorted by overall score
- **Heat Map View**: Grid with items as rows, metrics as columns, color-coded averages
- **Consensus View**: Items colored by agreement level (green=consensus, red=controversial)
- **Participant Heat Map**: Grid showing individual ratings (items × participants)
- **2x2 Matrix** (if exactly 2 metrics): Quadrant view with items plotted
- "End Session" / "Export Results" buttons

### Step 10: Host - Game Page (Ended State)

- Final results summary
- Return to dashboard button

### Step 11: Player - Join & Rating Page
**File**: `src/app/play/ranking/[gamePin]/page.tsx`

States:
- `joining` - Enter name
- `collecting` - If item submissions allowed, show submission form + waiting
- `rating` - Show rating interface (items × metrics grid or card-by-card)
- `waiting` - After submitting, waiting for results
- `results` - View final rankings (read-only)
- `ended` - Session complete

**Rating UI Options**:
- Card-by-card: One item at a time, rate all metrics, swipe to next
- Grid view: See all items, tap to rate each metric
- Hybrid: Scrollable list with inline rating controls

### Step 12: Cloud Function - Compute Rankings
**File**: `functions/src/functions/computeRankingResults.ts`

Callable function that:
1. Reads all player ratings from `/games/{gameId}/ratings`
2. For each item, calculates per-metric: average, median, stdDev, distribution
3. **Normalize scores accounting for `lowerIsBetter`**:
   - For `lowerIsBetter: false` (e.g., Impact): normalize as `(score - min) / (max - min)` → 0-1
   - For `lowerIsBetter: true` (e.g., Complexity): normalize as `(max - score) / (max - min)` → 0-1
   - This way, higher normalized score always = better
4. Calculates weighted overall score using normalized values
5. Determines consensus level per item
6. Ranks items by overall score (highest = best)
7. Writes to `/games/{gameId}/aggregates/rankings`
8. Updates game state to `results`

**Example**: If "Impact" (1-5, higher is better) = 4 and "Complexity" (1-5, lower is better) = 2:
- Impact normalized: (4-1)/(5-1) = 0.75
- Complexity normalized: (5-2)/(5-1) = 0.75 (low complexity is good!)
- Equal weight: overall = 0.75

### Step 13: Visualization Components

**Files**:
- `src/components/app/ranking-bar-chart.tsx` - Horizontal bar chart for aggregate scores
- `src/components/app/ranking-heatmap.tsx` - Color-coded grid (recharts or custom)
- `src/components/app/consensus-indicator.tsx` - Visual for agreement level
- `src/components/app/matrix-quadrant.tsx` - 2x2 Impact/Effort style matrix

**Visualization Notes for `lowerIsBetter` metrics:**
- **Bar charts**: Show raw average but sort by normalized score
- **Heat maps**: Color scale inverted for `lowerIsBetter` (green=low, red=high for Complexity)
- **2x2 Matrix**: Automatically place axes so "good" is always top-right
  - e.g., High Impact + Low Complexity = top-right quadrant
- **Metric labels**: Show indicator icon (↑ or ↓) next to metric name to clarify direction

### Step 14: Update Dashboard
**File**: `src/app/host/page.tsx`

Add "Ranking" to activity type options with appropriate icon and color.

### Step 15: Update Firestore Rules
**File**: `firestore.rules`

Add rules for:
- `/activities/{activityId}` - hosts can CRUD their own
- `/games/{gameId}/items` - hosts can CRUD, players can read
- `/games/{gameId}/ratings/{playerId}` - players can write their own, hosts can read all
- `/games/{gameId}/aggregates/rankings` - hosts can write (via function), all can read

---

## Files to Create

### Pages
- `src/app/host/ranking/create/page.tsx`
- `src/app/host/ranking/edit/[activityId]/page.tsx`
- `src/app/host/ranking/[activityId]/page.tsx`
- `src/app/host/ranking/game/[gameId]/page.tsx`
- `src/app/play/ranking/[gamePin]/page.tsx`

### Components
- `src/components/app/metric-config-form.tsx` - Configure a single metric
- `src/components/app/item-management-panel.tsx` - Host item CRUD
- `src/components/app/rating-interface.tsx` - Player rating UI
- `src/components/app/ranking-bar-chart.tsx`
- `src/components/app/ranking-heatmap.tsx`
- `src/components/app/consensus-indicator.tsx`
- `src/components/app/matrix-quadrant.tsx`

### Hooks
- `src/app/host/ranking/game/[gameId]/hooks/use-ranking-game-state.ts`
- `src/app/play/ranking/[gamePin]/hooks/use-player-ratings.ts`

### Cloud Functions
- `functions/src/functions/computeRankingResults.ts`

## Files to Modify
- `src/lib/types.ts` - Add ranking types
- `src/firebase/converters.ts` - Add converters
- `src/app/host/page.tsx` - Add ranking to dashboard
- `firestore.rules` - Add ranking rules
- `functions/src/index.ts` - Export new function

---

## UI/UX Considerations

### Mobile-First Rating
- Large touch targets for star/numeric ratings
- Swipeable card interface for going through items
- Progress indicator showing completion

### Host Experience
- Drag-and-drop item reordering
- Bulk actions for participant submissions
- Real-time participant count during ranking

### Accessibility
- Keyboard navigation for ratings
- Screen reader support for scale values
- High contrast for heatmap colors

---

## Session Management

### Host Session (Reconnection)
Uses existing `src/lib/host-session.ts` pattern:

**Save session** in host game page:
```typescript
// In src/app/host/ranking/game/[gameId]/page.tsx
useEffect(() => {
  if (game && activity && user && game.state !== 'ended') {
    saveHostSession(
      gameId,
      game.gamePin,
      game.activityId || '',
      activity.title,
      user.uid,
      'ranking',        // activityType
      game.state        // gameState for routing
    );
  }
}, [gameId, game, activity, user, game?.state]);

// Clear session when game ends
useEffect(() => {
  if (game?.state === 'ended') {
    clearHostSession();
  }
}, [game?.state]);
```

**Update `src/lib/types.ts`**:
```typescript
export type ActivityType = 'quiz' | 'interest-cloud' | 'ranking';
```

**Update `useHostSession` hook** - already handles `activityType` for routing.

**Dashboard reconnection** (`src/app/host/page.tsx`):
- Already checks for active session and routes based on `activityType`
- Add `'ranking'` case to route to `/host/ranking/game/[gameId]`

### Player Session (Reconnection)
Uses existing `src/lib/player-session.ts` pattern:

**Create hook**: `src/app/play/ranking/[gamePin]/hooks/use-session-manager.ts`
```typescript
// Mirrors the quiz player pattern
const sessionManager = useSessionManager(gamePin);
const storedSession = sessionManager.getSession();
```

**Save session** when player joins:
```typescript
sessionManager.saveSession({
  playerId,
  gameDocId: gameId,
  gamePin,
  nickname: playerName,
});
```

**Clear session** when game ends or player leaves.

**Player state machine** should check for existing session on mount:
1. If valid session exists for this PIN → attempt reconnection
2. If no session → show join screen
3. If session invalid (game ended, player not found) → clear and show join

---

## Complete Route Map

### Current Application Routes
```
/                           - Landing page (join game)
/join                       - Join game by PIN
/login                      - Host login
/register                   - Host registration
/forgot-password            - Password reset
/verify-email               - Email verification

/host                       - Host dashboard (all activities)

# Quiz Routes
/host/quiz/create           - Create new quiz
/host/quiz/create-ai        - Create quiz with AI
/host/quiz/[quizId]         - Quiz detail (launch game)
/host/quiz/edit/[quizId]    - Edit quiz (if exists, else 404)
/host/quiz/lobby/[gameId]   - Quiz lobby (waiting for players)
/host/quiz/game/[gameId]    - Live quiz game
/host/quiz/analytics/[gameId] - Post-game analytics

/play/quiz/[gamePin]        - Player quiz game
/play/[gameId]              - Legacy player route (deprecated?)

# Interest Cloud Routes
/host/interest-cloud/create           - Create interest cloud activity
/host/interest-cloud/[activityId]     - Activity detail (launch session)
/host/interest-cloud/edit/[activityId] - Edit activity
/host/interest-cloud/game/[gameId]    - Live interest cloud session

/play/interest-cloud/[gamePin]        - Player interest cloud
```

### New Ranking Routes (to create)
```
# Host Routes
/host/ranking/create                  - Create ranking activity
/host/ranking/[activityId]            - Activity detail (launch session)
/host/ranking/edit/[activityId]       - Edit activity
/host/ranking/game/[gameId]           - Live ranking session

# Player Routes
/play/ranking/[gamePin]               - Player ranking participation
```

### Route Consistency Notes
1. **Pattern**: `/host/{activityType}/{action}/[id]`
2. **Game pages**: Always use `[gameId]` (document ID, not PIN)
3. **Player pages**: Always use `[gamePin]` (6-digit code)
4. **Activity pages**: Use `[activityId]` for the reusable activity template

---

## Future Enhancements (Out of Scope)
- Export to CSV/PDF
- Compare multiple sessions
- Anonymous vs named ratings toggle
- Time limit per item
- Weighted participant votes (e.g., senior stakeholders count more)

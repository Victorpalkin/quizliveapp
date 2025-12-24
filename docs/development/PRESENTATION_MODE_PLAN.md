# Hybrid Presentation Mode - Implementation Plan

---

## Overview
Build a Mentimeter-style presentation mode for Zivo that allows users to create unified presentations combining:
- **Content slides** (imported from Google Slides)
- **Interactive activity slides** (quizzes, polls, word clouds, evaluations)

**UX Goal:** Every slide feels the same - smooth, linear flow. Activity slides are just another type of slide, not a separate experience.

---

## Implementation Status

### Milestone 1: Foundation (MVP) - COMPLETED
| Task | Status | Files Created |
|------|--------|---------------|
| Data model types | ✅ Done | `src/lib/types.ts` |
| Presentation CRUD hooks | ✅ Done | `src/firebase/presentation/` |
| Content slide type | ✅ Done | `src/components/app/presentation/slide-types/content/` |
| Quiz slide type | ✅ Done | `src/components/app/presentation/slide-types/quiz/` |
| Core dispatch components | ✅ Done | `src/components/app/presentation/core/` |
| Editor with drag-and-drop | ✅ Done | `src/components/app/presentation/editor/` |
| Host presentation view | ✅ Done | `src/components/app/presentation/host/` |
| Player view with waiting | ✅ Done | `src/components/app/presentation/player/` |
| Routes (create, edit, lobby, present) | ✅ Done | `src/app/host/presentation/` |
| Player route | ✅ Done | `src/app/play/presentation/[gamePin]/` |
| Dashboard integration | ✅ Done | `src/app/host/components/presentation-card.tsx` |

### What's Working Now
- Create/edit presentations with content and quiz slides
- Drag-and-drop slide reordering in editor
- Full-screen host presentation view with auto-hiding controls
- Player join flow with waiting screen for non-interactive slides
- Keyboard navigation (arrows, space, enter) during presentation
- Presentations visible on host dashboard with filtering
- Google Slides import (OAuth, Cloud Function)
- Poll slides (placeholder components exist)
- Thoughts gathering slides (placeholder components exist)

### What's NOT Implemented Yet

- [ ] Rating slides (placeholder components exist)
- [ ] Firestore security rules for presentations
- [ ] Storage rules for presentation images
- [ ] Cloud Functions for answer submission

## User Experience Flow

### Editor Experience
- Slide-based editor (like Google Slides or Keynote)
- Add slides via "+" button with slide type picker:
  - 📄 **Content** - import from Google Slides or upload image/text
  - ❓ **Quiz Question** - scored question with correct answer
  - 📊 **Poll** - gather opinions (no scoring)
  - 💡 **Thoughts Gathering** - adds two slides: collect → results (word cloud)
  - ⭐ **Item Rating** - adds two slides: describe → rate
- Drag-and-drop to reorder any slides freely
- Results slides can be moved anywhere (not locked after their source)
- Each slide type has its own editor panel

### Slide Patterns in Detail

**Thoughts Gathering Pattern:**
1. Add "Thoughts Gathering" → creates 2 slides:
   - `thoughts-collect`: Prompt shown, players submit ideas
   - `thoughts-results`: Word cloud visualization
2. User can drag `thoughts-results` to show results later
3. Can even add content slides between collect and results

**Item Rating Pattern:**
1. Add "Item Rating" → creates 2 slides:
   - `rating-describe`: Item title, description, image (presenter explains)
   - `rating-input`: Players submit star/numeric rating
2. Optionally add `rating-results` slide to show aggregate
3. Can rate multiple items, then show all results together at end

### Rating Results Visualization (Detailed)

Rating results can be displayed in three modes, configurable per results slide:

#### 1. Single Item Results (`rating-results-single`)
Shows detailed results for one specific rated item.

**Display:**
```
┌─────────────────────────────────────────────────────────────┐
│                     [Item Title]                             │
│                                                              │
│     ★★★★☆  4.2 average  (42 responses)                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ★★★★★  ████████████████████  45%  (19)               │ │
│  │  ★★★★☆  ██████████████  32%  (13)                     │ │
│  │  ★★★☆☆  █████  12%  (5)                               │ │
│  │  ★★☆☆☆  ██  5%  (2)                                   │ │
│  │  ★☆☆☆☆  ██  5%  (2)                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Use case:** Deep dive into one item before moving to the next.

#### 2. Comparison Results (`rating-results-comparison`)
Shows all rated items side-by-side for comparison, sorted by average rating.

**Display:**
```
┌─────────────────────────────────────────────────────────────┐
│                   Overall Ranking                            │
│                                                              │
│  #1  ★★★★☆ 4.5  Feature A   ████████████████████████  (42) │
│  #2  ★★★★☆ 4.2  Feature C   ████████████████████  (38)     │
│  #3  ★★★☆☆ 3.8  Feature B   ████████████████  (41)         │
│  #4  ★★★☆☆ 3.2  Feature D   ████████████  (40)             │
│  #5  ★★☆☆☆ 2.5  Feature E   ████████  (35)                 │
│                                                              │
│                    [Total: 196 ratings]                      │
└─────────────────────────────────────────────────────────────┘
```

**Use case:** Final slide showing how all items ranked relative to each other.

#### 3. Live/Intermediate Results (`rating-results-live`)
Shows real-time results as players submit ratings, with animations.

**Display:**
- Same as Single Item or Comparison, but with:
  - Live-updating bars that animate as new ratings arrive
  - Response counter: "23 / 42 rated"
  - "Waiting for more responses..." indicator when not all players have responded
  - Option to show "pulse" animation on latest submissions

**Host can choose when to reveal:**
- Hide results until host clicks "Show Results"
- Show live as ratings come in
- Show after X% of players have responded

#### Data Model Addition

```typescript
// For 'rating-results' type slides
export interface RatingResultsConfig {
  mode: 'single' | 'comparison' | 'live';

  // For 'single' mode - which item to show
  sourceItemSlideId?: string;

  // For 'comparison' mode - which items to compare
  sourceItemSlideIds?: string[];  // Empty = all rated items

  // For 'live' mode - display options
  showLiveUpdates?: boolean;      // Animate as ratings arrive
  revealMode?: 'immediate' | 'on-click' | 'threshold';
  revealThreshold?: number;       // Percentage of players (e.g., 80)

  // Common display options
  sortBy?: 'average' | 'count' | 'order';  // For comparison mode
  showDistribution?: boolean;     // Show rating breakdown bars
  showResponseCount?: boolean;    // Show "X responses"
}
```

#### Editor Experience

When adding a Rating Results slide, the editor shows:
1. **Mode selector**: Single Item | Comparison | Live Results
2. **For Single mode**: Dropdown to select which item
3. **For Comparison mode**: Checkboxes to select which items (default: all)
4. **For Live mode**: Options for reveal behavior
5. **Common options**: Sort order, show distribution, etc.

#### Component Structure

```
src/components/app/presentation/slide-types/rating/
├── RatingDescribeEditor.tsx     # Item description editor
├── RatingDescribeHost.tsx       # Host view of item description
├── RatingInputEditor.tsx        # Rating input config editor
├── RatingInputHost.tsx          # Host view during rating (shows live count)
├── RatingInputPlayer.tsx        # Player rating input
├── RatingResultsEditor.tsx      # Results slide config editor
├── RatingResultsHost.tsx        # Results visualization (dispatches to:)
│   ├── RatingSingleResult.tsx   # Single item detailed view
│   ├── RatingComparisonResult.tsx # All items comparison
│   └── RatingLiveResult.tsx     # Live updating view
└── rating-utils.ts              # Shared calculation helpers
```

#### Firestore Data Structure

```
/games/{gameId}/aggregates/ratings
{
  items: {
    [slideId]: {
      title: string;
      totalResponses: number;
      averageRating: number;
      distribution: { [rating: number]: number };  // e.g., { 1: 2, 2: 5, 3: 10, 4: 15, 5: 8 }
      lastUpdated: Timestamp;
    }
  }
}

/games/{gameId}/players/{playerId}/ratings
{
  [slideId]: {
    rating: number;
    submittedAt: Timestamp;
  }
}
```

### Presenter Experience
- Linear progression: slide 1 → slide 2 → ... → end
- Content slides: just advance
- Activity slides: wait for participation, then advance
- Keyboard: Space/Enter to advance, see live responses

### Host Screen Layout (Maximize Slide Space)
**Design principle:** Slides should dominate the screen. Controls should be minimal and unobtrusive.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  [PIN: ABC123]          [5/12]          [👥 42]     │  ← Minimal top bar (semi-transparent overlay)
│                                                     │
│                                                     │
│                                                     │
│                   SLIDE CONTENT                     │  ← Full-bleed slide (95%+ of screen)
│                   (maximum size)                    │
│                                                     │
│                                                     │
│                                                     │
│                        [Next →]                     │  ← Floating control button (bottom right)
└─────────────────────────────────────────────────────┘
```

**Behaviors:**
- Top bar: fades out after 3 seconds of no mouse movement (reappears on hover/move)
- Full-screen mode (F11 or button): hides browser chrome completely
- Activity slides: response counts appear as subtle overlay on slide
- Controls minimize when presenting, expand on hover

### Player Experience
- Content slides: "Waiting for activity..." screen
- Activity slides: interact immediately
- Smooth transitions between all slide types
- **Late join**: Players can join anytime during presentation (not just lobby)

### Animation & Polish
- Slide transitions: fade/slide animations between all slide types
- Live updates: animate incoming responses (bar charts growing, word cloud updating)
- Player join animation: subtle notification when new players join mid-presentation
- Progress indicator: show current slide position (e.g., 5/12)
- Micro-interactions: button feedback, rating star animations, submission confirmations

## Architecture Decision

### New Activity Type: `presentation`
Create a new top-level activity type that acts as a **container** for slides, rather than modifying existing quiz structure.

**Why?**
- Keeps existing quiz/activity flows intact
- Presentations have different state machine (linear slides)
- Every "activity" becomes a slide type, not a nested activity
- Clean, unified data model

---

## Modular Architecture (Maintainability First)

**Principle:** Design for extensibility from day one. Adding a new slide type should require minimal changes.

### Slide Type Plugin Architecture

Each slide type is a self-contained module with:
1. **Type definition** - data shape in `types.ts`
2. **Editor component** - for creating/editing in editor
3. **Host renderer** - for presenting (display + controls)
4. **Player renderer** - for participation (input UI)
5. **Results component** - for visualizing responses (optional)

```
src/components/app/presentation/
├── slide-types/
│   ├── index.ts                    # Registry of all slide types
│   ├── content/
│   │   ├── ContentEditor.tsx       # Editor for content slides
│   │   ├── ContentHost.tsx         # Host view (full-screen image)
│   │   └── ContentPlayer.tsx       # Player view (waiting screen)
│   ├── quiz/
│   │   ├── QuizEditor.tsx
│   │   ├── QuizHost.tsx
│   │   ├── QuizPlayer.tsx
│   │   └── QuizResults.tsx
│   ├── poll/
│   │   ├── PollEditor.tsx
│   │   ├── PollHost.tsx
│   │   ├── PollPlayer.tsx
│   │   └── PollResults.tsx
│   ├── thoughts/
│   │   ├── ThoughtsCollectEditor.tsx
│   │   ├── ThoughtsCollectHost.tsx
│   │   ├── ThoughtsCollectPlayer.tsx
│   │   ├── ThoughtsResultsEditor.tsx
│   │   └── ThoughtsResultsHost.tsx
│   └── rating/
│       ├── RatingDescribeEditor.tsx
│       ├── RatingDescribeHost.tsx
│       ├── RatingInputEditor.tsx
│       ├── RatingInputHost.tsx
│       ├── RatingInputPlayer.tsx
│       └── RatingResultsHost.tsx
├── core/
│   ├── SlideRenderer.tsx           # Dispatches to correct slide type component
│   ├── SlideEditorRenderer.tsx     # Dispatches to correct editor component
│   └── PlayerSlideRenderer.tsx     # Dispatches to correct player component
├── editor/
│   ├── PresentationEditor.tsx      # Main editor shell
│   ├── SlideList.tsx               # Left sidebar with thumbnails
│   ├── SlideTypeSelector.tsx       # "+" button popup to add slides
│   └── SlidePropertiesPanel.tsx    # Right sidebar for properties
├── host/
│   ├── PresentationHost.tsx        # Main presentation shell
│   ├── HostControls.tsx            # Floating controls
│   └── HostOverlay.tsx             # Top bar with PIN, count, etc.
└── player/
    ├── PresentationPlayer.tsx      # Main player shell
    └── WaitingScreen.tsx           # "Waiting for activity..." screen
```

### Slide Type Registry

```typescript
// src/components/app/presentation/slide-types/index.ts

import { ContentEditor, ContentHost, ContentPlayer } from './content';
import { QuizEditor, QuizHost, QuizPlayer, QuizResults } from './quiz';
// ... etc

export interface SlideTypeDefinition {
  type: PresentationSlideType;
  label: string;
  icon: string;
  EditorComponent: React.ComponentType<EditorProps>;
  HostComponent: React.ComponentType<HostProps>;
  PlayerComponent: React.ComponentType<PlayerProps>;
  ResultsComponent?: React.ComponentType<ResultsProps>;
  createsMultipleSlides?: boolean;  // For thoughts/rating that create pairs
}

export const SLIDE_TYPES: Record<PresentationSlideType, SlideTypeDefinition> = {
  'content': {
    type: 'content',
    label: 'Content',
    icon: 'Image',
    EditorComponent: ContentEditor,
    HostComponent: ContentHost,
    PlayerComponent: ContentPlayer,
  },
  'quiz': {
    type: 'quiz',
    label: 'Quiz Question',
    icon: 'HelpCircle',
    EditorComponent: QuizEditor,
    HostComponent: QuizHost,
    PlayerComponent: QuizPlayer,
    ResultsComponent: QuizResults,
  },
  // ... etc
};
```

### Adding a New Slide Type (Future-Proof)

To add a new slide type (e.g., "video"):
1. Add type to `PresentationSlideType` union
2. Add data fields to `PresentationSlide` interface
3. Create folder `slide-types/video/` with 3-4 components
4. Register in `SLIDE_TYPES` map
5. Done - editor, host, and player automatically pick it up

### Shared Hooks for All Slide Types

```
src/hooks/presentation/
├── usePresentationState.ts         # Subscribe to presentation game state
├── useSlideNavigation.ts           # Next/prev/goto slide
├── useSlideSubmission.ts           # Submit answers (routes to correct handler)
├── useLiveResponses.ts             # Real-time response counts
└── useSlideTimer.ts                # Optional timer for timed slides
```

### Firebase Integration Layer

```
src/firebase/presentation/
├── usePresentationDoc.ts           # CRUD for presentations
├── usePresentationGame.ts          # Game state subscription
├── submitSlideResponse.ts          # Unified submission handler
└── computeSlideResults.ts          # Client-side results aggregation
```

---

## Phase 1: Data Model & Google OAuth

### 1.1 New Types (`src/lib/types.ts`)

```typescript
// Presentation slide types
export type PresentationSlideType =
  | 'content'           // Imported slide (image) or text content
  | 'quiz'              // Quiz question (scored)
  | 'poll'              // Poll question (no scoring)
  | 'thoughts-collect'  // Thoughts gathering: collection prompt
  | 'thoughts-results'  // Thoughts gathering: extracted groups display
  | 'rating-describe'   // Rating: item description (presenter explains)
  | 'rating-input'      // Rating: players submit their rating
  | 'rating-results'    // Rating: show aggregate results (optional)

// A single slide in a presentation
export interface PresentationSlide {
  id: string;
  type: PresentationSlideType;
  order: number;

  // For 'content' type
  imageUrl?: string;           // Firebase Storage URL (imported or uploaded)
  sourceSlideId?: string;      // Google Slides page ID (for re-import)
  title?: string;              // Optional text content
  description?: string;        // Optional text content

  // For 'quiz' and 'poll' types
  question?: Question;         // Reuse existing Question type

  // For 'thoughts' type - word cloud collection
  thoughtsPrompt?: string;     // e.g., "What challenges do you face?"
  thoughtsMaxPerPlayer?: number; // Default: 3
  thoughtsTimeLimit?: number;  // Optional time limit

  // For 'rating-describe' type - item description
  ratingItem?: {
    title: string;             // Item name
    description?: string;      // Item description (shown to players)
    imageUrl?: string;         // Optional item image
  };

  // For 'rating-input' type - rating input
  ratingInputSlideId?: string; // Links to the 'rating-describe' slide it belongs to
  ratingMetric?: {
    type: 'stars' | 'numeric' | 'labels';
    min: number;
    max: number;
    labels?: string[];         // For 'labels' type
    question?: string;         // e.g., "How important is this?"
  };

  // For 'thoughts-results' and 'rating-results' types
  sourceSlideId?: string;      // Which collection/input slide this shows results for
}

export interface Presentation {
  id: string;
  title: string;
  description?: string;
  hostId: string;
  slides: PresentationSlide[];

  // Google Slides import tracking
  googleSlidesId?: string;     // Source presentation ID
  lastImportedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type PresentationGameState =
  | 'lobby'
  | 'slide'              // Showing content slide
  | 'activity'           // Running an interactive activity
  | 'ended';

// Extend Game type
export interface PresentationGame extends Omit<Game, 'quizId'> {
  activityType: 'presentation';
  presentationId: string;
  currentSlideIndex: number;
  currentActivityState?: string; // Sub-state for interactive slides
}
```

### 1.2 Google OAuth Integration

**Files to create:**
- `src/lib/google-auth.ts` - OAuth flow helpers
- `src/app/api/auth/google/route.ts` - OAuth callback handler
- `functions/src/functions/importGoogleSlides.ts` - Cloud Function for import

**OAuth Scopes needed:**
- `https://www.googleapis.com/auth/presentations.readonly` - Read presentations
- `https://www.googleapis.com/auth/drive.readonly` - Export slides as images

**Flow:**
1. User clicks "Import from Google Slides"
2. OAuth popup → user grants access
3. Store refresh token in Firestore (encrypted)
4. List user's presentations for selection

---

## Phase 2: Presentation Editor

### 2.1 New Routes

```
src/app/host/presentation/
├── page.tsx                    # Presentation list
├── create/
│   └── page.tsx               # New presentation
├── edit/[presentationId]/
│   └── page.tsx               # Edit presentation
├── lobby/[gameId]/
│   └── page.tsx               # Presentation lobby
└── present/[gameId]/
    └── page.tsx               # Live presentation host view
```

### 2.2 Editor Components

**Main editor:** `src/app/host/presentation/edit/[presentationId]/page.tsx`

Features:
- Left sidebar: slide thumbnails (drag to reorder)
- Main area: selected slide editor
- Right sidebar: slide properties
- Toolbar: Add slide, Import from Google Slides, Preview

**Key components:**
- `src/components/app/presentation/slide-list.tsx` - Thumbnail sidebar
- `src/components/app/presentation/slide-editor.tsx` - Main editor area
- `src/components/app/presentation/google-slides-importer.tsx` - Import modal
- `src/components/app/presentation/activity-slide-editor.tsx` - Quiz/poll/etc editor

### 2.3 Google Slides Import Flow

1. User clicks "Import from Google Slides"
2. If not connected → OAuth flow
3. Show picker with user's presentations
4. User selects presentation
5. Cloud Function exports each slide as PNG (1600px width)
6. Upload PNGs to Firebase Storage: `presentations/{presentationId}/slides/{index}.png`
7. Create `PresentationSlide` entries with type='content'
8. User can intersperse interactive slides between imported content

---

## Phase 3: Presentation Host View

### 3.1 State Machine

```
lobby → slide ↔ activity → slide → ... → ended
          ↓                    ↓
       (content)         (interactive)
```

**Host controls:**
- Content slides: Next/Previous
- Interactive slides: Same controls as current activity host views
- Keyboard shortcuts: Space/Enter to advance, arrows for navigation

### 3.2 Host View Components

`src/app/host/presentation/present/[gameId]/page.tsx`

- Unified host view that switches rendering based on current slide type
- Reuse existing visualization components:
  - `AnswerDistributionChart` for quiz results
  - `LeaderboardView` for scores
  - Word cloud component for thoughts gathering
  - Heatmap/matrix for evaluations

---

## Phase 4: Player Experience

**Design Decision**: Players see a "waiting" screen during content slides (focused on in-person presentations). They only interact during activity slides.

### 4.1 Player Routes

```
src/app/play/presentation/[gamePin]/
├── page.tsx                   # Main player view
└── components/
    ├── waiting-screen.tsx     # "Waiting for next activity..." during content slides
    ├── quiz-slide.tsx         # Answer questions
    ├── poll-slide.tsx         # Vote
    ├── thoughts-slide.tsx     # Submit ideas
    └── evaluation-slide.tsx   # Rate items
```

### 4.2 Player State Machine

```
joining → lobby → waiting/participating → ended
                      ↓
          (waiting during content, active during activities)
```

- **Content slides**: Show "Waiting for the next activity..." with presentation title
- **Interactive slides**: Show appropriate input UI (quiz answers, poll options, text input, ratings)

---

## Phase 5: Cloud Functions

### 5.1 New Functions (`functions-ai/`)

**`importGoogleSlides.ts`**
- Input: Google Slides presentation ID, OAuth tokens
- Process: Export each page as PNG via Drive API
- Output: Upload to Storage, return URLs

**`functions/`**

**`submitPresentationAnswer.ts`**
- Unified answer handler for presentation activities
- Routes to appropriate scoring logic based on slide type

---

## Implementation Order (Updated)

### Milestone 1: Foundation (MVP) ✅ COMPLETE (pending bug fixes)
1. ✅ Data model types
2. ✅ Basic presentation CRUD
3. ✅ Content slides (image upload)
4. ✅ Quiz question slides
5. ✅ Host presentation view
6. ✅ Player view
7. ✅ Dashboard integration

**Known bugs to fix:**
- [ ] (To be identified during testing)

### Milestone 2: Full Activity Support ← CURRENT FOCUS
**Goal:** Complete all slide types before polishing.

| # | Task | Description |
|---|------|-------------|
| 8 | Poll slides | ✅ Reuse quiz UI without correct answer marking |
| 9 | Thoughts gathering | ✅ `thoughts-collect` for input, `thoughts-results` for word cloud |
| 10a | Rating describe/input | `rating-describe` + `rating-input` slides |
| 10b | Rating single results | Single item detailed view with distribution bars |
| 10c | Rating comparison results | All items ranked side-by-side |
| 10d | Rating live results | Real-time updating results with animations |
| 11 | Results visualization | Charts, word clouds, aggregate displays |

#### Rating Slides Detailed Tasks

| Sub-task | Components | Description |
|----------|------------|-------------|
| 10a-1 | `RatingDescribeEditor` | Editor for item title, description, image |
| 10a-2 | `RatingDescribeHost` | Host view showing item to audience |
| 10a-3 | `RatingInputEditor` | Configure rating scale (stars, 1-10, labels) |
| 10a-4 | `RatingInputHost` | Host view with response counter |
| 10a-5 | `RatingInputPlayer` | Player rating submission UI |
| 10b-1 | `RatingSingleResult` | Detailed view: avg rating + distribution bars |
| 10c-1 | `RatingComparisonResult` | All items ranked with horizontal bars |
| 10d-1 | `RatingLiveResult` | Live-updating view with animations |
| 10e-1 | `RatingResultsEditor` | Mode selector + configuration options |
| 10e-2 | `use-rating-aggregates` | Firebase hook for rating aggregates |
| 10e-3 | `submitRating` CF | Cloud function for rating submission |

#### Component Reuse Strategy (from Evaluation)

**Fully Reusable - Import Directly:**
| Component | Location | Use in Rating Slides |
|-----------|----------|---------------------|
| `EvaluationBarChart` | `src/components/app/evaluation-bar-chart.tsx` | **Comparison Results** - horizontal bars ranked by score |
| `EvaluationHeatmap` | `src/components/app/evaluation-heatmap.tsx` | **Comparison Results** - multi-metric color-coded table |
| `EvaluationMatrix` | `src/components/app/evaluation-matrix.tsx` | **Comparison Results** - 2D scatter for multi-metric |
| `ConsensusIndicator` | `src/components/app/consensus-indicator.tsx` | **Single/Comparison** - agreement level badges |
| `ConsensusList` | `src/components/app/consensus-indicator.tsx` | **Comparison** - high/low consensus summary |

**Extract to Shared Components:**
| Pattern | Source | New Shared Component |
|---------|--------|---------------------|
| Star rating input | `play/evaluation/[gamePin]/page.tsx:526-548` | `src/components/app/rating-input.tsx` |
| Numeric scale input | `play/evaluation/[gamePin]/page.tsx:550-571` | (same file, variant) |
| Label buttons input | `play/evaluation/[gamePin]/page.tsx:573-595` | (same file, variant) |
| Item navigation dots | `play/evaluation/[gamePin]/page.tsx:635-655` | `src/components/app/progress-dots.tsx` |

**Reuse Data Types (already in `src/lib/types.ts`):**
- `EvaluationItemResult` - Used by all visualization components
- `EvaluationMetric` - For multi-metric rating scales
- `PlayerRatings` - Rating submission format

**Build New:**
| Component | Reason |
|-----------|--------|
| `RatingSingleResult` | **New** - Distribution bars (1-5 stars breakdown) for single item |
| `RatingLiveResult` | **New** - Animation wrapper for live updates using `motion/react` |
| `RatingResultsEditor` | **New** - Mode selector (single/comparison/live) |
| `use-slide-ratings` | **New** - Hook with `slideId` filtering for presentation context |

#### Security Considerations

**Firestore Rules for Rating Slides:**

```javascript
// In firestore.rules - add to games/{gameId} section

// Rating submissions - players can only submit their own
match /ratings/{playerId} {
  allow read: if isGameParticipant() || isGameHost();
  allow create, update: if request.auth != null
    && playerId == request.resource.data.playerId
    && isGameActive()
    && validateRatingData();
  allow delete: if isGameHost();
}

// Rating aggregates - read-only for players, host can trigger compute
match /aggregates/ratings {
  allow read: if isGameParticipant() || isGameHost();
  allow write: if false; // Only Cloud Functions can write
}

function validateRatingData() {
  let data = request.resource.data;
  return data.playerId is string
    && data.ratings is map
    && data.submittedAt is timestamp;
}
```

**Cloud Function Security (`submitRating`):**

| Check | Description |
|-------|-------------|
| Game state validation | Only accept ratings when `state == 'presenting'` and current slide is `rating-input` |
| Player validation | Verify playerId exists in `games/{gameId}/players` |
| Slide validation | Verify `slideId` matches current slide or is a valid rating-input slide |
| Rating value bounds | Validate rating is within configured `min`/`max` for the metric |
| Rate limiting | Max 10 rating submissions per minute per player |
| Duplicate prevention | Reject if player already rated this slide (unless update allowed) |
| CORS restrictions | Only accept from allowed origins |

**Server-Side Aggregation:**

| Principle | Implementation |
|-----------|----------------|
| No client-side totals | Aggregates computed only by Cloud Functions |
| Atomic updates | Use Firestore transactions for aggregate updates |
| Timing validation | Reject ratings submitted after slide advances |
| Input sanitization | Validate all fields, reject extra properties |

**Data Isolation:**

```
/games/{gameId}/
├── ratings/{playerId}           # Individual player ratings (isolated)
│   └── {slideId}: { rating, submittedAt }
├── aggregates/
│   └── ratings                  # Computed aggregates (read-only for clients)
│       └── items: { [slideId]: { avg, distribution, count } }
```

**Anti-Cheating Measures:**

| Measure | Description |
|---------|-------------|
| Server-side validation | All ratings validated in Cloud Function before storage |
| No client computation | Averages/distributions computed server-side only |
| Immutable once submitted | Players cannot change rating after submission |
| Slide timing check | Reject ratings for slides that are no longer active |
| Player existence check | Verify player joined before slide was shown |

### Milestone 3: Google Integration
| # | Task | Description |
|---|------|-------------|
| 12 | Google OAuth setup | OAuth flow, token storage |
| 13 | Import Cloud Function | Export slides as images via Drive API |
| 14 | Import UI | Picker UI in editor |
| 15 | Re-import/sync | Update existing presentation from source |

### Milestone 4: Advanced Features
| # | Task | Description |
|---|------|-------------|
| 16 | Presenter notes | Collapsible notes visible only to host |
| 17 | Audience pacing | Wait for % before advancing |
| 18 | Export results | Download responses as CSV/PDF |
| 19 | Presentation templates | Pre-built starter templates |

### Milestone 5: Usability & Polish (Final)
**Goal:** Make the feature intuitive and delightful after all features are built.

#### 5.1 Host Guidance
| Task | Priority | Description |
|------|----------|-------------|
| Empty presentation state | High | Helpful empty state with "Add your first slide" CTA |
| Keyboard shortcuts help | Medium | `?` key shows shortcuts overlay (Space, arrows, F, Esc) |
| Preview mode | Medium | "Preview" button to test without creating game |
| Auto-save indicator | Low | Show "Saved" / "Saving..." status |

#### 5.2 Presentation Flow UX
| Task | Priority | Description |
|------|----------|-------------|
| Slide thumbnails in presenter | High | Small navigation strip at bottom |
| Response counter animation | High | Animate count updates on interactive slides |
| "End presentation" confirmation | High | Prevent accidental end |
| Slide progress bar | Medium | Thin progress bar showing position |

#### 5.3 Player Experience Polish
| Task | Priority | Description |
|------|----------|-------------|
| Join confirmation animation | High | Celebrate successful join |
| Submission feedback | High | Clear "Answer submitted!" feedback |
| Connection status | High | Show reconnecting indicator |
| Late join welcome | Medium | "You joined during slide X of Y" |
| Vibration feedback (mobile) | Low | Haptic feedback on tap |

#### 5.4 Error Handling & Edge Cases
| Task | Priority | Description |
|------|----------|-------------|
| Empty slides warning | High | Warn before presenting if slides empty |
| Network error recovery | High | Auto-retry with message |
| Game not found state | High | Clear invalid PIN message |
| Browser back button | Medium | Confirm exit on back |
| Session persistence | Medium | Rejoin after page refresh |

#### 5.5 Accessibility
| Task | Priority | Description |
|------|----------|-------------|
| Reduced motion support | High | Respect `prefers-reduced-motion` |
| Keyboard navigation | High | Full editor keyboard accessible |
| Focus management | Medium | Proper focus on transitions |
| ARIA labels | Medium | Screen reader support |
| Color contrast check | Low | WCAG AA compliance |

#### 5.6 Testing Checklist
Before release, verify these scenarios:

**Host Flow:**
- [ ] Create presentation, add slides, reorder, launch, present, end

**Player Flow:**
- [ ] Join, wait during content, answer quiz, see confirmation, refresh/rejoin, see end

**Edge Cases:**
- [ ] Empty presentation warning
- [ ] Single slide presentation
- [ ] Player late join
- [ ] Host/player reconnection

---

## Key Files for Usability Phase (Milestone 5)

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/app/presentation/editor/PresentationEditor.tsx` | Add empty state, auto-save indicator |
| `src/components/app/presentation/host/PresentationHost.tsx` | Add keyboard shortcuts overlay, confirmation dialogs |
| `src/components/app/presentation/host/HostOverlay.tsx` | Add progress bar, response counter animation |
| `src/components/app/presentation/player/PresentationPlayer.tsx` | Add submission feedback, connection status |
| `src/app/play/presentation/[gamePin]/page.tsx` | Add join animation, session persistence |
| `src/app/host/presentation/lobby/[gameId]/page.tsx` | Add validation warnings |

### New Files to Create
| File | Purpose |
|------|---------|
| `src/components/app/presentation/editor/KeyboardShortcutsHelp.tsx` | `?` key overlay |
| `src/components/app/presentation/editor/EmptyPresentationState.tsx` | Empty state with guidance |
| `src/components/app/presentation/player/ConnectionStatus.tsx` | Network status indicator |
| `src/components/app/presentation/player/SubmissionFeedback.tsx` | Animated success feedback |
| `src/hooks/use-reduced-motion.ts` | Accessibility hook for motion preferences |

### Existing Patterns to Reuse
- Motion animations - Already using `motion/react` throughout
- Toast notifications - Using `@/hooks/use-toast` for feedback
- Session management - `@/lib/player-session.ts` pattern

---

## Pending Infrastructure (Before Production)

| File | Changes |
|------|---------|
| `firestore.rules` | Add presentation access rules |
| `storage.rules` | Add presentation image rules |
| `functions/src/functions/` | Add `submitRating.ts` for rating slides |

---

## Security Architecture

### Overview

Presentation mode must enforce security at multiple layers to prevent cheating, data leakage, and unauthorized access.

### Firestore Security Rules

#### Presentations Collection

```javascript
// /presentations/{presentationId}
match /presentations/{presentationId} {
  // Only owner can read/write their presentations
  allow read, write: if request.auth != null
    && request.auth.uid == resource.data.hostId;

  // Create: authenticated user becomes owner
  allow create: if request.auth != null
    && request.resource.data.hostId == request.auth.uid;

  // Shares subcollection (like quizzes)
  match /shares/{email} {
    allow read: if request.auth != null
      && (request.auth.uid == get(/databases/$(database)/documents/presentations/$(presentationId)).data.hostId
          || request.auth.token.email == email);
    allow write: if request.auth != null
      && request.auth.uid == get(/databases/$(database)/documents/presentations/$(presentationId)).data.hostId;
  }
}
```

#### Presentation Games

```javascript
// /games/{gameId} - Presentation games
match /games/{gameId} {
  // Host can read/write their games
  allow read, write: if request.auth != null
    && request.auth.uid == resource.data.hostId;

  // Players can read game state (but not answers/secrets)
  allow read: if isGamePlayer(gameId);

  // Players subcollection
  match /players/{playerId} {
    allow read: if isGameHost(gameId) || isGamePlayer(gameId);
    allow create: if gameIsJoinable(gameId);
    allow update: if request.auth != null
      && (playerId == request.auth.uid || isUnauthenticatedPlayer(playerId));
  }

  // Submissions (for thoughts gathering)
  match /submissions/{submissionId} {
    allow read: if isGameHost(gameId) || isGamePlayer(gameId);
    allow create: if gameIsActive(gameId) && hasValidSubmission();
    allow update, delete: if isGameHost(gameId);
  }

  // Ratings (for rating slides)
  match /ratings/{playerId} {
    allow read: if isGameHost(gameId) || isGamePlayer(gameId);
    allow create, update: if isPlayerSubmittingOwnRating(playerId)
      && gameIsActive(gameId)
      && hasValidRatingData();
    allow delete: if isGameHost(gameId);
  }

  // Aggregates (computed by Cloud Functions only)
  match /aggregates/{aggregateId} {
    allow read: if isGameHost(gameId) || isGamePlayer(gameId);
    allow write: if false; // Only Cloud Functions can write
  }

  // Slide responses (legacy, being deprecated)
  match /slideResponses/{responseId} {
    allow read: if isGameHost(gameId) || isGamePlayer(gameId);
    allow create: if gameIsActive(gameId);
    allow update, delete: if isGameHost(gameId);
  }
}

// Helper functions
function isGameHost(gameId) {
  return request.auth != null
    && request.auth.uid == get(/databases/$(database)/documents/games/$(gameId)).data.hostId;
}

function isGamePlayer(gameId) {
  return exists(/databases/$(database)/documents/games/$(gameId)/players/$(request.auth.uid))
    || request.auth == null; // Anonymous players allowed
}

function gameIsJoinable(gameId) {
  let game = get(/databases/$(database)/documents/games/$(gameId)).data;
  return game.state == 'lobby' || game.state == 'presenting';
}

function gameIsActive(gameId) {
  let game = get(/databases/$(database)/documents/games/$(gameId)).data;
  return game.state == 'presenting';
}
```

### Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Presentation images
    match /presentations/{presentationId}/slides/{fileName} {
      // Owner can upload/delete
      allow write: if request.auth != null
        && request.auth.uid == firestore.get(
          /databases/(default)/documents/presentations/$(presentationId)
        ).data.hostId
        && request.resource.size < 5 * 1024 * 1024; // 5MB limit

      // Public read for active presentations
      allow read: if true;
    }

    // Temp presentation images (during creation)
    match /temp/presentations/{tempId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
        && request.resource.size < 5 * 1024 * 1024;
      allow delete: if request.auth != null;
    }
  }
}
```

### Cloud Function Security

#### Common Security Checks

All presentation Cloud Functions must implement:

| Check | Implementation |
|-------|----------------|
| Authentication | Verify `context.auth` exists (or allow anonymous for players) |
| Rate limiting | Use `rateLimit()` utility from `functions/src/utils/rateLimit.ts` |
| CORS | Use `ALLOWED_ORIGINS` from `functions/src/config.ts` |
| Input validation | Validate all parameters, reject unknown fields |
| Game state check | Verify game exists and is in correct state |
| Player validation | Verify player exists in game (for player actions) |
| Host validation | Verify caller is host (for host actions) |

#### submitAnswer (Quiz/Poll Slides)

Already implemented - reuses existing `submitAnswer` function with `slideId` parameter.

#### submitRating (Rating Slides)

```typescript
// functions/src/functions/submitRating.ts
interface SubmitRatingRequest {
  gameId: string;
  playerId: string;
  slideId: string;
  rating: number;
  metricId?: string; // For multi-metric ratings
}

// Security checks:
// 1. Game exists and state is 'presenting'
// 2. Current slide matches slideId OR slideId is a valid rating-input slide
// 3. Player exists in game
// 4. Rating is within configured min/max bounds
// 5. Player hasn't already submitted for this slide (unless updates allowed)
// 6. Rate limit: 10 submissions/minute/player
```

#### extractTopics (Thoughts Slides)

Already implemented - reuses existing `extractTopics` function with `slideId` parameter.

### Data Isolation Principles

| Principle | Implementation |
|-----------|----------------|
| Player data isolation | Players can only see their own submissions, not others' |
| Answer key protection | Correct answers stored in `aggregates/answerKey`, never sent to clients |
| Aggregate read-only | All aggregates (`leaderboard`, `topics`, `ratings`) written only by CF |
| Late join safety | Late joiners cannot submit for past slides |
| Time-based validation | Server timestamps used, client timestamps rejected |

### Anti-Cheating Measures

| Threat | Mitigation |
|--------|------------|
| Submitting answers for others | `playerId` validated against authenticated user or session |
| Submitting after time expires | Server tracks slide timing, rejects late submissions |
| Multiple submissions | Duplicate detection in Cloud Function |
| Modifying scores | Scores computed server-side only, client has no write access |
| Viewing answers before submission | Answer keys in protected aggregate, sanitized questions sent to players |
| Rapid-fire submissions | Rate limiting (60/min for answers, 10/min for ratings) |
| Invalid rating values | Server validates against slide's configured min/max |

### Session Management

| Aspect | Implementation |
|--------|----------------|
| Player sessions | Stored in localStorage, validated against Firestore on reconnect |
| Host sessions | Stored in localStorage with `host-session.ts`, enables resume |
| Anonymous players | Allowed to join without auth, identified by generated playerId |
| Session expiry | Games auto-cleanup after 30 days via scheduled Cloud Function |

---

## Technical Considerations

### Google OAuth Token Storage
- Store refresh tokens encrypted in Firestore
- Use Cloud Function to refresh access tokens
- Token per user, not per presentation

### Image Storage Structure
```
presentations/
  {presentationId}/
    slides/
      {slideIndex}.png
    thumbnails/
      {slideIndex}.png  (200px for editor sidebar)
```

### Firestore Structure
```
/presentations/{presentationId}           # Presentation config
/presentations/{presentationId}/shares    # Sharing (like quizzes)
/games/{gameId}                           # Live game state
/games/{gameId}/players                   # Players (reuse existing)
/games/{gameId}/submissions               # For thoughts gathering slides
/games/{gameId}/ratings                   # For evaluation slides
```

### Late Join Handling
Players can join mid-presentation:
1. Game PIN remains active throughout (not just lobby)
2. Late joiners:
   - Join immediately to current slide state
   - Cannot participate in past activities (but can see results if shown)
   - Can participate in current and future activities
3. Player count updates live on host view
4. No leaderboard penalty for late joiners (scored only on participated slides)

### Animation Implementation
Uses `motion/react` (Framer Motion) for smooth transitions:
- `AnimatePresence` for slide transitions (mount/unmount animations)
- `motion.div` for element animations
- Stagger animations for lists (leaderboard, word cloud)
- Spring physics for natural feeling interactions
- `useReducedMotion` hook for accessibility (respect system preferences)
- Shared layout animations for consistent transitions

**Animation examples:**
- Slide transitions: slide in from right, fade out to left
- Word cloud: words fade and scale in with stagger
- Rating stars: bounce on selection
- Bar charts: bars grow from 0 with spring physics
- Player join: toast notification slides in from bottom

---

## Progress Summary

### Completed (Milestone 1)
- **New files created**: ~25 components/pages
- **Types added**: `PresentationSlide`, `Presentation`, `PresentationGame`, `PresentationGameState`
- **Routes created**: 5 (create, edit, lobby, present, play)

### Next Up (Milestone 2: Full Activity Support)
- **Completed slide types**: Poll, Thoughts (collect + results)
- **Remaining slide types**: Rating (describe, input, 3 results modes)
- **Components needed**: ~11 for rating:
  - `RatingDescribeEditor`, `RatingDescribeHost`
  - `RatingInputEditor`, `RatingInputHost`, `RatingInputPlayer`
  - `RatingResultsEditor`, `RatingResultsHost`
  - `RatingSingleResult`, `RatingComparisonResult`, `RatingLiveResult`
  - `rating-utils.ts`, `use-rating-aggregates.ts`

### Future (Milestones 3-5)
- **Google OAuth**: High complexity
- **Cloud Functions**: 2-3
- **Usability polish**: Final milestone after features complete

---

## Sources

- [Google Slides API Node.js Quickstart](https://developers.google.com/slides/api/quickstart/nodejs)
- [Motion (Framer Motion) Docs](https://motion.dev/docs)

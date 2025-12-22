# Hybrid Presentation Mode - Implementation Plan

## Overview
Build a Mentimeter-style presentation mode for Zivo that allows users to create unified presentations combining:
- **Content slides** (imported from Google Slides)
- **Interactive activity slides** (quizzes, polls, word clouds, evaluations)

**UX Goal:** Every slide feels the same - smooth, linear flow. Activity slides are just another type of slide, not a separate experience.

## User Experience Flow

### Editor Experience
- Slide-based editor (like Google Slides or Keynote)
- Add slides via "+" button with slide type picker:
  - Content - import from Google Slides or upload image/text
  - Quiz Question - scored question with correct answer
  - Poll - gather opinions (no scoring)
  - Thoughts Gathering - adds two slides: collect -> results (word cloud)
  - Item Rating - adds two slides: describe -> rate
- Drag-and-drop to reorder any slides freely
- Results slides can be moved anywhere (not locked after their source)
- Each slide type has its own editor panel

### Slide Patterns in Detail

**Thoughts Gathering Pattern:**
1. Add "Thoughts Gathering" -> creates 2 slides:
   - `thoughts-collect`: Prompt shown, players submit ideas
   - `thoughts-results`: Word cloud visualization
2. User can drag `thoughts-results` to show results later
3. Can even add content slides between collect and results

**Item Rating Pattern:**
1. Add "Item Rating" -> creates 2 slides:
   - `rating-describe`: Item title, description, image (presenter explains)
   - `rating-input`: Players submit star/numeric rating
2. Optionally add `rating-results` slide to show aggregate
3. Can rate multiple items, then show all results together at end

### Presenter Experience
- Linear progression: slide 1 -> slide 2 -> ... -> end
- Content slides: just advance
- Activity slides: wait for participation, then advance
- Keyboard: Space/Enter to advance, see live responses

### Host Screen Layout (Maximize Slide Space)
**Design principle:** Slides should dominate the screen. Controls should be minimal and unobtrusive.

**Layout:**
```
+-----------------------------------------------------+
|  [PIN: ABC123]          [5/12]          [users 42]  |  <- Minimal top bar (semi-transparent overlay)
|                                                     |
|                                                     |
|                                                     |
|                   SLIDE CONTENT                     |  <- Full-bleed slide (95%+ of screen)
|                   (maximum size)                    |
|                                                     |
|                                                     |
|                                                     |
|                        [Next ->]                    |  <- Floating control button (bottom right)
+-----------------------------------------------------+
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
  | 'thoughts-results'  // Thoughts gathering: word cloud display
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
2. OAuth popup -> user grants access
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
2. If not connected -> OAuth flow
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
lobby -> slide <-> activity -> slide -> ... -> ended
          |                    |
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
joining -> lobby -> waiting/participating -> ended
                      |
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

## Implementation Order

### Milestone 1: Foundation (MVP)
1. Data model types
2. Basic presentation CRUD (no Google import yet)
3. Simple content slides (upload images)
4. Quiz question slides
5. Basic host presentation view
6. Basic player view

### Milestone 2: Google Integration
7. Google OAuth setup
8. Google Slides import Cloud Function
9. Import UI in editor
10. Re-import/sync capability

### Milestone 3: Full Activity Support
11. Poll slides
12. Thoughts gathering slides
13. Evaluation slides
14. Results visualization for each type

### Milestone 4: Polish
15. Presenter notes
16. Audience pacing (wait for %)
17. Slide transitions/animations
18. Export results

---

## Key Files to Modify

| File | Changes |
|------|---------|
| `src/lib/types.ts` | Add Presentation types |
| `src/app/host/page.tsx` | Add Presentations section |
| `firebase.json` | Add new functions |
| `firestore.rules` | Add presentation access rules |
| `storage.rules` | Add presentation image rules |

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
**New dependency**: `npm install framer-motion`

Use Framer Motion for smooth transitions:
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

## Estimated Scope

- **New files**: ~25-30 components/pages
- **Modified files**: ~10
- **New Cloud Functions**: 2-3
- **Complexity**: High - this is a major feature

---

## Sources

- [Google Slides API Node.js Quickstart](https://developers.google.com/slides/api/quickstart/nodejs)
- [Google Workspace Codelab for Slides](https://codelabs.developers.google.com/codelabs/slides-api)
- [Convert Google Slides to Images](https://www.labnol.org/code/20673-google-slides-image-thumbnails)

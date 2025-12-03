# Background Music Implementation Plan

> **Status**: Planned (not yet implemented)
> **Created**: December 2025

## Requirements Summary
- **Scope**: Host screen only (projected screen)
- **When**: Entire session (lobby → game → ended)
- **Controls**: Volume slider with mute toggle
- **Audio**: Multiple tracks stored in Firebase Storage
- **Selection**: Host chooses tracks during activity creation/editing
- **Preview**: Pre-listen capability in the creation/edit forms
- **Activity-specific states**: Different music phases per activity type

## Music Phases by Activity Type

### Quiz Activity States
- `lobby` - Waiting for players
- `question` - During active questions
- `leaderboard` - Showing results/scores
- `ended` - Final screen

### Interest Cloud Activity States
- `collecting` - Gathering submissions
- `processing` - AI analyzing
- `display` - Showing word cloud
- `ended` - Session complete

## Implementation Steps

### Step 1: Define Music Types
**File**: `src/lib/types.ts`

```typescript
// Music track metadata stored in Firestore collection
export interface MusicTrack {
  id: string;
  name: string;           // Display name: "Upbeat Jazz"
  url: string;            // Firebase Storage URL
  duration: number;       // In seconds
  category: 'lobby' | 'question' | 'leaderboard' | 'collecting' | 'display';
}

// Music settings for Quiz
export interface QuizMusicSettings {
  enabled: boolean;
  lobbyTrackId?: string;
  questionTrackId?: string;
  leaderboardTrackId?: string;
}

// Music settings for Interest Cloud
export interface InterestCloudMusicSettings {
  enabled: boolean;
  collectingTrackId?: string;
  displayTrackId?: string;
}
```

### Step 2: Upload Music Files & Create Tracks Collection
1. Upload music files to Firebase Storage: `music/{trackId}.mp3`
2. Create Firestore collection `music_tracks` with track metadata
3. Update `storage.rules` for public read on `music/*`

### Step 3: Create Music Track Selector Component
**File**: `src/components/app/music-track-selector.tsx`

A dropdown/card component that:
- Fetches available tracks from Firestore (filtered by category)
- Shows track name and duration
- Has play/pause button for preview
- Emits selected track ID

```typescript
interface MusicTrackSelectorProps {
  category: MusicTrack['category'];
  selectedTrackId?: string;
  onSelect: (trackId: string | undefined) => void;
}
```

### Step 4: Create Music Settings Panel Component
**File**: `src/components/app/music-settings-panel.tsx`

Collapsible panel for activity creation/edit forms:
- Toggle to enable/disable music
- Track selectors for each phase
- Each selector has preview capability
- Different phases shown based on activity type

### Step 5: Update Quiz Types & Form
**Files**:
- `src/lib/types.ts` - Add `music?: QuizMusicSettings` to Quiz interface
- `src/components/app/quiz-form.tsx` - Add MusicSettingsPanel section

### Step 6: Update Interest Cloud Types & Forms
**Files**:
- `src/lib/types.ts` - Add `music?: InterestCloudMusicSettings` to InterestCloudConfig
- `src/app/host/interest-cloud/create/page.tsx` - Add MusicSettingsPanel
- `src/app/host/interest-cloud/edit/[activityId]/page.tsx` - Add MusicSettingsPanel

### Step 7: Create Background Music Hook
**File**: `src/hooks/use-background-music.ts`

```typescript
interface UseBackgroundMusicOptions {
  settings: QuizMusicSettings | InterestCloudMusicSettings | undefined;
  phase: string;  // Current game state
  enabled?: boolean;
}

interface UseBackgroundMusicReturn {
  volume: number;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  isPlaying: boolean;
}
```

Features:
- Fetch track URL from Firestore when track ID changes
- Crossfade between tracks when phase changes
- Persist volume/mute to localStorage
- Handle browser autoplay restrictions
- Loop tracks seamlessly

### Step 8: Create Music Control Component
**File**: `src/components/app/music-control.tsx`

Floating control panel for game pages:
- Volume slider
- Mute toggle
- Shows current track name (optional)
- Positioned in corner (opposite theme toggle)

### Step 9: Integrate into Host Quiz Pages
**Files**:
- `src/app/host/quiz/lobby/[gameId]/page.tsx`
- `src/app/host/quiz/game/[gameId]/page.tsx`

Map game states to track IDs from quiz.music settings.

### Step 10: Integrate into Host Interest Cloud Pages
**File**: `src/app/host/interest-cloud/game/[gameId]/page.tsx`

Map game states to track IDs from activity.config.music settings.

---

## Files to Create
- `src/components/app/music-track-selector.tsx`
- `src/components/app/music-settings-panel.tsx`
- `src/components/app/music-control.tsx`
- `src/hooks/use-background-music.ts`

## Files to Modify
- `src/lib/types.ts` - Add music types and settings interfaces
- `storage.rules` - Add public read for `music/*`
- `src/components/app/quiz-form.tsx` - Add music settings panel
- `src/app/host/interest-cloud/create/page.tsx` - Add music settings
- `src/app/host/interest-cloud/edit/[activityId]/page.tsx` - Add music settings
- `src/app/host/quiz/lobby/[gameId]/page.tsx` - Add music hook + controls
- `src/app/host/quiz/game/[gameId]/page.tsx` - Add music hook + controls
- `src/app/host/interest-cloud/game/[gameId]/page.tsx` - Add music hook + controls

## Firebase Setup (Automated)

### Step A: Create Seed Script
**File**: `scripts/seed-music-tracks.ts`

TypeScript script using Firebase Admin SDK that:
1. Reads MP3 files from `scripts/music-assets/` folder
2. Uploads each to Firebase Storage at `music/{trackId}.mp3`
3. Creates Firestore documents in `music_tracks` collection with:
   - Track name (from filename or metadata)
   - Download URL from Storage
   - Duration (read from MP3 metadata)
   - Category (from subfolder: lobby/, question/, etc.)

```bash
# Run with:
npx ts-node scripts/seed-music-tracks.ts
```

### Step B: Music Assets Folder Structure
```
scripts/
  music-assets/
    lobby/
      upbeat-jazz.mp3
      chill-beats.mp3
    question/
      tense-countdown.mp3
      exciting-chase.mp3
    leaderboard/
      victory-fanfare.mp3
      celebration.mp3
    collecting/
      ambient-focus.mp3
    display/
      reveal-moment.mp3
```

### Step C: Storage Rules Update
Add to existing `storage.rules`:
```
// Music tracks - public read
match /music/{trackId} {
  allow read: if true;
  allow write: if false;  // Only via admin script
}
```

## Files to Create (Updated)
- `scripts/seed-music-tracks.ts` - Seed script
- `scripts/music-assets/` - Folder for MP3 files (gitignored)
- `scripts/music-assets/.gitkeep` - Placeholder

## Audio File Recommendations
Source royalty-free music from:
- https://www.bensound.com/
- https://incompetech.com/music/
- https://freemusicarchive.org/

Specs:
- Format: MP3
- Duration: 2-3 minutes (will loop)
- Size: < 2MB per track

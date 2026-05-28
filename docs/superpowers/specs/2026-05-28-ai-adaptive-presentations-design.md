# AI-Adaptive Presentations for B2B Presales

## Overview

Transform Zivo from an audience engagement platform into the definitive AI-driven presales tool for B2B teams in tech, cloud, data, and AI. Every session adapts to the prospect in real-time, produces a polished follow-up deliverable, and makes the presenter look brilliant — all without CRM integrations or complex setup.

**Target audience:** B2B sales and presales engineers in technical domains.

**Core problems solved:**
- Passive demos lose deals — prospects zone out during one-way presentations
- Discovery and demo are disconnected — tailored decks are built separately from discovery calls
- No prospect intelligence capture — signals (priorities, objections, interests) are lost
- Generic demos don't resonate — every prospect gets the same deck

**Strategic positioning:** AI is the core differentiator. Interactivity is the vehicle that feeds AI with prospect context. The platform is self-contained — no CRM integrations needed. Works across all session formats (virtual calls, in-person meetings, large events).

---

## Design Principles: Simplicity First

UI/UX simplicity is the core tenet of this redesign. The infinite canvas is powerful, but power without simplicity is complexity. Every feature must pass the "first-time user" test: can someone who has never seen Zivo create and present something in 10 minutes?

**Progressive disclosure:** The default experience should feel as simple as a slide deck. Advanced features (free canvas navigation, multiple sequences, AI reordering) exist but stay hidden until the user reaches for them.

| User level | What they see |
|-----------|---------------|
| **Beginner** | Frames in a row, Next/Previous navigation, click Elements tab to add things. Feels like Google Slides with better interactivity. |
| **Intermediate** | Discovers AI tab, learns to zoom out and see the canvas, starts using topic clusters. |
| **Advanced** | Creates multiple sequences, uses AI sequence reordering, free-navigates during sessions. |

**Specific simplicity rules:**
1. **Default to the simple path.** New presentations start with one frame and a linear sequence. The canvas is there but doesn't demand attention.
2. **One-click over configuration.** Adding an element = one click. Applying a text preset = one click. No dialogs unless configuring interactive element logic.
3. **AI handles complexity.** Topic clustering, frame positioning, sequence optimization — these are AI's job, not the user's. The user says "generate a frame about security" and AI places it in the right cluster.
4. **Familiar patterns.** The sidebar tabs work like Canva. The floating toolbar works like Google Docs. The slash command works like Notion. Nothing novel for novelty's sake.
5. **Hide what's not needed.** Properties flyout only appears when relevant. Mini-map is collapsible. Sequence selector only shows when multiple sequences exist. Advanced frame settings (transition config, topic cluster) are in a collapsed "Advanced" section.
6. **Forgiving UX.** Undo/redo for everything. Auto-save. "Are you sure?" for destructive actions. AI suggestions are proposals, not automatic actions.

---

## Core Concept: Infinite Canvas with Frames

Zivo replaces the traditional linear slide deck with an **infinite zoomable canvas**. Content lives anywhere on a 2D plane. Presentations are not sequences of slides — they are **navigable spaces**.

### Key mental model

| Traditional slides | Zivo canvas |
|-------------------|-------------|
| Fixed-size pages in a sequence | Infinite 2D plane with content anywhere |
| Content belongs to a slide | Content exists on the canvas; frames define what's visible |
| Linear order (slide 1 → 2 → 3) | Sequences define paths through frames; multiple paths possible |
| Adding a slide = appending to list | Adding a frame = defining a new viewport region on the canvas |
| AI generates a new slide | AI creates content in a new canvas area and adds the frame to the sequence |
| Can't skip/reorder during session | Host can freely navigate; AI can reorder the sequence live |
| Isolated slides, no spatial context | Zoom out to see the big picture; related content clusters together |

### How it works

1. **Canvas** — An infinite 2D plane. Elements (text, images, interactive elements, etc.) are placed at absolute coordinates. Scroll and zoom freely.

2. **Frames** — Named rectangular regions on the canvas (like Figma frames). Each frame defines a viewport — what the audience sees at a given moment. Frames have a name, position, size, and optional background. Default aspect ratio is 16:9 but any size is allowed.

3. **Sequences** — Ordered lists of frame references. A sequence defines a path through the canvas. The "happy path" is the default sequence the presenter follows with Next/Previous. Multiple sequences can exist (e.g., "Technical Deep-Dive" vs. "Executive Overview") for the same canvas.

4. **Navigation** — During a live session, the presenter follows a sequence by default (Next/Previous advance through frames with smooth zoom+pan animation). The presenter can also zoom out and click any frame to jump there. AI can suggest jumps or reorder the active sequence in real-time.

5. **AI dynamics** — AI can create new content on the canvas, define a frame around it, and insert that frame into the sequence — all during a live session. AI can also reorder the sequence based on audience signals (priority rankings, interest pulse, scenario selections) without physically moving any content.

### Data model

```typescript
interface Presentation {
  id: string;
  title: string;
  description?: string;
  canvas: Canvas;
  settings: PresentationSettings;
  theme: PresentationTheme;
}

interface Canvas {
  elements: CanvasElement[];
  frames: Frame[];
  sequences: Sequence[];
  defaultSequenceId: string;
}

interface Frame {
  id: string;
  name: string;
  x: number;                    // absolute canvas coordinate
  y: number;
  width: number;
  height: number;
  background?: FrameBackground;
  notes?: string;
  transition?: FrameTransition; // animation config for entering this frame
  topicCluster?: string;        // AI-assigned topic grouping
}

interface FrameBackground {
  type: 'solid' | 'gradient' | 'image';
  value: string;                // hex color, CSS gradient, or image URL
}

interface FrameTransition {
  type: 'zoom-pan' | 'fade' | 'instant';
  durationMs?: number;          // default 800ms
}

interface Sequence {
  id: string;
  name: string;                 // "Main", "Technical Deep-Dive", "Executive Overview"
  frameIds: string[];           // ordered list of frame references
}

interface CanvasElement {
  id: string;
  type: CanvasElementType;      // all existing + new element types
  x: number;                    // absolute canvas coordinates
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  zIndex?: number;
  locked?: boolean;
  groupId?: string;             // for element grouping
  // ... element-specific configs (textConfig, imageConfig, quizConfig, etc.)
}
```

**Frame ↔ element relationship:** Elements don't "belong to" frames. They exist on the canvas. An element is visible within a frame if its bounding box intersects with the frame's bounding box. This means elements can span multiple frames (e.g., a large background diagram visible across several zoom levels).

**Interactive element constraint:** Max one interactive element per frame. Determined by which frame contains the element's center point.

### Migration from current slide model

The current slide-based data model maps cleanly:
- Each existing slide becomes a frame arranged in a horizontal grid (left-to-right)
- Each slide's elements get absolute coordinates based on their percentage positions within the frame
- Slide order becomes the default sequence
- No data loss — this is a structural transformation, not a lossy migration

---

## Phasing

### Phase 1: UX Excellence
Build the infinite canvas editor, new content elements, new interactive elements, and simplicity upgrades.

### Phase 2: Polished Deliverables
Turn every session into a tangible follow-up asset — an AI-generated executive brief.

### Phase 3: Intelligence Layer
Add the presenter copilot, auto-triggering AI steps, and AI-driven sequence management.

---

## Phase 1A: Canvas Editor (Canva-Style Sidebar)

### Problem
The current editor has a crowded toolbar (10+ actions in one row), a 20-item dropdown for inserting elements, a permanently visible properties panel eating 30% of screen width, no contextual editing, blind slide thumbnails, no AI assistance during editing, and a rigid slide-by-slide model that prevents spatial storytelling.

### Design

**Layout: Left sidebar tabs + infinite canvas + floating properties + contextual toolbar + mini-map**

```
┌──────────────────────────────────────────────────────────────┐
│  ←  │ Title input        │ ● Saved │ ↩ ↪ │      ▶ Present  │
├──┬──┴────────┬───────────────────────────────────────────────┤
│  │           │                                      ┌──────┐│
│🎬│  Tab      │    ┌─ floating toolbar ─┐            │mini- ││
│➕│  Content  │    │ B I U │ 16px │ 🎨  │            │ map  ││
│📋│  Panel    │    └────────────────────┘            └──────┘│
│✨│           │                                               │
│⚙│  (varies  │     ┌─frame─┐  ┌─frame─┐  ┌─frame─┐         │
│  │   by tab) │     │   1   │  │   2   │  │   3   │ ←canvas │
│  │           │     └───────┘  └───────┘  └───────┘         │
│  │           │              ┌─frame─┐                       │
│  │           │              │   4   │    ← AI-generated     │
│  │           │              └───────┘                       │
└──┴───────────┴───────────────────────────────────────────────┘
```

**Top bar (minimal):**
- Back button
- Title input (editable inline)
- Save status indicator (auto-save, green dot when clean)
- Undo / Redo buttons
- Sequence selector dropdown (when multiple sequences exist)
- Present button (primary action, right-aligned)

**Left sidebar — 5 icon tabs:**

| Tab | Icon | Contents |
|-----|------|----------|
| **Frames** | 🎬 | Frame thumbnails in sequence order with drag-to-reorder. Each thumbnail shows element-type badges (quiz, poll, AI step, etc.) and the frame name. Drag frames to reorder the active sequence. Right-click context menu for duplicate/delete/rename. "Add frame" button creates a new frame on the canvas (auto-positioned in the nearest available space). Double-click a frame thumbnail to zoom the camera to that frame. Sequence tabs at the top to switch between sequences. |
| **Elements** | ➕ | Visual grid of insertable elements organized by category. Search bar at top. Categories: **Text & Content** (Text, List, Stat Callout, Code Block), **Media** (Image, Video, Icon), **Layout** (Shape, Connector, Divider, Table), **Interactive** (Quiz, Poll, Thoughts, Rating, Evaluation, Discovery Form, Priority Ranker, Scenario Cards, Agentic Designer, AI Step), **Results & Special** (Quiz/Poll/Thoughts/Rating/Evaluation/Agentic Results, Leaderboard, Q&A, Spin Wheel). Click to add at camera center, or drag to position on canvas. Interactive elements are color-coded. Disabled state with "(max 1 per frame)" when the currently visible frame already has an interactive element. |
| **Templates** | 📋 | Browse frame templates (pre-designed frame layouts with content). Click to add as a new frame on the canvas. Includes built-in templates and user-saved templates. Save current frame as template option. |
| **AI** | ✨ | Context-aware AI editing chat. AI sees the entire canvas structure, the currently viewed frame, and all content. Quick action chips: "Generate a frame", "Add a poll", "Improve text", "Add image", "Suggest layout", "Create a sequence for [audience type]". Free-form text input for custom requests. AI can create new frames, modify elements, generate content, and suggest sequence reorderings. |
| **Configure** | ⚙ | Combined theme and settings panel. **Theme section:** background colors/gradients, font family, accent colors, dark/light mode. **Settings section:** presentation description, workflow config (system prompt, target), session settings, Interest Pulse toggle. |

**Infinite canvas:**
- Pan: scroll/drag on empty space, or middle-mouse button
- Zoom: pinch, Ctrl+scroll, or zoom controls in status bar (10%–400%)
- Frames appear as labeled rectangles on the canvas with a subtle border and name badge
- Elements outside any frame are still visible and editable — they're "floating" on the canvas
- Snap guides: elements snap to frame edges, other elements, and a configurable grid
- Grid overlay: optional dot grid for alignment (toggle in status bar)

**Mini-map (bottom-right corner):**
- Shows the entire canvas at a glance with all frames as small rectangles
- Current viewport highlighted
- Click on the mini-map to jump to that area
- Frame names visible when hovered
- Collapsible

**Properties flyout (replaces permanent right panel):**
- Hidden by default — canvas gets full width
- Slides in from the right when an element or frame is selected
- For elements: shows element-specific properties (text formatting, quiz config, AI step config, etc.)
- For frames: shows frame name, background, notes, transition config, topic cluster
- Close button (×) to dismiss manually, or auto-hides when clicking empty canvas
- Contains: type-specific properties, layer order controls, alignment controls, transform (rotation, opacity)

**Floating contextual toolbar:**
- Appears above/below the selected element on the canvas
- Content varies by element type:
  - **Text:** Bold, Italic, Underline | Font size | Preset (Title/Heading/Body/Caption) | Text color | Alignment
  - **Image:** Fit mode | Shadow | Border | Flip
  - **Shape:** Fill color | Border color | Border width
  - **Interactive elements:** A label showing the element type, click to open properties flyout
  - **Frame selected:** Frame name | Background color | Duplicate | Delete
- Disappears when deselected
- Positioned to avoid overlapping the element or going off-screen

**Slash (/) command palette:**
- Triggered by typing "/" on the canvas when no element is being edited
- Shows a searchable command list:
  - Insert elements: Text, Image, Quiz, Poll, Icon, Table, etc.
  - Frame actions: "New frame", "Duplicate frame", "Delete frame"
  - AI actions: "AI: Generate frame content", "AI: Add poll about...", "AI: Create sequence for..."
  - Navigation: "Go to frame [name]", "Zoom to fit all"
- Keyboard-navigable (arrow keys + Enter)

**Status bar (bottom):**
- Current frame name (if camera is inside a frame) or "Canvas view"
- Frame count: "Frame 3/12 in [sequence name]"
- Selection info (element type, position)
- Zoom controls (−, percentage, +, fit-to-view, fit-all-frames)
- Grid toggle
- Keyboard shortcuts button (?)

### Frame badges
Each frame thumbnail in the Frames tab shows small colored badges:
- Purple: "quiz"
- Teal: "poll"
- Blue: "thoughts"
- Orange: "rating"
- Indigo: "eval"
- Violet: "AI step"
- Cyan: "agentic"
- Green: "Q&A"

Frames with no interactive elements show no badges. This lets presenters see the "flow" of interactivity across the sequence at a glance.

### Frame creation and layout

**Default layout:** When creating a new presentation or generating frames with AI, frames are arranged in **topic clusters**. AI analyzes the content and groups related frames spatially (e.g., "Security" frames cluster together, "Architecture" frames nearby). Within each cluster, frames auto-arrange in a grid pattern.

**Manual repositioning:** Users can freely drag frames to any position on the canvas. When repositioning, a grid with snap guides helps align frames accurately. Frames can be any distance apart.

**Creating a new frame:**
- Click "Add frame" in the Frames tab → frame appears at the nearest available space on the canvas
- Drag from the Elements tab → new frame with that element pre-inserted
- AI tab → "Generate a frame about [topic]" → AI creates content and positions the frame near related content
- Right-click canvas → "New frame here" → frame at click position

### Key files affected
- `src/components/app/presentation/editor/PresentationEditor.tsx` — Major restructure for canvas model
- `src/components/app/presentation/editor/EditorToolbar.tsx` — Simplify to minimal top bar + sequence selector
- `src/components/app/presentation/editor/InsertMenu.tsx` — Replace with Elements tab panel
- `src/components/app/presentation/editor/PropertiesPanel.tsx` — Convert to flyout, add frame properties
- `src/components/app/presentation/editor/SlidePanel.tsx` → `FramesPanel.tsx` — Sequence-aware frame thumbnails with badges
- `src/components/app/presentation/editor/SlideCanvas.tsx` → `InfiniteCanvas.tsx` — Infinite pan/zoom with frame rendering
- `src/lib/types/presentation.ts` — New canvas/frame/sequence data model
- New: `src/components/app/presentation/editor/SidebarTabs.tsx`
- New: `src/components/app/presentation/editor/ElementsPanel.tsx`
- New: `src/components/app/presentation/editor/AIPanel.tsx`
- New: `src/components/app/presentation/editor/ConfigurePanel.tsx`
- New: `src/components/app/presentation/editor/FloatingToolbar.tsx`
- New: `src/components/app/presentation/editor/SlashCommand.tsx`
- New: `src/components/app/presentation/editor/MiniMap.tsx`
- New: `src/components/app/presentation/editor/FrameOverlay.tsx` — Frame name badge + border rendering on canvas
- New: `src/hooks/presentation/use-canvas-state.ts` — Replaces `use-editor-state.ts` with canvas-aware state
- New: `src/hooks/presentation/use-canvas-navigation.ts` — Pan, zoom, frame-aware camera

---

## Phase 1B: New Interactive Elements

Four new purpose-built elements that make common presales interaction patterns intuitive. All element outputs feed into downstream AI steps as structured context, using the same `loadInteractionResults` pipeline that existing elements use.

### 1. Discovery Form

**Purpose:** Flexible form builder for collecting structured participant data. Each participant fills out the form individually on their device. Host designs the form in the editor.

**Editor experience:**
- Host adds field types: dropdown, multi-select checklist, text input, number slider, radio buttons
- Each field has: label, placeholder/help text, options (for dropdown/checklist/radio), optional/required flag
- Drag to reorder fields
- Preview of how the form looks on mobile

**Player experience:**
- Clean mobile form — one section at a time or scrollable, depending on field count
- Progress indicator if more than 3 fields
- Submit button at the bottom
- Can edit responses until host advances

**Host view (live):**
- Aggregated summary of all responses
- For dropdowns/checklists: bar chart of selections
- For text: list of responses (anonymized or named based on settings)
- For sliders: distribution histogram
- Response count indicator

**Data output for AI steps:**
- Structured JSON: `{ fieldLabel: string, fieldType: string, responses: { playerId, playerName, value }[] }`
- Aggregated summary: `{ fieldLabel: string, summary: string }` (e.g., "Industry: 60% Financial Services, 40% Healthcare")

**Type definition:**
```typescript
interface DiscoveryFormField {
  id: string;
  type: 'dropdown' | 'multi-select' | 'text' | 'slider' | 'radio';
  label: string;
  placeholder?: string;
  helpText?: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
}

interface DiscoveryFormConfig {
  title: string;
  fields: DiscoveryFormField[];
  anonymousResponses?: boolean;
}
```

### 2. Priority Ranker

**Purpose:** Participants drag-and-drop items into their priority order. Produces a consensus ranking that AI uses to prioritize content and reorder sequences.

**Editor experience:**
- Host enters 3-7 items (text label + optional description per item)
- Configure ranking prompt ("Rank these challenges by urgency for your team")
- Optional: set a time limit

**Player experience:**
- Mobile-optimized drag-and-drop list
- Items snap into place with smooth animation
- Touch-friendly handles for dragging
- Clear visual feedback for current position (numbered 1, 2, 3...)

**Host view (live):**
- Animated consensus ranking that updates in real-time as votes arrive
- Each item shows a score bar representing its average rank position
- Bars shift and reorder as new rankings come in
- Response count indicator

**Data output for AI steps:**
- Consensus ranking: `{ items: { id, label, averageRank, voteCount }[], totalResponses: number }`
- Per-participant rankings available for detailed analysis
- AI can use rankings to reorder the active sequence (prioritize frames related to top-ranked items)

**Type definition:**
```typescript
interface PriorityRankerConfig {
  prompt: string;
  items: { id: string; label: string; description?: string }[];
  timeLimitSeconds?: number;
}
```

### 3. Scenario Cards

**Purpose:** Rich visual cards for selecting use cases, scenarios, or options. Replaces plain poll options with an immersive card-based selection.

**Editor experience:**
- Host creates 2-6 cards, each with: title, description, image (optional, supports AI image generation), tags (optional)
- Configure selection mode: "pick 1", "pick top 2", or "rank all"
- Cards rendered as a visual preview in the editor

**Player experience:**
- Tap-to-select card grid on mobile (2-column layout)
- Selected cards get a prominent highlight/checkmark
- Each card shows image (if present), title, description snippet, and tags
- For "rank all" mode: drag cards to reorder

**Host view (live):**
- Cards arranged by vote count, most popular first
- Each card shows vote count and percentage
- Live animation as votes come in
- Visual highlight on winning card(s)

**Data output for AI steps:**
- Selected scenarios with vote counts: `{ cards: { id, title, voteCount, percentage, rank? }[], selectionMode: string, totalResponses: number }`

**Type definition:**
```typescript
interface ScenarioCard {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  tags?: string[];
}

interface ScenarioCardsConfig {
  prompt: string;
  cards: ScenarioCard[];
  selectionMode: 'pick-1' | 'pick-n' | 'rank-all';
  maxSelections?: number;
}
```

### 4. Interest Pulse

**Purpose:** Persistent, lightweight engagement signal available on every frame (not a dedicated element). Captures structured interest data without interrupting the presentation flow.

**This is a presentation-level feature, not a per-frame element.**

**Player experience:**
- Small floating button at the bottom of the player screen, always visible
- Three signal types: "Interesting" (thumbs up), "Tell me more" (expand icon), "I have a question" (question mark)
- One tap to signal — no forms, no friction
- Subtle haptic/visual feedback on tap
- Can signal once per frame per signal type

**Host view:**
- Live engagement indicator in host overlay — pulse count for current frame
- Post-session: per-frame engagement metrics in analytics

**Data output for AI steps:**
- Aggregated per-frame: `{ frameId, interesting: number, tellMeMore: number, question: number, total: number }`
- AI can reference: "Frames 3 and 7 had the highest 'tell me more' signals"
- AI can use engagement data to suggest sequence reordering (spend more time on high-interest topics)

**Implementation:**
- Stored in `games/{gameId}/interestPulse/{frameId}` subcollection
- Player writes: `{ playerId, playerName, frameId, signal: 'interesting' | 'tell-me-more' | 'question', timestamp }`
- `loadInteractionResults` extended to include pulse data when building AI step context

**Configuration (presentation settings level):**
```typescript
interface InterestPulseSettings {
  enabled: boolean;
  signals?: ('interesting' | 'tell-me-more' | 'question')[];
}
```

---

## Phase 1C: Content Elements & Simplicity Upgrades

The current content toolkit (Text, Image, Shape, Connector) is too thin for building professional presales presentations. This phase adds 7 new content elements and 5 simplicity upgrades.

### New Content Elements

#### 1. Icon Element

Searchable icon picker using Lucide icons (already in the project). Set icon size, color, and optional background shape.

**Type definition:**
```typescript
interface IconConfig {
  iconName: string;
  iconColor: string;
  iconSize: number;
  backgroundShape?: 'none' | 'circle' | 'rounded-square';
  backgroundColor?: string;
}
```

#### 2. Stat / Number Callout

Big impactful numbers ("99.9% uptime", "3x faster", "$2.4M saved") with a label, optional prefix/suffix, accent color, and icon.

**Type definition:**
```typescript
interface StatCalloutConfig {
  value: string;
  label: string;
  prefix?: string;
  suffix?: string;
  accentColor?: string;
  iconName?: string;
  alignment?: 'left' | 'center' | 'right';
}
```

#### 3. List Element

Bullet/numbered/icon lists with consistent styling. Supports bullet styles: dot, checkmark, arrow, numbered, custom icon-per-item. Add/remove items inline.

**Type definition:**
```typescript
interface ListConfig {
  title?: string;
  items: { id: string; text: string; iconName?: string }[];
  bulletStyle: 'dot' | 'check' | 'arrow' | 'number' | 'icon';
  spacing: 'compact' | 'normal' | 'relaxed';
}
```

#### 4. Table / Comparison Grid

Feature comparison tables, pricing grids, capability matrices. Editable cells, add/remove rows and columns, header row/column styling, striped rows.

**Type definition:**
```typescript
interface TableConfig {
  rows: { id: string; cells: { id: string; content: string; align?: 'left' | 'center' | 'right' }[] }[];
  headerRow: boolean;
  headerColumn: boolean;
  borderColor?: string;
  headerBackgroundColor?: string;
  stripedRows?: boolean;
}
```

#### 5. Video / Embed

Embed YouTube, Loom, or Vimeo videos. Paste URL → auto-detect provider → render embed. Playable in presentation mode.

**Type definition:**
```typescript
interface VideoConfig {
  url: string;
  provider: 'youtube' | 'loom' | 'vimeo' | 'generic';
  embedUrl: string;
  thumbnailUrl?: string;
  autoplay?: boolean;
}
```

#### 6. Code Block

Syntax-highlighted code snippets. Language selector, dark/light theme, optional line numbers and filename header. Copy button in presentation mode.

**Type definition:**
```typescript
interface CodeBlockConfig {
  code: string;
  language: string;
  theme: 'dark' | 'light';
  showLineNumbers?: boolean;
  filename?: string;
}
```

#### 7. Divider

Horizontal or vertical line divider. Solid, dashed, or dotted. Configurable color and thickness.

**Type definition:**
```typescript
interface DividerConfig {
  orientation: 'horizontal' | 'vertical';
  style: 'solid' | 'dashed' | 'dotted';
  color: string;
  thickness: number;
}
```

### Simplicity Upgrades

#### 1. Text Style Presets
One-click presets: Title (32px bold), Heading (24px semibold), Body (16px regular), Caption (12px regular). Presets inherit from the theme. Additional: vertical alignment (top/middle/bottom), text box background color, letter spacing slider.

#### 2. Theme-Aware Color Picker
Shows theme colors first (primary, secondary, accent, background, text), recently used colors second, full hex/HSL picker expandable. Replaces raw color input across all elements.

#### 3. Image Element Upgrades
Drop shadow toggle, border (color + width), flip H/V, unified image source picker (Upload | URL | AI Generate tabs in one dialog).

#### 4. Shape Element Upgrades
New shapes: pentagon, hexagon, octagon, star, speech bubble, thought bubble, callout, banner, arrows (all directions), chevron, cross/plus. New properties: gradient fills, dashed/dotted borders, drop shadow.

#### 5. Smart Defaults & Quick Actions
Smart element positioning (auto-place in largest empty area within current frame). Smart duplicate (offset, not stacked). Element grouping (select multiple → group as one unit, move/resize/rotate together).

### Updated Elements tab categories

| Category | Elements |
|----------|----------|
| **Text & Content** | Text, List, Stat Callout, Code Block |
| **Media** | Image, Video, Icon |
| **Layout** | Shape, Connector, Divider, Table |
| **Interactive** | Quiz, Poll, Thoughts, Rating, Evaluation, Discovery Form, Priority Ranker, Scenario Cards, Agentic Designer, AI Step |
| **Results & Special** | Quiz/Poll/Thoughts/Rating/Evaluation/Agentic Results, Leaderboard, Q&A, Spin Wheel |

---

## Phase 2: Polished Deliverables — AI Executive Brief

### Problem
Current export is a markdown file. Presales teams need branded, polished PDF documents they can send to prospects as follow-up.

### Design

**Generation flow:**
1. Session ends → host navigates to analytics page
2. New "Generate Executive Brief" button on the analytics page
3. AI synthesizes all session data:
   - Discovery form responses (stakeholder context)
   - Priority rankings (what the room cares about)
   - Scenario selections (which use cases resonated)
   - Interest pulse signals (engagement patterns)
   - Q&A questions (concerns and interests)
   - AI step outputs (generated architectures, analyses)
   - Quiz/poll results
4. AI produces a structured 2-3 page executive summary
5. Host reviews and edits in a rich text editor
6. Export as branded PDF

**Brief structure:**
1. **Meeting Overview** — date, participants, session topic
2. **Key Findings** — AI-synthesized priorities, interests, and concerns from all interactions
3. **Recommended Solution** — based on scenario selections and AI step outputs, tailored to discovery context
4. **Discussion Points** — notable Q&A questions with responses (or flagged for follow-up)
5. **Suggested Next Steps** — AI-generated action items based on session signals
6. **Appendix** — detailed results from individual interactive elements (optional)

**Branding:**
- Host uploads company logo (stored in their profile)
- Color scheme derived from presentation theme
- Professional PDF layout with headers, footers, page numbers

**Key files:**
- New Cloud Function: `functions-ai/src/functions/generateExecutiveBrief.ts`
- New component: `src/components/app/presentation/analytics/ExecutiveBrief.tsx`
- New component: `src/components/app/presentation/analytics/BriefEditor.tsx`
- PDF generation: server-side using a library like `@react-pdf/renderer` or `puppeteer`

---

## Phase 3: Intelligence Layer

### 3A: Phone Companion

**Purpose:** A separate mobile-optimized view the host opens on their phone while presenting from their laptop. Provides AI coaching and audience signals invisible to prospects (since the host's laptop screen is shared/projected).

**Access:** Host gets a "Companion" link on the lobby screen. Opens in a mobile browser — no app install needed.

**What the companion shows:**

1. **Current Frame Info**
   - Frame name and position in sequence
   - Talking points generated by AI based on frame content and accumulated audience context
   - If the frame has an interactive element: live response count and summary

2. **Audience Signals Panel**
   - Interest Pulse summary for current frame (e.g., "5 interested, 2 want more")
   - Active Q&A question count with top-voted question preview
   - Overall engagement trend (rising/falling/steady)

3. **AI Suggestions**
   - Contextual nudges: "8/10 ranked 'security' as top priority — emphasize compliance on the next frame"
   - Question alerts: "3 questions about pricing queued — consider addressing before moving on"
   - Navigation suggestions: "Low interest on this topic — consider jumping to the Security cluster"
   - **Sequence reorder proposals:** "Based on priorities, I suggest: Security → Data Pipeline → Monitoring. Skip Governance. [Apply]"

4. **Quick Controls**
   - Previous / Next frame buttons
   - Jump-to-frame picker (list of all frames)
   - Pause timer (if active)
   - "Generate AI step" trigger for current frame

**Real-time sync:** Uses the same Firestore `onSnapshot` listeners as the player view. Companion subscribes to game state, interest pulse, Q&A, and workflow state documents.

**Key files:**
- New page: `src/app/host/presentation/companion/[gameId]/page.tsx`
- New component: `src/components/app/presentation/companion/CompanionView.tsx`
- New component: `src/components/app/presentation/companion/TalkingPoints.tsx`
- New component: `src/components/app/presentation/companion/AudienceSignals.tsx`

### 3B: Auto-Trigger AI Steps

**Purpose:** When the host navigates to a frame with an AI step, generation starts automatically — no manual "Generate" click needed.

**Configuration:**
- Per AI step element: `autoTrigger: boolean` (default: `false` for backward compatibility)
- Configurable in the AI Step properties panel

**Behavior:**
- When `autoTrigger` is `true` and the host navigates to the frame:
  - If never run: automatically calls `runAIStep`
  - If already run: shows existing output (host can manually re-trigger via "Regenerate")
  - Shows loading state on both host and player views during generation
- When `autoTrigger` is `false`: current manual behavior preserved

### 3C: AI Sequence Management

**Purpose:** AI dynamically reorders the active sequence and creates new frames based on accumulated audience signals. This is the payoff of the infinite canvas architecture — the presentation adapts its path, not just its content.

**Triggers for AI sequence adjustment:**
- After a Priority Ranker interaction: AI reorders remaining frames to prioritize topics matching top-ranked items
- After a Scenario Card selection: AI moves the winning scenario's deep-dive frame(s) to next in the sequence
- Interest Pulse accumulation: AI deprioritizes frames with low engagement, promotes high-engagement topics
- Host approval: sequence changes are proposed on the phone companion, host approves with one tap

**Dynamic frame creation:**
- After interactive elements generate insights, AI can create new content on the canvas:
  - "Based on your team's priorities, here's a custom architecture" → AI generates content, creates a frame, inserts it into the sequence
  - This leverages the existing `ai-step` infrastructure but at the canvas/frame level
- New frames appear on the canvas in the relevant topic cluster
- Host sees the new frame added to the sequence on the companion

**Implementation:**
- New Cloud Function: `functions-ai/src/functions/reorderSequence.ts` — takes audience signals, current sequence, frame metadata, and returns a proposed reordering
- Sequence changes written to `games/{gameId}/sequenceState` in Firestore
- Host companion UI shows proposed changes with approve/reject
- Player view unaffected — it just follows whatever frame the host navigates to

---

## Deferred (Future Phases)

| Feature | Rationale for deferral |
|---------|----------------------|
| **Impact/Effort Matrix** (full drag grid) | Needs high-quality mobile drag UX. Do it right or don't do it. |
| **Interactive Co-Creation elements** | Builds on Phase 1 foundation |
| **Template/preset library** | Useful but not a differentiator |
| **Multiple simultaneous sequences** | Core sequence management is Phase 3; multi-sequence editing is advanced |
| **CRM integration** | Explicitly deprioritized. Self-contained is a feature. |
| **Canvas sharing / collaboration** | Real-time multi-user editing of the same canvas |

---

## Success Criteria

1. A presales user can create a presentation on the infinite canvas with frames and interactive elements without reading documentation
2. The AI tab can generate new frames, modify content, and suggest sequences from natural language
3. Zoom out reveals the full canvas with topic clusters — the "big picture" of the presentation
4. Presenters can freely navigate between frames during a live session with smooth zoom+pan transitions
5. AI can propose sequence reorderings on the phone companion based on audience signals, and the host can apply them with one tap
6. Every session produces a PDF executive brief the host is proud to send to prospects
7. New interactive elements (Discovery Form, Priority Ranker, Scenario Cards, Interest Pulse) produce structured data that AI steps and sequence management can reference
8. New content elements (Icon, Stat, List, Table, Video, Code, Divider) and simplicity upgrades make it possible to build professional-looking presentations entirely within Zivo

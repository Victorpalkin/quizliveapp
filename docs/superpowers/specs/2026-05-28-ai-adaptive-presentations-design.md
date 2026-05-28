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

## Phasing

### Phase 1: UX Excellence
Build the foundation — a redesigned editor and purpose-built interactive elements that generate quality data for AI.

### Phase 2: Polished Deliverables
Turn every session into a tangible follow-up asset — an AI-generated executive brief.

### Phase 3: Intelligence Layer
Add the presenter copilot and auto-triggering AI steps that orchestrate the session seamlessly.

---

## Phase 1A: Editor Redesign (Canva-Style Sidebar)

### Problem
The current editor has a crowded toolbar (10+ actions in one row), a 20-item dropdown for inserting elements, a permanently visible properties panel eating 30% of screen width, no contextual editing, blind slide thumbnails, and no AI assistance during editing.

### Design

**Layout: Left sidebar tabs + floating properties + contextual toolbar**

```
┌──────────────────────────────────────────────────────────────┐
│  ←  │ Title input        │ ● Saved │ ↩ ↪ │      ▶ Present  │
├──┬──┴────────┬───────────────────────────────────────────────┤
│  │           │                                               │
│🗂│  Tab      │          ┌─ floating toolbar ─┐               │
│➕│  Content  │          │ B I U │ 16px │ 🎨  │               │
│📋│  Panel    │          └────────────────────┘               │
│✨│           │       ┌──────────────────────────┐   ┌──────┐│
│⚙│  (varies  │       │                          │   │Props ││
│  │   by tab) │       │     Canvas               │   │flyout││
│  │           │       │                          │   │      ││
│  │           │       └──────────────────────────┘   └──────┘│
└──┴───────────┴───────────────────────────────────────────────┘
```

**Top bar (minimal):**
- Back button
- Title input (editable inline)
- Save status indicator (auto-save, green dot when clean)
- Undo / Redo buttons
- Present button (primary action, right-aligned)
- Nothing else — all other actions move to sidebar tabs

**Left sidebar — 5 icon tabs:**

| Tab | Icon | Contents |
|-----|------|----------|
| **Slides** | 🗂 | Slide thumbnails with drag-to-reorder. Each thumbnail shows element-type badges (e.g., "quiz", "poll", "AI step") so the presentation flow is visible at a glance. Right-click context menu for duplicate/delete/add-after. |
| **Elements** | ➕ | Visual grid of insertable elements organized by category. Search bar at top. Categories: **Text & Content** (Text, List, Stat Callout, Code Block), **Media** (Image, Video, Icon), **Layout** (Shape, Connector, Divider, Table), **Interactive** (Quiz, Poll, Thoughts, Rating, Evaluation, Discovery Form, Priority Ranker, Scenario Cards, Agentic Designer, AI Step), **Results & Special** (Quiz/Poll/Thoughts/Rating/Evaluation/Agentic Results, Leaderboard, Q&A, Spin Wheel). Click to add at default position, or drag to position on canvas. Each element shows an icon and label. Interactive elements are color-coded. Disabled state with "(max 1 per slide)" hint when slide already has an interactive element. |
| **Templates** | 📋 | Browse slide templates. Click to apply to current slide or insert as new slide. Includes built-in templates and user-saved templates. Save current slide as template option at the bottom. |
| **AI** | ✨ | Context-aware AI editing chat. AI sees the current slide content and full presentation structure. Quick action chips at the top: "Generate slide", "Add a poll", "Improve text", "Add image", "Suggest layout". Free-form text input below for custom requests. AI can modify elements, add new elements, rewrite text, generate quiz/poll questions, and suggest layouts. |
| **Configure** | ⚙ | Combined theme and settings panel. **Theme section:** background colors/gradients, font family, accent colors, dark/light mode. **Settings section:** presentation description, workflow config (system prompt, target), session settings. This replaces the current separate Theme selector, Settings dialog, and description input. |

**Properties flyout (replaces permanent right panel):**
- Hidden by default — canvas gets full width
- Slides in from the right when an element is selected
- Shows the same element-specific properties as today (text formatting, quiz config, AI step config, etc.)
- Close button (×) to dismiss manually, or auto-hides when clicking empty canvas
- Contains: element-specific properties, layer order controls, alignment controls, transform (rotation, opacity)
- When no element is selected and flyout is closed, canvas uses the full remaining width

**Floating contextual toolbar:**
- Appears above/below the selected element on the canvas
- Content varies by element type:
  - **Text:** Bold, Italic, Underline | Font size | Text color | Alignment
  - **Image:** Fit mode | Border | Opacity
  - **Shape:** Fill color | Border color | Border width
  - **Interactive elements:** A label showing the element type, click to open properties flyout
- Disappears when element is deselected
- Positioned to avoid overlapping the element or going off-screen

**Slash (/) command palette:**
- Triggered by typing "/" on the canvas when no element is being edited
- Shows a searchable command list: Insert Text, Insert Image, Insert Quiz, Insert Poll, etc.
- Also includes actions: "AI: Generate slide content", "AI: Add poll about...", "Duplicate slide", "Delete slide"
- Keyboard-navigable (arrow keys + Enter)
- Inspired by Notion's slash command — familiar to tech-savvy presales users

**Status bar (bottom):**
- Slide position (e.g., "Slide 3/12")
- Selection info (element type, position)
- Zoom controls (−, percentage, +, fit-to-view)
- Keyboard shortcuts button (?)

### Slide badges
Each slide thumbnail in the Slides tab shows small colored badges indicating which interactive element types are present:
- Purple badge: "quiz"
- Teal badge: "poll"
- Blue badge: "thoughts"
- Orange badge: "rating"
- Indigo badge: "eval"
- Violet badge: "AI step"
- Cyan badge: "agentic"
- Green badge: "Q&A"

Slides with no interactive elements show no badges. This lets presenters see the "flow" of interactivity across the deck at a glance.

### Key files affected
- `src/components/app/presentation/editor/PresentationEditor.tsx` — Main layout restructure
- `src/components/app/presentation/editor/EditorToolbar.tsx` — Simplify to minimal top bar
- `src/components/app/presentation/editor/InsertMenu.tsx` — Replace dropdown with Elements tab panel
- `src/components/app/presentation/editor/PropertiesPanel.tsx` — Convert to flyout behavior
- `src/components/app/presentation/editor/SlidePanel.tsx` — Add badges, integrate into sidebar tab
- New: `src/components/app/presentation/editor/SidebarTabs.tsx` — Tab container + icon rail
- New: `src/components/app/presentation/editor/ElementsPanel.tsx` — Visual element grid
- New: `src/components/app/presentation/editor/AIPanel.tsx` — AI chat interface
- New: `src/components/app/presentation/editor/ConfigurePanel.tsx` — Theme + settings combined
- New: `src/components/app/presentation/editor/FloatingToolbar.tsx` — Contextual element toolbar
- New: `src/components/app/presentation/editor/SlashCommand.tsx` — Command palette

---

## Phase 1C: Content Elements & Simplicity Upgrades

The current content toolkit (Text, Image, Shape, Connector) is too thin for building professional presales slides. This phase adds 7 new content elements and 5 simplicity upgrades to existing elements.

### New Content Elements

#### 1. Icon Element

Presales decks use icons everywhere — cloud, security, database, AI, API, users, charts. Instead of importing images for every icon, add a dedicated icon element with a searchable library using Lucide icons (already a project dependency).

**Editor experience:**
- Insert icon → opens searchable icon picker (Lucide's 1500+ icons)
- Set icon size (16-256px), color (theme-aware picker), and optional background circle/square
- Icon renders as SVG — crisp at any size

**Type definition:**
```typescript
interface IconConfig {
  iconName: string;         // Lucide icon name
  iconColor: string;
  iconSize: number;         // px
  backgroundShape?: 'none' | 'circle' | 'rounded-square';
  backgroundColor?: string;
}
```

**Key files:**
- New: `src/components/app/presentation/editor/elements/IconElement.tsx`
- New: `src/components/app/presentation/editor/properties/IconProperties.tsx`
- New: `src/components/app/presentation/editor/IconPicker.tsx` — searchable icon grid

#### 2. Stat / Number Callout

Big impactful numbers: "99.9% uptime", "3x faster", "$2.4M saved". A dedicated element with a large number, label text below, and optional accent color/icon. Looks polished without manual text sizing.

**Editor experience:**
- Insert stat → pre-styled with a large number and label
- Edit: number/value text (large), label text (smaller below), optional prefix/suffix, accent color
- Optional icon above the number

**Type definition:**
```typescript
interface StatCalloutConfig {
  value: string;            // "99.9%", "$2.4M", "3x"
  label: string;            // "Uptime", "Saved", "Faster"
  prefix?: string;          // "$", ">"
  suffix?: string;          // "%", "x", "+"
  accentColor?: string;
  iconName?: string;        // optional Lucide icon above
  alignment?: 'left' | 'center' | 'right';
}
```

**Key files:**
- New: `src/components/app/presentation/editor/elements/StatCalloutElement.tsx`
- New: `src/components/app/presentation/editor/properties/StatCalloutProperties.tsx`

#### 3. List Element

Bullet lists with icons, checkmarks, or numbered. Currently you'd use a plain text element and manually type bullets. A proper list element auto-formats with icon bullets, consistent spacing, and easy add/remove.

**Editor experience:**
- Insert list → starts with 3 items, editable inline
- Choose bullet style: dot, checkmark, arrow, numbered, custom icon-per-item
- Add/remove items with + button or Enter key
- Consistent spacing and indentation handled automatically
- Optional title above the list

**Type definition:**
```typescript
interface ListConfig {
  title?: string;
  items: { id: string; text: string; iconName?: string }[];
  bulletStyle: 'dot' | 'check' | 'arrow' | 'number' | 'icon';
  spacing: 'compact' | 'normal' | 'relaxed';
}
```

**Key files:**
- New: `src/components/app/presentation/editor/elements/ListElement.tsx`
- New: `src/components/app/presentation/editor/properties/ListProperties.tsx`

#### 4. Table / Comparison Grid

Feature comparison tables, pricing grids, capability matrices. Essential for presales — "us vs. competitor" or "plan comparison" slides.

**Editor experience:**
- Insert table → starts with 3x3 grid
- Click any cell to edit inline
- Add/remove rows and columns via + buttons on edges
- Toggle header row/column styling (bold, accent background)
- Resize column widths by dragging borders
- Cell text alignment (left/center/right per column)

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

**Key files:**
- New: `src/components/app/presentation/editor/elements/TableElement.tsx`
- New: `src/components/app/presentation/editor/properties/TableProperties.tsx`

#### 5. Video / Embed

Embed YouTube, Loom, or Vimeo videos directly on slides. Paste a URL, it renders as a playable embed.

**Editor experience:**
- Insert video → paste URL input
- Auto-detects provider (YouTube, Loom, Vimeo) and extracts embed URL
- Shows thumbnail preview in editor
- In presentation mode: renders as playable iframe embed
- Optional: border radius, drop shadow

**Supported providers:**
- YouTube (youtube.com, youtu.be)
- Loom (loom.com/share)
- Vimeo (vimeo.com)
- Generic iframe URL fallback

**Type definition:**
```typescript
interface VideoConfig {
  url: string;
  provider: 'youtube' | 'loom' | 'vimeo' | 'generic';
  embedUrl: string;          // computed from url
  thumbnailUrl?: string;
  autoplay?: boolean;
}
```

**Key files:**
- New: `src/components/app/presentation/editor/elements/VideoElement.tsx`
- New: `src/components/app/presentation/editor/properties/VideoProperties.tsx`

#### 6. Code Block

Syntax-highlighted code snippets for technical presales. Show API calls, configuration examples, SDK usage.

**Editor experience:**
- Insert code block → opens code editor area
- Language selector dropdown (Python, JavaScript, TypeScript, JSON, YAML, SQL, Bash, Go, Java, etc.)
- Syntax highlighting via a lightweight library (e.g., Prism.js or Shiki)
- Theme: dark or light background
- Optional: line numbers, filename header
- In presentation mode: copy-to-clipboard button

**Type definition:**
```typescript
interface CodeBlockConfig {
  code: string;
  language: string;
  theme: 'dark' | 'light';
  showLineNumbers?: boolean;
  filename?: string;          // shown as a tab/header above the code
}
```

**Key files:**
- New: `src/components/app/presentation/editor/elements/CodeBlockElement.tsx`
- New: `src/components/app/presentation/editor/properties/CodeBlockProperties.tsx`

#### 7. Divider

Simple horizontal or vertical line divider. Basic layout helper.

**Editor experience:**
- Insert divider → horizontal line at default position
- Properties: orientation (horizontal/vertical), style (solid/dashed/dotted), color, thickness (1-8px)
- Snap to slide edges and other elements

**Type definition:**
```typescript
interface DividerConfig {
  orientation: 'horizontal' | 'vertical';
  style: 'solid' | 'dashed' | 'dotted';
  color: string;
  thickness: number;
}
```

**Key files:**
- New: `src/components/app/presentation/editor/elements/DividerElement.tsx`
- New: `src/components/app/presentation/editor/properties/DividerProperties.tsx`

### Simplicity Upgrades to Existing Elements

#### 1. Text Style Presets

Replace manual font size + weight + color configuration with one-click presets that inherit from the presentation theme.

**Presets:**
| Preset | Size | Weight | Use case |
|--------|------|--------|----------|
| Title | 32px | Bold | Slide titles |
| Heading | 24px | Semibold | Section headers |
| Body | 16px | Regular | Main content |
| Caption | 12px | Regular | Fine print, labels |

**Additional text improvements:**
- Bullet/numbered list toggle within text elements (basic list formatting without needing the List element)
- Vertical alignment within text box: top, middle, bottom
- Text box background color with padding
- Letter spacing slider

**Implementation:**
- Add preset selector to `TextProperties.tsx` (dropdown or button group at the top)
- Presets read from the presentation theme — changing the theme updates all preset-styled text
- Add `textPreset?: 'title' | 'heading' | 'body' | 'caption'` and `verticalAlign?: 'top' | 'middle' | 'bottom'` and `backgroundColor?: string` fields to text element type

#### 2. Theme-Aware Color Picker

Replace the raw hex color input across all elements with a smarter picker.

**Layout:**
1. **Theme colors row** (top) — primary, secondary, accent, background, text colors from the presentation theme. One click to apply.
2. **Recently used colors** — last 8 colors used in this presentation.
3. **Full color picker** — expandable section with the standard hex/HSL picker. Available but not the default view.

**Implementation:**
- New shared component: `src/components/app/presentation/editor/ThemeColorPicker.tsx`
- Replace all `ColorPicker` usages in properties panels with `ThemeColorPicker`
- Theme colors derived from `PresentationTheme` type

#### 3. Image Element Upgrades

**New properties:**
- **Drop shadow** toggle (subtle box shadow preset, not a complex shadow editor)
- **Border** — color + width (1-8px)
- **Flip** — horizontal and vertical flip buttons
- **Unified image source picker** — when clicking an empty image placeholder, show a single dialog with 3 tabs: Upload, URL, AI Generate (instead of 3 separate inputs in the properties panel)

**Implementation:**
- Add `shadow?: boolean`, `borderColor?: string`, `borderWidth?: number`, `flipH?: boolean`, `flipV?: boolean` to image element type
- New: `src/components/app/presentation/editor/ImageSourcePicker.tsx` — tabbed dialog for upload/URL/AI

#### 4. Shape Element Upgrades

**New shapes (in addition to existing 7):**
- Pentagon, Hexagon, Octagon
- Star (5-point)
- Speech bubble, Thought bubble
- Callout (rectangular with pointer)
- Banner/ribbon
- Arrows: up, down, left (currently only right)
- Chevron
- Cross/plus

**New properties:**
- Gradient fills — two-color linear gradient with angle selector
- Dashed/dotted border styles (currently solid only)
- Drop shadow toggle

**Implementation:**
- Expand `shapeType` union in types
- Add `fillGradient?: { color1: string; color2: string; angle: number }` and `borderStyle?: 'solid' | 'dashed' | 'dotted'` and `shadow?: boolean` to shape element type
- Expand `ShapeElement.tsx` with new SVG/clipPath definitions

#### 5. Smart Defaults & Quick Actions

**Smart element positioning:**
- When adding an element, auto-position based on existing elements on the slide:
  - If slide is empty: center the element
  - If slide has elements: place new element in the largest empty area
  - Text defaults to sensible width (60% of slide) not tiny
- Configurable in element insertion logic in `useEditorState`

**Smart duplicate:**
- Duplicate places the copy offset by ~2% down and right (not stacked exactly on top)
- Already partially implemented — ensure consistent behavior

**Element grouping:**
- Select multiple elements → "Group" action in context menu / floating toolbar
- Grouped elements move, resize, and rotate as one unit
- "Ungroup" to break apart
- Groups can be nested

**Implementation:**
- Add `groupId?: string` field to element type
- New: group selection/movement logic in `useEditorState`
- Add Group/Ungroup to context menu in `SlideCanvas.tsx`

### Updated Elements tab categories

With the new content elements, the Elements tab in the sidebar should organize as:

| Category | Elements |
|----------|----------|
| **Text & Content** | Text, List, Stat Callout, Code Block |
| **Media** | Image, Video, Icon |
| **Layout** | Shape, Connector, Divider, Table |
| **Interactive** | Quiz, Poll, Thoughts, Rating, Evaluation, Discovery Form, Priority Ranker, Scenario Cards, Agentic Designer, AI Step |
| **Results & Special** | Quiz Results, Poll Results, Thoughts Results, Rating Results, Evaluation Results, Agentic Designer Results, Leaderboard, Q&A, Spin Wheel |

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

**Type definition additions to `src/lib/types/presentation.ts`:**
```typescript
interface DiscoveryFormField {
  id: string;
  type: 'dropdown' | 'multi-select' | 'text' | 'slider' | 'radio';
  label: string;
  placeholder?: string;
  helpText?: string;
  options?: string[];        // for dropdown, multi-select, radio
  min?: number;              // for slider
  max?: number;              // for slider
  step?: number;             // for slider
  required?: boolean;
}

interface DiscoveryFormConfig {
  title: string;
  fields: DiscoveryFormField[];
  anonymousResponses?: boolean;
}
```

### 2. Priority Ranker

**Purpose:** Participants drag-and-drop items into their priority order. Produces a consensus ranking that AI uses to prioritize content.

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
  maxSelections?: number;  // for pick-n mode
}
```

### 4. Interest Pulse

**Purpose:** Persistent, lightweight engagement signal available on every slide (not a dedicated slide element). Captures structured interest data without interrupting the presentation flow.

**This is a presentation-level feature, not a per-slide element.**

**Player experience:**
- Small floating button at the bottom of the player screen, always visible during presentation
- Three signal types: "Interesting" (thumbs up), "Tell me more" (expand icon), "I have a question" (question mark)
- One tap to signal — no forms, no friction
- Subtle haptic/visual feedback on tap
- Can signal multiple times across different slides (one signal per slide per type)

**Host view:**
- Live engagement heatmap in the host overlay — small indicator showing pulse count for current slide
- Post-session: per-slide engagement metrics visible in analytics

**Data output for AI steps:**
- Aggregated per-slide: `{ slideId, interesting: number, tellMeMore: number, question: number, total: number }`
- AI can reference: "Slides 3 and 7 had the highest 'tell me more' signals — the audience wants deeper content on these topics"

**Implementation:**
- Stored in `games/{gameId}/interestPulse/{slideId}` subcollection
- Player writes: `{ playerId, playerName, slideId, signal: 'interesting' | 'tell-me-more' | 'question', timestamp }`
- `loadInteractionResults` in `functions-ai/` extended to include pulse data when building AI step context

**Configuration (presentation settings level):**
```typescript
interface InterestPulseSettings {
  enabled: boolean;
  signals?: ('interesting' | 'tell-me-more' | 'question')[];  // defaults to all three
}
```

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

**Access:** Host gets a "Companion" link on the lobby screen (or in the present view's settings menu). Opens in a mobile browser — no app install needed.

**What the companion shows:**

1. **Current Slide Info**
   - Slide number and title
   - Talking points generated by AI based on slide content and accumulated audience context
   - If the slide has an interactive element: live response count and summary

2. **Audience Signals Panel**
   - Interest Pulse summary for current slide (e.g., "5 interested, 2 want more")
   - Active Q&A question count with top-voted question preview
   - Overall engagement trend (rising/falling/steady)

3. **AI Suggestions**
   - Contextual nudges: "8/10 ranked 'security' as top priority — emphasize compliance on the next slide"
   - Question alerts: "3 questions about pricing queued — consider addressing before moving on"
   - Skip/depth suggestions: "Low interest on this topic — consider skipping to slide 9"

4. **Quick Controls**
   - Previous / Next slide buttons
   - Pause timer (if active)
   - "Generate AI step" trigger for current slide

**Real-time sync:** Uses the same Firestore `onSnapshot` listeners as the player view. Companion subscribes to game state, interest pulse, Q&A, and workflow state documents.

**Key files:**
- New page: `src/app/host/presentation/companion/[gameId]/page.tsx`
- New component: `src/components/app/presentation/companion/CompanionView.tsx`
- New component: `src/components/app/presentation/companion/TalkingPoints.tsx`
- New component: `src/components/app/presentation/companion/AudienceSignals.tsx`
- New Cloud Function (or client-side AI call): generate talking points per slide

### 3B: Auto-Trigger AI Steps

**Purpose:** When the host advances to a slide with an AI step, generation starts automatically — no manual "Generate" click needed.

**Configuration:**
- Per AI step element: `autoTrigger: boolean` (default: `false` for backward compatibility)
- Configurable in the AI Step properties panel in the editor

**Behavior:**
- When `autoTrigger` is `true` and the host navigates to the slide:
  - If the AI step has never been run for this slide: automatically calls `runAIStep`
  - If the AI step has already been run: shows existing output (host can manually re-trigger via "Regenerate" button)
  - Shows a loading state on both host and player views during generation
- When `autoTrigger` is `false`: current manual behavior preserved

**Implementation:**
- In `PresentationHost.tsx` or the host game hook: detect slide change, check if current slide has an AI step with `autoTrigger: true`, and call `runAIStep` if no output exists for this slide yet
- Add `autoTrigger` field to `AIStepConfig` type

---

## Deferred (Future Phases)

| Feature | Rationale for deferral |
|---------|----------------------|
| **Impact/Effort Matrix** (full drag grid) | Needs high-quality mobile drag UX. Do it right or don't do it. |
| **Interactive Co-Creation elements** | Phase 2 direction — builds on Phase 1 foundation |
| **Template/preset library** | Useful but not a differentiator. Can be added once core UX is solid. |
| **Adaptive slide reordering** | Requires presentation-level AI orchestration — complex, Phase 3+ |
| **Dynamic slide injection** | AI adding slides mid-session — needs careful UX design |
| **CRM integration** | Explicitly deprioritized. Self-contained is a feature. |

---

## Success Criteria

1. A presales user can create a presentation with interactive elements without reading documentation
2. The AI tab in the editor can modify slide content from natural language instructions
3. Every session produces a PDF executive brief the host is proud to send to prospects
4. The phone companion provides useful AI suggestions that the host actually references during sessions
5. AI steps auto-trigger seamlessly without latency breaking the presentation flow
6. New interactive elements (Discovery Form, Priority Ranker, Scenario Cards, Interest Pulse) produce structured data that AI steps can reference

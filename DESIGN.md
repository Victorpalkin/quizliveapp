# gQuiz Design System

**Design Philosophy**: Minimalist, Apple-inspired aesthetic with clean cards, subtle gradients, and sophisticated typography. Completely distinct from Kahoot's colorful game-show aesthetic.

---

## Color Palette

### Light Theme
```css
Background:       #FFFFFF (Pure white)
Foreground:       #171717 (Nearly black)
Card:             #FFFFFF (White)
Card Border:      #EDEDED (Subtle gray)
Muted:            #F5F5F5 (Light gray backgrounds)
Muted Foreground: #737373 (Medium gray text)
```

### Dark Theme
```css
Background:       #1A1F2C (Deep blue-gray)
Foreground:       #FAFAFA (Off-white)
Card:             #242A38 (Dark card)
Card Border:      #3A4150 (Lighter border)
Muted:            #2A3142 (Dark gray backgrounds)
Muted Foreground: #A6A6A6 (Light gray text)
```

### Accent Colors
```css
Primary:          #9333EA (Purple)
Accent Gradient:  #9333EA → #D946EF (Purple to Pink)
```

Used **only** for:
- Selected states
- Focus indicators
- CTAs (Call to Action buttons)
- Progress indicators

**NOT used for:**
- Answer buttons (they are white/dark cards)
- Large backgrounds
- Decorative elements

---

## Typography

### Font Family
**Primary**: Space Grotesk (geometric sans-serif)

### Scale
```
Display:   48px / 3rem   (font-semibold)  - Hero headlines
Headline:  32px / 2rem   (font-semibold)  - Section titles
Title:     24px / 1.5rem (font-semibold)  - Card titles
Body:      18px / 1.125rem (font-normal) - Standard text
Small:     14px / 0.875rem (font-normal) - Helper text
```

### Line Height
```
Tight:    1.2  - Display text
Normal:   1.5  - Body text
Relaxed:  1.75 - Long-form content
```

### Weights
```
Normal:    400 - Body text
Semibold:  600 - Headlines, emphasis
Bold:      700 - Rare, only for strong emphasis
```

---

## Spacing System

Based on 4px base unit:

```
xs:  4px  (0.25rem)  - Tight spacing
sm:  8px  (0.5rem)   - Small gaps
md:  16px (1rem)     - Default spacing
lg:  24px (1.5rem)   - Section spacing
xl:  32px (2rem)     - Large sections
2xl: 48px (3rem)     - Page sections
3xl: 64px (4rem)     - Major sections
```

### Component Spacing
```
Card Padding:      24px (p-6)
Button Padding:    16px 24px (px-6 py-4)
Grid Gap:          24px (gap-6)
Section Margins:   48px (my-12)
```

---

## Shadows

### Elevation Levels
```
sm:  0 1px 2px rgba(0, 0, 0, 0.05)          - Subtle depth
md:  0 4px 6px rgba(0, 0, 0, 0.07)          - Standard cards
lg:  0 10px 15px rgba(0, 0, 0, 0.1)         - Elevated cards
xl:  0 20px 25px rgba(0, 0, 0, 0.15)        - Floating elements
```

### Usage
```
Cards (rest):    shadow-md
Cards (hover):   shadow-lg
Modals:          shadow-xl
Dropdowns:       shadow-lg
```

---

## Border Radius

```
sm:   8px  (0.5rem)  - Small buttons, tags
md:   12px (0.75rem) - Standard buttons
lg:   16px (1rem)    - Cards
xl:   24px (1.5rem)  - Large cards
2xl:  32px (2rem)    - Hero sections
full: 9999px         - Pills, badges
```

---

## Components

### Answer Button

**Design**: Minimalist card with letter badge

```tsx
<button className="
  w-full p-6 rounded-xl
  bg-card border border-card-border
  shadow-md hover:shadow-lg
  transition-all duration-300
  hover:scale-[1.02]
  data-[selected=true]:border-l-4
  data-[selected=true]:border-gradient-to-b
  data-[selected=true]:from-[#9333EA]
  data-[selected=true]:to-[#D946EF]
">
  <div className="flex items-center gap-4">
    <div className="text-2xl font-semibold text-muted-foreground">
      {letter}
    </div>
    <div className="text-lg font-normal text-left">
      {answerText}
    </div>
  </div>
</button>
```

**States:**
- **Rest**: White/dark card, subtle shadow
- **Hover**: Scale 1.02, larger shadow
- **Selected**: Gradient left border (4px thick)
- **Disabled**: Opacity 50%

### Card

**Design**: Clean container with subtle border

```tsx
<div className="
  bg-card
  border border-card-border
  rounded-2xl
  shadow-md
  p-6
">
  {content}
</div>
```

### Button (Primary CTA)

```tsx
<button className="
  px-6 py-4
  bg-gradient-to-r from-[#9333EA] to-[#D946EF]
  text-white
  rounded-xl
  font-semibold
  transition-all duration-300
  hover:scale-[1.02]
  hover:shadow-lg
  active:scale-[0.98]
">
  {label}
</button>
```

### Circular Timer

**Design**: SVG-based progress ring

```
Size:      64px × 64px
Stroke:    4px
Color:     Gradient (purple → pink → orange as time runs out)
Position:  Top-right corner (player), top-left (host)
Animation: Smooth stroke-dasharray transition
```

---

## Animations

### Duration
```
Fast:     200ms - Micro-interactions
Standard: 300ms - Default transitions
Slow:     500ms - Page transitions
```

### Easing
```
Default:  cubic-bezier(0.4, 0, 0.2, 1)  - Smooth ease-out
Bounce:   cubic-bezier(0.68, -0.55, 0.27, 1.55) - Playful bounce
```

### Hover States
```
Scale:    1.02 (subtle, not 1.05)
Shadow:   md → lg
Opacity:  100% → 90% (for disabled-looking states)
```

### Focus States
```
Ring:     2px gradient border
Offset:   2px
```

---

## Layout Patterns

### Answer Grid

**Mobile** (< 768px):
```
Layout: Single column vertical stack
Gap:    12px
```

**Tablet+** (≥ 768px):
```
Layout: 2 columns
Gap:    16px
Max Width: 1024px (4xl)
```

### Question Screen Structure
```
Header (Question Text)
  ↓
Main Content Area (Answers)
  ↓
Footer (Question Counter)
```

### Card Layouts
```
Max Width:
  - Small cards: 448px (sm)
  - Medium cards: 672px (2xl)
  - Large cards: 896px (4xl)

Padding:
  - Mobile: 16px (p-4)
  - Desktop: 24px (p-6)
```

---

## Accessibility

### Color Contrast
- Text on background: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

### Focus Indicators
- Always visible
- 2px gradient border
- Never rely on color alone

### Interactive Targets
- Minimum size: 44×44px
- Adequate spacing between targets

### Keyboard Navigation
- Tab order follows visual flow
- Focus visible at all times
- Escape closes modals

---

## Do's and Don'ts

### ✅ Do
- Use whitespace generously
- Keep typography hierarchical and clean
- Use subtle shadows for depth
- Gradient accents on interactions only
- Maintain consistent spacing
- Use letter badges (A, B, C, D) for answers

### ❌ Don't
- Use bright solid colors for answer buttons
- Use geometric shape icons in answers
- Create cluttered layouts with minimal spacing
- Use aggressive animations (scale > 1.05)
- Mix different border radius values
- Overuse gradients (only for accents)

---

## Theme Switching

### Implementation
```tsx
import { ThemeProvider } from 'next-themes'

// In layout
<ThemeProvider attribute="class" defaultTheme="system">
  {children}
</ThemeProvider>
```

### Toggle Component
Sun/Moon icons with smooth transition

### Persistence
Theme preference saved to localStorage

---

## Future Guidelines

When adding new features:

1. **Check this document first** for existing patterns
2. **Use design tokens** (CSS variables) not hardcoded values
3. **Test in both themes** (light and dark)
4. **Maintain spacing system** (use defined values)
5. **Keep it minimal** - when in doubt, remove elements
6. **Accessibility first** - always consider WCAG guidelines

---

_Last updated: 2025-11-19_
_Version: 1.0 - Minimalist Redesign_

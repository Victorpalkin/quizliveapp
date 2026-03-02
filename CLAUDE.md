# Zivo - Agent Guidelines

## Project Overview
Zivo is a real-time audience engagement platform (Next.js 15, TypeScript, Firebase, Tailwind/shadcn).

## Architecture
- **Frontend**: Next.js App Router, React hooks for state management
- **Backend**: Firebase (Firestore, Auth, Storage, Cloud Functions)
- **AI Functions**: Separate `functions-ai/` package (Vertex AI/Gemini)
- **Styling**: Tailwind CSS + shadcn/ui components

## Key Conventions
- Activity types: quiz, poll, presentation, thoughts-gathering, evaluation
- Each activity has: host pages (`src/app/host/{type}/`), player pages (`src/app/play/{type}/`), and shared components
- Custom hooks pattern for game logic (state machines, timers, answer submission)
- Server-side scoring via Cloud Functions (never trust client)
- Real-time sync via Firestore onSnapshot listeners

## File Organization
- `src/app/` - Next.js pages (App Router)
- `src/components/app/` - App-specific components
- `src/components/ui/` - shadcn/ui primitives (don't modify)
- `src/firebase/` - Firebase hooks and config
- `src/hooks/` - Shared hooks
- `src/lib/` - Types, utils, constants
- `functions/` - Firebase Cloud Functions
- `functions-ai/` - AI Cloud Functions

## Rules
1. All scoring must happen server-side in Cloud Functions
2. Use Firestore security rules for access control
3. Follow the question handler registry pattern for new question types
4. Use existing UI components from `src/components/ui/` before creating new ones
5. Keep pages under 500 lines - extract sub-components
6. Use `src/lib/types.ts` for all shared TypeScript interfaces
7. No `console.log` in production code - use `src/lib/error-logging.ts`
8. Test with both light and dark themes
9. Mobile-first responsive design

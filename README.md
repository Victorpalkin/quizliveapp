# Zivo

Zivo is an interactive, real-time audience engagement platform that allows users to host live sessions including quizzes, interest clouds, and prioritization rankings. Players join and participate from their own devices. Built with Next.js, Firebase, and TypeScript.

## Features

### Host Features

- **Secure Authentication**: Email/password sign-in for hosts
- **Quiz Creation**: Multiple question types (single-choice, multiple-choice, slider, slide, polls)
- **AI Quiz Generation**: Generate quiz questions from topics using Gemini 3 Pro
- **AI Image Generation**: Generate question images with AI, with preview and regenerate options
- **Image/GIF Uploads**: Add visual content to questions (up to 5MB)
- **Configurable Time Limits**: 10, 20, 30, or 60 seconds per question
- **Live Game Hosting**: Unique game PINs with QR codes for easy joining
- **Real-time Management**: See players join, track answers, view live leaderboards
- **Quiz Sharing**: Share quizzes with other hosts via email

### Player Features

- **Quick Join**: Enter game PIN or scan QR code to join instantly
- **Synchronized Gameplay**: Questions appear when host is ready
- **Speed-Based Scoring**: Points based on correctness and answer speed
- **Instant Feedback**: See correct/incorrect status and points earned
- **Live Leaderboards**: Track your ranking after each question

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router) with [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [ShadCN UI](https://ui.shadcn.com/)
- **Backend**: [Firebase](https://firebase.google.com/) (Auth, Firestore, Storage, Cloud Functions)
- **AI**: Google Gemini 3 Pro via Vertex AI
- **Deployment**: Google Cloud Run + Firebase

## Quick Start

### Prerequisites

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- Google Cloud CLI (for Cloud Run deployments)

### Local Development

```bash
npm install
npm run dev          # Start dev server on http://localhost:9002
```

### Environment Setup

Create a `.env.local` file with your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Deployment

```bash
# Deploy to development environment
./deployment/scripts/deploy-dev.sh

# Deploy to production environment (with safety checks)
./deployment/scripts/deploy-prod.sh

# Interactive deployment menu
./deployment/scripts/deploy.sh
```

For complete deployment instructions including CI/CD setup, see **[Deployment Guide](docs/deployment/DEPLOYMENT.md)**.

## Available Pages

| Route | Description |
|-------|-------------|
| `/` | Home page (host or join selection) |
| `/login` | Host sign-in |
| `/host` | Host dashboard |
| `/host/create` | Create quiz manually |
| `/host/create-ai` | Create quiz with AI |
| `/host/edit/[quizId]` | Edit quiz |
| `/host/lobby/[gameId]` | Game lobby |
| `/host/game/[gameId]` | Live game view |
| `/join` | Player join page |
| `/play/[gamePin]` | Player game interface |

## Monitoring & Analytics

The application includes built-in Firebase Analytics for tracking user behavior and errors.

### Viewing Analytics

1. Go to [Firebase Console](https://console.firebase.google.com) → Your Project → Analytics
2. View real-time events in the **Realtime** dashboard
3. Monitor errors via `exception` events

### Tracked Events

| Event | Description |
|-------|-------------|
| `game_started` | Host starts a game |
| `question_started` | New question begins |
| `game_ended` | Game finishes |
| `player_joined` | Player joins a game |
| `answer_submitted` | Player submits answer |
| `player_timeout` | Player times out |
| `quiz_created` | Host creates a quiz |
| `ai_quiz_generated` | AI generates quiz |
| `quiz_shared` | Host shares a quiz |
| `quiz_copied` | Host copies a shared quiz |

### Adding Custom Events

```typescript
import { trackEvent } from '@/firebase';

trackEvent('my_event', { param: 'value' });
```

For detailed monitoring documentation, see the [Deployment Guide](docs/deployment/DEPLOYMENT.md#firebase-analytics).

## Documentation

| Document | Description |
|----------|-------------|
| **[Deployment Guide](docs/deployment/DEPLOYMENT.md)** | Complete deployment setup for dev/prod environments |
| **[Architecture Blueprint](docs/architecture/blueprint.md)** | System design, state management, timer sync, security |
| **[Bug Fixes & Solutions](docs/development/FIXES_AND_SOLUTIONS.md)** | Technical solutions and lessons learned |
| **[Feature Backlog](docs/development/BACKLOG.md)** | Planned features and improvements |
| **[Differentiation Features](docs/development/DIFFERENTIATION_FEATURES.md)** | Innovative feature ideas for future development |

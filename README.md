# gQuiz

gQuiz is an interactive, real-time quiz application that allows users to host live quiz games and have players join and compete from their own devices. It's built with a modern web stack and leverages Firebase for its backend services.

## Features

### Host Features
- **Secure Authentication**: Hosts can sign in securely with email and password to access their dashboard and manage all quiz-related activities.
- **Quiz Dashboard**: A central hub to view all created quizzes, active games, and completed game records.
- **Quiz Creation & Editing**:
  - Create new quizzes with a title and an optional description.
  - Add, edit, and delete questions within a quiz.
  - **Flexible Answer Options**: For each question, hosts can specify between 2 and 8 answer choices.
  - **Image Uploads**: Upload an image or GIF for each question to make quizzes more visually engaging.
  - **Per-Question Time Limits**: Configure a specific time limit (10, 20, 30, or 60 seconds) for each individual question.
  - **Automatic Image Cleanup**: Images are automatically deleted from storage if a quiz, question, or image is deleted.
- **Game Hosting**:
  - Launch a live game session from any quiz with a single click.
  - A unique, auto-generated Game PIN is created for each game lobby.
  - **Synchronized Game Start**: The game begins for all players only when the host's screen is fully loaded, ensuring a fair start.
- **Live Game Management**:
  - View a real-time list of players who have joined the lobby.
  - **Synchronized Question Display**: Questions are revealed to players only after they have fully loaded on the host's screen, keeping everyone in sync.
  - Manually advance from the question results to the next question.
  - View a real-time count of how many players have answered.
  - See a distribution chart of player answers after each question.
  - Cancel the game at any point from the lobby or live game screen.
- **Game History**:
  - Review final leaderboards for completed games.
  - Delete old game records from the dashboard.

### Player Features
- **Easy Join**: Players can quickly join a game using a simple Game PIN without needing to create an account.
- **Nickname Selection**: Choose a nickname to appear on the leaderboard before joining.
- **Real-time Synchronized Gameplay**:
  - **Fair Start**: The quiz begins and questions appear only when the host is ready, ensuring no one gets a head start.
  - See questions appear on your screen as the host presents them.
  - Answer questions within the host-defined time limit.
  - Receive instant feedback on your answer (correct/incorrect) and the points awarded.
  - Points are calculated based on both correctness and speed.
- **Seamless Game Flow**:
  - Smooth transitions between joining, waiting in the lobby, answering questions, and viewing results.
  - Get clear status updates if the host starts or cancels the game.
- **Final Results**: See your final score when the quiz is over.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (with App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI**: [React](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [ShadCN UI](https://ui.shadcn.com/) components.
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore & Storage)

## Getting Started

### 1. Firebase Setup
This project is configured to use Firebase for authentication and as its database.

1.  **Firebase Project**: The app is connected to a Firebase project. If you are running this locally through a tool like Firebase Studio, this is managed for you.
2.  **Authentication**: The app uses Firebase Authentication with the "Email/Password" sign-in method for hosts. To create a host user:
    - Go to the **Firebase Console** and select your project.
    - Navigate to **Authentication** > **Users** tab.
    - Click **"Add user"** and provide an email and password. You can then use these credentials to log in to the app's `/login` page.
3.  **Firestore & Storage Rules**: The database and file storage are secured with pre-configured rules (`firestore.rules` and `storage.rules`). These are managed automatically within the development environment.

### 2. Running the Development Server
Once your environment is set up, you can start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

## Available Pages

- `/`: The home page where users can choose to host or join a game.
- `/login`: The sign-in page for hosts.
- `/host`: The host's dashboard to view, create, and manage quizzes and games.
- `/host/create`: The page for creating a new quiz.
- `/host/edit/[quizId]`: The page for editing an existing quiz.
- `/host/lobby/[gameId]`: The lobby screen for a game you are hosting.
- `/host/game/[gameId]`: The live game screen for the host, showing questions and leaderboards.
- `/join`: The page for players to enter a Game PIN.
- `/play/[gamePin]`: The game screen for players participating in a quiz.

## Deployment

This application supports separate **production** and **development/test** environments with automated CI/CD deployment from GitHub using Cloud Build.

### Quick Start

For detailed deployment instructions, see **[docs/deployment/DEPLOYMENT.md](docs/deployment/DEPLOYMENT.md)**.

**Quick deployment commands:**

```bash
# Deploy to development environment
./deployment/scripts/deploy-dev.sh

# Deploy to production environment (with safety checks)
./deployment/scripts/deploy-prod.sh

# Interactive deployment menu
./deployment/scripts/deploy.sh
```

### Architecture

This application uses a hybrid deployment approach:
- **Client Application**: Deployed to Google Cloud Run
- **Cloud Functions**: Deployed to Firebase for server-side validation
- **Database & Storage**: Firebase Firestore and Cloud Storage
- **CI/CD**: Cloud Build with automatic dev deployments on push to `develop` branch

### Prerequisites

Before deploying, ensure you have:

- [Node.js 20+](https://nodejs.org/) installed (Node.js 18 was decommissioned in October 2024)
- [Firebase CLI](https://firebase.google.com/docs/cli) installed (`npm install -g firebase-tools`)
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) installed
- A Firebase project set up
- Google Cloud project linked to your Firebase project
- Appropriate permissions for Firebase and Cloud Run deployments

### 1. Environment Configuration

#### Create Environment Variables

Create a `.env.local` file in the project root with your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

**Important**: Never commit `.env.local` to version control. It's already included in `.gitignore`.

### 2. Deploy Firebase Services

#### Step 1: Login to Firebase

```bash
firebase login
```

#### Step 2: Initialize Firebase (if not already done)

```bash
firebase init
```

Select:
- Firestore
- Functions
- Storage
- Choose your existing Firebase project

#### Step 3: Install Cloud Functions Dependencies

```bash
cd functions
npm install
npm run build
cd ..
```

#### Step 4: Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

This deploys the security rules that:
- Prevent client-side score manipulation
- Enforce nickname length validation (2-20 characters)
- Restrict player data updates to authorized fields only

#### Step 5: Deploy Storage Rules

```bash
firebase deploy --only storage:rules
```

#### Step 6: Deploy Cloud Functions

```bash
firebase deploy --only functions
```

This deploys the `submitAnswer` function which:
- Validates player answers server-side
- Calculates scores securely
- Prevents cheating and score manipulation
- Uses transactions to prevent race conditions

**Note**: Cloud Functions deployment may take 2-5 minutes.

### 3. Deploy Client to Cloud Run

#### Step 1: Set Your Google Cloud Project

```bash
gcloud config set project YOUR_PROJECT_ID
```

#### Step 2: Build the Next.js Application

```bash
npm install
npm run build
```

#### Step 3: Deploy Using Buildpacks (Recommended) or Dockerfile

**Option A: Deploy with Google Cloud Buildpacks (No Dockerfile needed)**

Cloud Run will automatically detect your Next.js app and build it using buildpacks. This is the recommended approach as it's simpler and automatically updated.

Files are excluded via `.gcloudignore` to reduce upload size and build time.

**Option B: Deploy with Custom Dockerfile**

If you need more control over the build process, create a `Dockerfile` in the project root:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

#### Step 4: Update next.config.ts for Standalone Output

Add the following to your `next.config.ts`:

```typescript
const nextConfig = {
  output: 'standalone', // Add this line
  // ... rest of your config
};
```

#### Step 5: Deploy to Cloud Run

**Using Buildpacks (Recommended - No Dockerfile needed):**

```bash
gcloud run deploy gquiz \
  --source . \
  --platform managed \
  --region europe-west4 \
  --allow-unauthenticated \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id \
  --set-env-vars NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key \
  --set-env-vars NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com \
  --set-env-vars NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id \
  --set-env-vars NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app \
  --set-env-vars NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id \
  --set-env-vars NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id \
  --set-env-vars NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

This command:
- Uses `--source .` to deploy from source code (buildpacks)
- `--update-build-env-vars` provides environment variables during BUILD time (for Next.js prerendering)
- `--set-env-vars` provides environment variables at RUNTIME
- Automatically detects Next.js and builds with appropriate settings
- Respects `.gcloudignore` to exclude unnecessary files
- No Dockerfile required

**Alternative: Use Cloud Build with Dockerfile:**

If you prefer using a Dockerfile for more control, use the Cloud Build YAML configuration:

Create `cloudbuild.yaml`:

```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: [
      'build',
      '--build-arg', 'NEXT_PUBLIC_FIREBASE_API_KEY=${_FIREBASE_API_KEY}',
      '--build-arg', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${_FIREBASE_AUTH_DOMAIN}',
      '--build-arg', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID=${_FIREBASE_PROJECT_ID}',
      '--build-arg', 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${_FIREBASE_STORAGE_BUCKET}',
      '--build-arg', 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${_FIREBASE_MESSAGING_SENDER_ID}',
      '--build-arg', 'NEXT_PUBLIC_FIREBASE_APP_ID=${_FIREBASE_APP_ID}',
      '--build-arg', 'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=${_FIREBASE_MEASUREMENT_ID}',
      '-t', 'gcr.io/$PROJECT_ID/gquiz',
      '.'
    ]

  # Push the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/gquiz']

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args: [
      'run', 'deploy', 'gquiz',
      '--image', 'gcr.io/$PROJECT_ID/gquiz',
      '--region', 'europe-west4',
      '--platform', 'managed',
      '--allow-unauthenticated'
    ]

images:
  - 'gcr.io/$PROJECT_ID/gquiz'
```

Deploy with:

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_FIREBASE_API_KEY=your_api_key,_FIREBASE_AUTH_DOMAIN=your_domain,...
```

### 4. Post-Deployment Configuration

#### Create Host User

After deployment, create a host user in Firebase Authentication:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** > **Users**
4. Click **Add user**
5. Enter email and password
6. Use these credentials to sign in at `https://your-app-url.run.app/login`

#### Verify Deployment

1. **Client Application**: Visit your Cloud Run URL
2. **Cloud Functions**: Check Firebase Console > Functions to ensure `submitAnswer` is deployed
3. **Firestore Rules**: Navigate to Firestore > Rules to verify they're active
4. **Storage Rules**: Navigate to Storage > Rules to verify they're active

### 5. Continuous Deployment (Optional)

#### GitHub Actions for Cloud Run

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches:
      - main

env:
  PROJECT_ID: your-project-id
  SERVICE_NAME: gquiz
  REGION: europe-west4

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ env.PROJECT_ID }}

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy ${{ env.SERVICE_NAME }} \
            --source . \
            --platform managed \
            --region ${{ env.REGION }} \
            --allow-unauthenticated \
            --set-env-vars NEXT_PUBLIC_FIREBASE_API_KEY=${{ secrets.FIREBASE_API_KEY }} \
            --set-env-vars NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${{ secrets.FIREBASE_AUTH_DOMAIN }} \
            --set-env-vars NEXT_PUBLIC_FIREBASE_PROJECT_ID=${{ secrets.FIREBASE_PROJECT_ID }} \
            --set-env-vars NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${{ secrets.FIREBASE_STORAGE_BUCKET }} \
            --set-env-vars NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${{ secrets.FIREBASE_MESSAGING_SENDER_ID }} \
            --set-env-vars NEXT_PUBLIC_FIREBASE_APP_ID=${{ secrets.FIREBASE_APP_ID }} \
            --set-env-vars NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=${{ secrets.FIREBASE_MEASUREMENT_ID }}
```

#### GitHub Actions for Firebase

Create `.github/workflows/firebase-deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches:
      - main
    paths:
      - 'functions/**'
      - 'firestore.rules'
      - 'storage.rules'

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install Firebase CLI
        run: npm install -g firebase-tools

      - name: Install Functions dependencies
        run: |
          cd functions
          npm ci
          npm run build

      - name: Deploy to Firebase
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
        run: firebase deploy --only functions,firestore:rules,storage:rules --token "$FIREBASE_TOKEN"
```

### Deployment Checklist

Before going live, ensure:

- [ ] All environment variables are configured correctly
- [ ] Cloud Functions are deployed and responding
- [ ] Firestore security rules are active
- [ ] Storage security rules are active
- [ ] At least one host user is created in Firebase Authentication
- [ ] Cloud Run service is publicly accessible
- [ ] Image uploads are working (test with < 5MB images)
- [ ] Players can join games and submit answers
- [ ] Scores are calculated server-side (check Cloud Functions logs)
- [ ] Game PINs are 8 characters long

### Monitoring & Logs

#### View Cloud Functions Logs

```bash
firebase functions:log
```

Or in Firebase Console: Functions > Logs

#### View Cloud Run Logs

```bash
gcloud run services logs read gquiz --region europe-west4
```

Or in Google Cloud Console: Cloud Run > gquiz > Logs

#### Monitor Firestore Usage

Firebase Console > Firestore > Usage tab

#### Monitor Storage Usage

Firebase Console > Storage > Usage tab

### Troubleshooting

**Issue**: Players can't submit answers
- **Solution**: Verify Cloud Functions are deployed: `firebase functions:list`

**Issue**: "Permission denied" errors in Firestore
- **Solution**: Redeploy Firestore rules: `firebase deploy --only firestore:rules`

**Issue**: Images not uploading
- **Solution**: Check Storage rules and file size (must be < 5MB)

**Issue**: Cloud Run build fails
- **Solution**: Ensure `output: 'standalone'` is in `next.config.ts`
- If using buildpacks: Check `.gcloudignore` isn't excluding necessary files
- If using Dockerfile: Verify Dockerfile syntax and build args

**Issue**: Environment variables not loading
- **Solution**: Verify all `NEXT_PUBLIC_*` variables are set in Cloud Run

**Issue**: Large upload to Cloud Build
- **Solution**: Check `.gcloudignore` is properly excluding `node_modules`, `.next`, and `functions/`

### Costs & Scaling

#### Firebase Costs
- **Firestore**: Pay-as-you-go (free tier: 50k reads, 20k writes/day)
- **Cloud Functions**: $0.40/million invocations (free tier: 2M/month)
- **Storage**: $0.026/GB/month (free tier: 5GB)

#### Cloud Run Costs
- **CPU**: $0.00002400/vCPU-second
- **Memory**: $0.00000250/GiB-second
- **Requests**: $0.40/million (free tier: 2M/month)
- **Note**: Cloud Run only charges when processing requests

#### Scaling Recommendations
- Cloud Run auto-scales from 0 to 100 instances by default
- For large events (100+ concurrent players), increase max instances:
  ```bash
  gcloud run services update gquiz --max-instances=50
  ```
- Monitor Firebase quota limits in the Firebase Console

## Security

This application implements several security measures:

- **Server-side score validation**: Prevents client-side score manipulation via Cloud Functions
- **Firestore security rules**: Enforces data access control and validation
- **Input validation**: File size limits (5MB), nickname length (2-20 chars), input maxLength attributes
- **Environment variables**: Sensitive configuration kept out of source code
- **Strong Game PINs**: 8-character PINs provide 208 billion combinations
- **Transaction-based updates**: Prevents race conditions in score updates

For detailed security implementation, see [docs/architecture/SECURITY.md](docs/architecture/SECURITY.md).

## Project Structure

```
quizliveapp/
├── README.md                          # This file
├── package.json                       # Project dependencies
├── next.config.ts                     # Next.js configuration
├── tsconfig.json                      # TypeScript configuration
│
├── .env.development.template          # Development environment template
├── .env.production.template           # Production environment template
├── .env.example                       # Environment variables example
│
├── src/                               # Source code
│   ├── app/                           # Next.js app router pages
│   │   ├── host/                      # Host dashboard and game management
│   │   ├── play/                      # Player game interface
│   │   ├── join/                      # Player join page
│   │   └── login/                     # Authentication
│   ├── components/                    # React components
│   │   ├── app/                       # Application-specific components
│   │   └── ui/                        # Reusable UI components
│   ├── firebase/                      # Firebase integration
│   │   ├── auth/                      # Authentication hooks
│   │   └── firestore/                 # Firestore hooks and utilities
│   ├── hooks/                         # Custom React hooks
│   └── lib/                           # Utilities and types
│
├── functions/                         # Cloud Functions (server-side)
│   ├── src/
│   │   └── index.ts                   # submitAnswer function
│   └── package.json
│
├── deployment/                        # Deployment resources
│   ├── scripts/                       # Deployment automation scripts
│   │   ├── deploy.sh                  # Environment selector
│   │   ├── deploy-dev.sh              # Dev deployment
│   │   └── deploy-prod.sh             # Production deployment
│   └── configs/                       # Deployment configurations
│       ├── cloudbuild.yaml            # CI/CD pipeline
│       ├── firebase.dev.json          # Firebase dev config
│       └── firebase.prod.json         # Firebase prod config
│
├── docs/                              # Documentation
│   ├── deployment/                    # Deployment guides
│   │   ├── DEPLOYMENT.md              # Complete deployment guide
│   │   └── DEPLOYMENT_SETUP_SUMMARY.md # Quick reference
│   ├── architecture/                  # Architecture documentation
│   │   ├── blueprint.md               # Project design
│   │   ├── PLAYER_STATE_FLOW.md       # State machine
│   │   └── SECURITY.md                # Security architecture
│   └── development/                   # Development docs
│       ├── FIXES_AND_SOLUTIONS.md     # Bug fixes and solutions
│       ├── BACKLOG.md                 # Feature backlog
│       └── backend.json               # API structure
│
├── firebase.json                      # Main Firebase configuration
├── firestore.rules                    # Firestore security rules
├── firestore.indexes.json             # Firestore indexes
└── storage.rules                      # Cloud Storage security rules
```

## Documentation

All project documentation is organized in the [`docs/`](docs/) directory:

- **[Deployment Guide](docs/deployment/DEPLOYMENT.md)** - Complete deployment setup for production and dev/test
- **[Quick Deployment Reference](docs/deployment/DEPLOYMENT_SETUP_SUMMARY.md)** - Quick lookup guide
- **[Architecture Blueprint](docs/architecture/blueprint.md)** - Project design and architecture
- **[Player State Flow](docs/architecture/PLAYER_STATE_FLOW.md)** - State synchronization logic
- **[Security Documentation](docs/architecture/SECURITY.md)** - Security implementation details
- **[Bug Fixes & Solutions](docs/development/FIXES_AND_SOLUTIONS.md)** - Technical solutions and lessons learned
- **[Feature Backlog](docs/development/BACKLOG.md)** - Planned features and improvements

See [docs/README.md](docs/README.md) for a complete documentation index.

# Zivo Deployment Guide

This guide covers setting up production and dev/test environments with automatic CI/CD deployment from GitHub using Cloud Build.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: Create Firebase Projects](#phase-1-create-firebase-projects)
4. [Phase 2: Configure Environments](#phase-2-configure-environments)
5. [Phase 3: Set Up Cloud Build](#phase-3-set-up-cloud-build)
6. [Phase 4: Configure GitHub](#phase-4-configure-github)
7. [Phase 5: Create Cloud Build Triggers](#phase-5-create-cloud-build-triggers)
8. [Phase 6: First Deployment](#phase-6-first-deployment)
9. [Daily Workflow](#daily-workflow)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Environment Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Repository                        │
│                                                              │
│  main branch ──────────> Manual Prod Deploy                │
│  develop branch ──────> Auto Deploy to Dev                 │
│  feature/* branches ──> Merged to develop via PR           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Cloud Build                             │
│                                                              │
│  cloudbuild.yaml pipeline:                                  │
│  • Build & test code                                        │
│  • Deploy Firebase (Firestore, Storage, Functions)         │
│  • Deploy to Cloud Run                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
┌───────────────────────┐     ┌───────────────────────┐
│   Dev Environment     │     │  Prod Environment     │
│                       │     │                       │
│  gquiz-dev           │     │  gquiz-production     │
│  • Auto-deploys      │     │  • Manual only        │
│  • Cloud Run         │     │  • Cloud Run          │
│  • Firestore         │     │  • Firestore          │
│  • Storage           │     │  • Storage            │
│  • Cloud Functions   │     │  • Cloud Functions    │
└───────────────────────┘     └───────────────────────┘
```

### File Structure

```
quizliveapp/
├── .env.example                  # Template for environment variables
├── .env.development.template     # Dev environment template
├── .env.production.template      # Prod environment template
├── .env.development             # Dev credentials (gitignored)
├── .env.production              # Prod credentials (gitignored)
├── firebase.dev.json            # Firebase config for dev
├── firebase.prod.json           # Firebase config for prod
├── cloudbuild.yaml              # Cloud Build pipeline
├── deploy-dev.sh                # Manual dev deployment script
├── deploy-prod.sh               # Manual prod deployment script
├── deploy.sh                    # Legacy deployment script (kept for reference)
└── DEPLOYMENT.md                # This file
```

---

## Prerequisites

### Required Tools

1. **Node.js 20+**
   ```bash
   node --version  # Should be v20 or higher
   ```

2. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase --version
   ```

3. **Google Cloud CLI (gcloud)**
   - Install: https://cloud.google.com/sdk/docs/install
   ```bash
   gcloud --version
   ```

4. **Git**
   ```bash
   git --version
   ```

### Required Accounts

- Google Cloud account with billing enabled
- GitHub account with repository access
- Firebase account (same as Google Cloud)

---

## Configuration Variables

Before starting, set your project IDs as environment variables. This allows you to copy-paste all commands without modification.

**Set these variables in your terminal:**

```bash
# Set your Firebase project IDs
export DEV_PROJECT_ID="your-dev-project-id"
export PROD_PROJECT_ID="your-prod-project-id"

# Set your deployment region (optional, defaults to europe-west4)
export DEPLOY_REGION="europe-west4"

# Verify they're set
echo "Dev Project: $DEV_PROJECT_ID"
echo "Prod Project: $PROD_PROJECT_ID"
echo "Region: $DEPLOY_REGION"
```

**Note**: These variables are only set for your current terminal session. You'll need to set them again if you open a new terminal, or add them to your `~/.bashrc` or `~/.zshrc` for persistence.

**To make them permanent (optional):**

```bash
# Add to ~/.bashrc or ~/.zshrc
echo 'export DEV_PROJECT_ID="your-dev-project-id"' >> ~/.bashrc
echo 'export PROD_PROJECT_ID="your-prod-project-id"' >> ~/.bashrc
echo 'export DEPLOY_REGION="europe-west4"' >> ~/.bashrc
source ~/.bashrc
```

---

## Phase 1: Create Firebase Projects

### 1.1 Create Development Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. **Project name**: Choose a name for your dev project (e.g., `gquiz-dev`, `your-app-dev`, etc.)
4. Disable Google Analytics (optional for dev)
5. Click "Create project"
6. **Note the Project ID** - you'll use this for `$DEV_PROJECT_ID` later

### 1.2 Create Production Project

1. Click "Add project" again
2. **Project name**: Choose a name for your production project (e.g., `gquiz-production`, `your-app-prod`, etc.)
3. Enable Google Analytics (recommended for prod)
4. Click "Create project"
5. **Note the Project ID** - you'll use this for `$PROD_PROJECT_ID` later

### 1.3 Enable Services (Do this for BOTH projects)

#### Enable Authentication

1. Go to Firebase Console → Your project → Build → Authentication
2. Click "Get started"
3. Enable "Google" sign-in provider
4. Add authorized domain: `your-project.firebaseapp.com`
5. Click "Save"

#### Enable App Check (Recommended for Security)

Firebase App Check helps protect your backend from abuse by verifying requests come from your genuine app.

1. Go to Firebase Console → Your project → Build → App Check
2. Click "Get started"
3. Register your web app:
   - Click on your web app
   - Select "reCAPTCHA v3" or "reCAPTCHA Enterprise" provider
   - Click "Register"
4. Get reCAPTCHA Site Key:
   - Go to [Google Cloud Console → Security → reCAPTCHA](https://console.cloud.google.com/security/recaptcha)
   - Create a new site key for your domain (or use the one created by Firebase)
   - Copy the **Site Key** (not the Secret Key)
5. Add the Site Key to your environment files:
   ```bash
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key-here
   ```
6. **Important**: App Check runs in monitoring mode by default. To enforce it:
   - Go to Firebase Console → App Check
   - Click "Enforce" for each service (Cloud Functions, Firestore, etc.)
   - Only do this after verifying your app works correctly with App Check

#### Enable Firestore

1. Go to Build → Firestore Database
2. Click "Create database"
3. Start in **production mode** (we'll deploy rules via code)
4. Choose region: `europe-west4` (or your preferred region)
5. Click "Enable"

#### Enable Cloud Storage

1. Go to Build → Storage
2. Click "Get started"
3. Start in **production mode**
4. Use default bucket: `your-project.appspot.com`
5. Click "Done"

#### Enable Cloud Functions

1. Go to Build → Functions
2. Click "Get started"
3. This will enable the Cloud Functions API

### 1.4 Get Firebase Web App Credentials

**For Development Project:**

1. In Firebase Console, select **your development project**
2. Click gear icon → Project settings
3. Scroll to "Your apps"
4. Click "Web" icon (</>) to create web app
5. Register app name (e.g., `Zivo Dev`, `Your App Dev`, etc.)
6. Copy the Firebase configuration object
7. Save these values - you'll need them for `.env.development`

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "your-dev-project.firebaseapp.com",
  projectId: "your-dev-project-id",
  storageBucket: "your-dev-project.appspot.com",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "..."
};
```

**For Production Project:**

Repeat the same steps for **your production project**, saving those values for `.env.production`

---

## Phase 2: Configure Environments

### 2.1 Create Development Environment File

```bash
# Copy the template
cp .env.development.template .env.development

# Edit with your dev credentials
nano .env.development  # or use your preferred editor
```

**Fill in values from your dev Firebase project:**

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-dev-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${DEV_PROJECT_ID}.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${DEV_PROJECT_ID}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${DEV_PROJECT_ID}.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-dev-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-dev-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-dev-measurement-id

NEXT_PUBLIC_ENVIRONMENT=development
GCP_REGION=${DEPLOY_REGION}
CLOUD_RUN_SERVICE_NAME=${DEV_PROJECT_ID}

# Firebase App Check (optional but recommended for security)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
```

**Or create it automatically using the variables:**

```bash
cat > .env.development <<EOF
NEXT_PUBLIC_FIREBASE_API_KEY=your-dev-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${DEV_PROJECT_ID}.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${DEV_PROJECT_ID}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${DEV_PROJECT_ID}.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-dev-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-dev-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-dev-measurement-id

NEXT_PUBLIC_ENVIRONMENT=development
GCP_REGION=${DEPLOY_REGION}
CLOUD_RUN_SERVICE_NAME=${DEV_PROJECT_ID}

# Firebase App Check (optional but recommended for security)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
EOF
```

### 2.2 Create Production Environment File

```bash
# Copy the template
cp .env.production.template .env.production

# Edit with your prod credentials
nano .env.production
```

**Fill in values from your production Firebase project:**

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-prod-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${PROD_PROJECT_ID}.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${PROD_PROJECT_ID}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${PROD_PROJECT_ID}.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-prod-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-prod-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-prod-measurement-id

NEXT_PUBLIC_ENVIRONMENT=production
GCP_REGION=${DEPLOY_REGION}
CLOUD_RUN_SERVICE_NAME=${PROD_PROJECT_ID}

# Firebase App Check (required for production security)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
```

**Or create it automatically using the variables:**

```bash
cat > .env.production <<EOF
NEXT_PUBLIC_FIREBASE_API_KEY=your-prod-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${PROD_PROJECT_ID}.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${PROD_PROJECT_ID}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${PROD_PROJECT_ID}.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-prod-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-prod-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-prod-measurement-id

NEXT_PUBLIC_ENVIRONMENT=production
GCP_REGION=${DEPLOY_REGION}
CLOUD_RUN_SERVICE_NAME=${PROD_PROJECT_ID}

# Firebase App Check (required for production security)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
EOF
```

### 2.3 Verify Environment Files

```bash
# These files should exist and be gitignored
ls -la .env.*

# Should show:
# .env.development          (your credentials - gitignored)
# .env.production           (your credentials - gitignored)
# .env.development.template (committed template)
# .env.production.template  (committed template)
# .env.example              (committed template)

# Verify they're ignored by git
git status  # Should NOT show .env.development or .env.production
```

---

## Phase 3: Set Up Cloud Build

### 3.1 Enable Required APIs

**For Development Project:**

```bash
# Set current project
gcloud config set project $DEV_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable iam.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable cloudbilling.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable firebaseextensions.googleapis.com
gcloud services enable eventarc.googleapis.com       # For Firestore trigger functions (v2)
gcloud services enable pubsub.googleapis.com         # Required by Eventarc and Cloud Scheduler
gcloud services enable cloudscheduler.googleapis.com # For scheduled functions (cleanupOldGames)
gcloud services enable aiplatform.googleapis.com     # For AI quiz generation (Gemini 3 Pro)
```

**For Production Project:**

```bash
# Set current project
gcloud config set project $PROD_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable iam.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable cloudbilling.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable firebaseextensions.googleapis.com
gcloud services enable eventarc.googleapis.com       # For Firestore trigger functions (v2)
gcloud services enable pubsub.googleapis.com         # Required by Eventarc and Cloud Scheduler
gcloud services enable cloudscheduler.googleapis.com # For scheduled functions (cleanupOldGames)
gcloud services enable aiplatform.googleapis.com     # For AI quiz generation (Gemini 3 Pro)
```

### 3.2 Create Custom Service Accounts for Cloud Build

Instead of using the default Cloud Build service account, we'll create custom service accounts with specific permissions for better security control.

**For Development Project:**

```bash
# Set current project
gcloud config set project $DEV_PROJECT_ID

# Create custom service account for Cloud Build
gcloud iam service-accounts create cloudbuild-sa-dev \
  --display-name="Cloud Build Service Account - Dev" \
  --description="Custom service account for Cloud Build deployments in dev environment"

# Get the service account email
DEV_SA_EMAIL="cloudbuild-sa-dev@${DEV_PROJECT_ID}.iam.gserviceaccount.com"

# Verify service account was created
gcloud iam service-accounts list --filter="email:${DEV_SA_EMAIL}"
```

**For Production Project:**

```bash
# Set current project
gcloud config set project $PROD_PROJECT_ID

# Create custom service account for Cloud Build
gcloud iam service-accounts create cloudbuild-sa-prod \
  --display-name="Cloud Build Service Account - Prod" \
  --description="Custom service account for Cloud Build deployments in production environment"

# Get the service account email
PROD_SA_EMAIL="cloudbuild-sa-prod@${PROD_PROJECT_ID}.iam.gserviceaccount.com"

# Verify service account was created
gcloud iam service-accounts list --filter="email:${PROD_SA_EMAIL}"
```

### 3.3 Grant Permissions to Custom Service Accounts

**For Development Project:**

```bash
# Set the service account email
DEV_SA_EMAIL="cloudbuild-sa-dev@${DEV_PROJECT_ID}.iam.gserviceaccount.com"

# Grant Cloud Run Admin role (to deploy to Cloud Run)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/run.admin"

# Grant Service Account User role (to deploy Cloud Run as a service)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Grant Firebase Admin role (to deploy Firestore rules, Storage rules, and Functions)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/firebase.admin"

# Grant Secret Manager Secret Accessor role (to read environment variables)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

# Grant Storage Admin role (for Cloud Build artifacts and logs)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/storage.admin"

# Grant Logs Writer role (to write build logs)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/logging.logWriter"

# Grant Cloud Build Editor role (to manage builds)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/cloudbuild.builds.editor"

# Grant Cloud Build Service Agent role (for Cloud Build operations)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/cloudbuild.serviceAgent"

# Grant Service Usage Consumer role (to use Google Cloud services)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/serviceusage.serviceUsageConsumer"

# Grant Cloud Scheduler Admin role (for scheduled functions like cleanupOldGames)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/cloudscheduler.admin"

# Grant Eventarc Admin role (for Firestore trigger functions like onGameUpdated, onGameDeleted)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/eventarc.admin"

# Grant Pub/Sub Admin role (required by Eventarc for Firestore triggers)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/pubsub.admin"

# Verify permissions
echo "Permissions granted to: ${DEV_SA_EMAIL}"
gcloud projects get-iam-policy $DEV_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${DEV_SA_EMAIL}" \
  --format="table(bindings.role)"

# Grant GCP service agent bindings (required for Eventarc/Firestore triggers)
PROJECT_NUMBER=$(gcloud projects describe $DEV_PROJECT_ID --format="value(projectNumber)")

gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member=serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com \
  --role=roles/iam.serviceAccountTokenCreator

gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member=serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com \
  --role=roles/run.invoker

gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member=serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com \
  --role=roles/eventarc.eventReceiver

# Eventarc Service Agent needs serviceAgent role
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member=serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-eventarc.iam.gserviceaccount.com \
  --role=roles/eventarc.serviceAgent

echo "GCP service agent bindings configured for Eventarc"
```

**For Production Project:**

```bash
# Set the service account email
PROD_SA_EMAIL="cloudbuild-sa-prod@${PROD_PROJECT_ID}.iam.gserviceaccount.com"

# Grant Cloud Run Admin role (to deploy to Cloud Run)
gcloud projects add-iam-policy-binding $PROD_PROJECT_ID \
  --member="serviceAccount:${PROD_SA_EMAIL}" \
  --role="roles/run.admin"

# Grant Service Account User role (to deploy Cloud Run as a service)
gcloud projects add-iam-policy-binding $PROD_PROJECT_ID \
  --member="serviceAccount:${PROD_SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Grant Firebase Admin role (to deploy Firestore rules, Storage rules, and Functions)
gcloud projects add-iam-policy-binding $PROD_PROJECT_ID \
  --member="serviceAccount:${PROD_SA_EMAIL}" \
  --role="roles/firebase.admin"

# Grant Secret Manager Secret Accessor role (to read environment variables)
gcloud projects add-iam-policy-binding $PROD_PROJECT_ID \
  --member="serviceAccount:${PROD_SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

# Grant Storage Admin role (for Cloud Build artifacts and logs)
gcloud projects add-iam-policy-binding $PROD_PROJECT_ID \
  --member="serviceAccount:${PROD_SA_EMAIL}" \
  --role="roles/storage.admin"

# Grant Logs Writer role (to write build logs)
gcloud projects add-iam-policy-binding $PROD_PROJECT_ID \
  --member="serviceAccount:${PROD_SA_EMAIL}" \
  --role="roles/logging.logWriter"

# Grant Cloud Build Editor role (to manage builds)
gcloud projects add-iam-policy-binding $PROD_PROJECT_ID \
  --member="serviceAccount:${PROD_SA_EMAIL}" \
  --role="roles/cloudbuild.builds.editor"

# Grant Cloud Build Service Agent role (for Cloud Build operations)
gcloud projects add-iam-policy-binding $PROD_PROJECT_ID \
  --member="serviceAccount:${PROD_SA_EMAIL}" \
  --role="roles/cloudbuild.serviceAgent"

# Grant Service Usage Consumer role (to use Google Cloud services)
gcloud projects add-iam-policy-binding $PROD_PROJECT_ID \
  --member="serviceAccount:${PROD_SA_EMAIL}" \
  --role="roles/serviceusage.serviceUsageConsumer"

# Grant Cloud Scheduler Admin role (for scheduled functions like cleanupOldGames)
gcloud projects add-iam-policy-binding $PROD_PROJECT_ID \
  --member="serviceAccount:${PROD_SA_EMAIL}" \
  --role="roles/cloudscheduler.admin"

# Grant Eventarc Admin role (for Firestore trigger functions like onGameUpdated, onGameDeleted)
gcloud projects add-iam-policy-binding $PROD_PROJECT_ID \
  --member="serviceAccount:${PROD_SA_EMAIL}" \
  --role="roles/eventarc.admin"

# Grant Pub/Sub Admin role (required by Eventarc for Firestore triggers)
gcloud projects add-iam-policy-binding $PROD_PROJECT_ID \
  --member="serviceAccount:${PROD_SA_EMAIL}" \
  --role="roles/pubsub.admin"

# Verify permissions
echo "Permissions granted to: ${PROD_SA_EMAIL}"
gcloud projects get-iam-policy $PROD_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${PROD_SA_EMAIL}" \
  --format="table(bindings.role)"

# Grant GCP service agent bindings (required for Eventarc/Firestore triggers)
PROJECT_NUMBER=$(gcloud projects describe $PROD_PROJECT_ID --format="value(projectNumber)")

gcloud projects add-iam-policy-binding $PROD_PROJECT_ID \
  --member=serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com \
  --role=roles/iam.serviceAccountTokenCreator

gcloud projects add-iam-policy-binding $PROD_PROJECT_ID \
  --member=serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com \
  --role=roles/run.invoker

gcloud projects add-iam-policy-binding $PROD_PROJECT_ID \
  --member=serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com \
  --role=roles/eventarc.eventReceiver

# Eventarc Service Agent needs serviceAgent role
gcloud projects add-iam-policy-binding $PROD_PROJECT_ID \
  --member=serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-eventarc.iam.gserviceaccount.com \
  --role=roles/eventarc.serviceAgent

echo "GCP service agent bindings configured for Eventarc"
```

### 3.4 Create Custom Service Account for AI Functions

The AI features use Gemini 3 Pro via Vertex AI for:
- **Quiz generation** (`generateQuizWithAI`) - generates quiz questions from prompts
- **Image generation** (`generateQuestionImage`) - generates images for quiz questions

We create a dedicated service account with minimal permissions (principle of least privilege) for the AI Cloud Functions.

**For Development Project:**

```bash
# Set current project
gcloud config set project $DEV_PROJECT_ID

# Create custom service account for AI functions
gcloud iam service-accounts create gquiz-ai-functions \
  --display-name="Zivo AI Functions Service Account" \
  --description="Custom service account for AI Cloud Functions (Vertex AI + Storage access)"

# Get the service account email
AI_SA_EMAIL="gquiz-ai-functions@${DEV_PROJECT_ID}.iam.gserviceaccount.com"

# Grant Vertex AI User role (required for calling Gemini API)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${AI_SA_EMAIL}" \
  --role="roles/aiplatform.user"

# Grant Storage Object Admin role (required for saving AI-generated images)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${AI_SA_EMAIL}" \
  --role="roles/storage.objectAdmin"

# Grant Cloud Datastore User role (required for reading/writing Firestore in evaluateSubmissions)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${AI_SA_EMAIL}" \
  --role="roles/datastore.user"

# Verify the service account was created and has correct permissions
echo "AI Functions service account created: ${AI_SA_EMAIL}"
gcloud projects get-iam-policy $DEV_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${AI_SA_EMAIL}" \
  --format="table(bindings.role)"
```

**For Production Project:**

```bash
# Set current project
gcloud config set project $PROD_PROJECT_ID

# Create custom service account for AI functions
gcloud iam service-accounts create gquiz-ai-functions \
  --display-name="Zivo AI Functions Service Account" \
  --description="Custom service account for AI Cloud Functions (Vertex AI + Storage access)"

# Get the service account email
AI_SA_EMAIL="gquiz-ai-functions@${PROD_PROJECT_ID}.iam.gserviceaccount.com"

# Grant Vertex AI User role (required for calling Gemini API)
gcloud projects add-iam-policy-binding $PROD_PROJECT_ID \
  --member="serviceAccount:${AI_SA_EMAIL}" \
  --role="roles/aiplatform.user"

# Grant Storage Object Admin role (required for saving AI-generated images)
gcloud projects add-iam-policy-binding $PROD_PROJECT_ID \
  --member="serviceAccount:${AI_SA_EMAIL}" \
  --role="roles/storage.objectAdmin"

# Grant Cloud Datastore User role (required for reading/writing Firestore in evaluateSubmissions)
gcloud projects add-iam-policy-binding $PROD_PROJECT_ID \
  --member="serviceAccount:${AI_SA_EMAIL}" \
  --role="roles/datastore.user"

# Verify the service account was created and has correct permissions
echo "AI Functions service account created: ${AI_SA_EMAIL}"
gcloud projects get-iam-policy $PROD_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${AI_SA_EMAIL}" \
  --format="table(bindings.role)"
```

**Why a custom service account?**

- **Security isolation**: AI functions have separate credentials from other functions
- **Least privilege**: Only grants required roles (`roles/aiplatform.user` + `roles/storage.objectAdmin` + `roles/datastore.user`)
- **Auditability**: Easy to track AI API usage per service account
- **Revocation**: Can disable AI access without affecting other functions

**Required Roles Summary:**

| Role | Purpose |
|------|---------|
| `roles/aiplatform.user` | Call Gemini API via Vertex AI |
| `roles/storage.objectAdmin` | Upload AI-generated images to Firebase Storage |
| `roles/datastore.user` | Read/write Firestore for crowdsourced question evaluation |

**Grant Cloud Build permission to deploy with AI service account:**

The Cloud Build service account needs permission to deploy Cloud Functions that use the AI service account.

**For Development Project:**

```bash
# Set variables
AI_SA_EMAIL="gquiz-ai-functions@${DEV_PROJECT_ID}.iam.gserviceaccount.com"
CLOUDBUILD_SA_EMAIL="cloudbuild-sa-dev@${DEV_PROJECT_ID}.iam.gserviceaccount.com"

# Grant Cloud Build permission to act as the AI service account
gcloud iam service-accounts add-iam-policy-binding $AI_SA_EMAIL \
  --member="serviceAccount:${CLOUDBUILD_SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" \
  --project=$DEV_PROJECT_ID

echo "Cloud Build can now deploy functions with AI service account"
```

**For Production Project:**

```bash
# Set variables
AI_SA_EMAIL="gquiz-ai-functions@${PROD_PROJECT_ID}.iam.gserviceaccount.com"
CLOUDBUILD_SA_EMAIL="cloudbuild-sa-prod@${PROD_PROJECT_ID}.iam.gserviceaccount.com"

# Grant Cloud Build permission to act as the AI service account
gcloud iam service-accounts add-iam-policy-binding $AI_SA_EMAIL \
  --member="serviceAccount:${CLOUDBUILD_SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" \
  --project=$PROD_PROJECT_ID

echo "Cloud Build can now deploy functions with AI service account"
```

**Note**: The `generateQuizWithAI` function is configured in code to use this service account (`functions-ai/src/config.ts`). No API keys are needed - the function uses Application Default Credentials (ADC) automatically.

### 3.5 Configure Unauthenticated Access for AI Functions

Firebase Cloud Functions v2 (deployed on Cloud Run) require IAM authentication by default. However, browser CORS preflight requests (OPTIONS) are unauthenticated. To allow CORS to work, we must permit unauthenticated invocations at the IAM level.

**This is safe because:**
- The function code validates `request.auth` and rejects unauthenticated Firebase requests
- App Check provides additional verification
- The callable protocol validates request format
- Only the OPTIONS preflight is truly unauthenticated

**For Development Project:**

```bash
# Quiz generation
gcloud functions add-invoker-policy-binding generateQuizWithAI \
  --region=europe-west4 \
  --member="allUsers" \
  --project=$DEV_PROJECT_ID \
  --gen2

# Image generation
gcloud functions add-invoker-policy-binding generateQuestionImage \
  --region=europe-west4 \
  --member="allUsers" \
  --project=$DEV_PROJECT_ID \
  --gen2

# Crowdsourced question evaluation
gcloud functions add-invoker-policy-binding evaluateSubmissions \
  --region=europe-west4 \
  --member="allUsers" \
  --project=$DEV_PROJECT_ID \
  --gen2
```

**For Production Project:**

```bash
# Quiz generation
gcloud functions add-invoker-policy-binding generateQuizWithAI \
  --region=europe-west4 \
  --member="allUsers" \
  --project=$PROD_PROJECT_ID \
  --gen2

# Image generation
gcloud functions add-invoker-policy-binding generateQuestionImage \
  --region=europe-west4 \
  --member="allUsers" \
  --project=$PROD_PROJECT_ID \
  --gen2

# Crowdsourced question evaluation
gcloud functions add-invoker-policy-binding evaluateSubmissions \
  --region=europe-west4 \
  --member="allUsers" \
  --project=$PROD_PROJECT_ID \
  --gen2
```

**Note**: This step is automated in Cloud Build (`cloudbuild.yaml`), so you only need to run it manually for initial setup or troubleshooting.

### 3.6 Store Environment Variables in Secret Manager

**For Development:**

```bash
# Set project
gcloud config set project $DEV_PROJECT_ID

# Create secret from .env.development
gcloud secrets create firebase-config-dev \
  --data-file=.env.development

# Verify
gcloud secrets versions access latest --secret=firebase-config-dev
```

**For Production:**

```bash
# Set project
gcloud config set project $PROD_PROJECT_ID

# Create secret from .env.production
gcloud secrets create firebase-config-production \
  --data-file=.env.production

# Verify
gcloud secrets versions access latest --secret=firebase-config-production
```

---

## Phase 4: Configure GitHub

### 4.1 Create GitHub Repository (if not exists)

```bash
# Initialize git if not already done
git init

# Add remote
git remote add origin https://github.com/YOUR-USERNAME/quizliveapp.git
```

### 4.2 Set Up Branch Structure

```bash
# Create and push develop branch
git checkout -b develop
git push -u origin develop

# Create and push main branch (if not exists)
git checkout -b main
git push -u origin main

# Set develop as default branch (do this in GitHub settings)
```

**In GitHub Settings:**

1. Go to your repository → Settings → Branches
2. Set default branch to `develop`
3. Add branch protection rule for `main`:
   - Require pull request reviews before merging
   - Require status checks to pass
   - Require branches to be up to date

### 4.3 Connect GitHub to Cloud Build

**Option A: Via Google Cloud Console (Recommended)**

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Select project: **YOUR DEV PROJECT** (the one you set in `$DEV_PROJECT_ID`)
3. Click "Connect Repository"
4. Select "GitHub (Cloud Build GitHub App)"
5. Authenticate with GitHub
6. Select your repository: `YOUR-USERNAME/quizliveapp`
7. Click "Connect"
8. Repeat for **YOUR PROD PROJECT** (the one you set in `$PROD_PROJECT_ID`)

**Option B: Via gcloud CLI**

```bash
# For development trigger (requires interactive authentication)
gcloud alpha builds triggers create github \
  --repo-name=quizliveapp \
  --repo-owner=YOUR-USERNAME \
  --branch-pattern=^develop$ \
  --build-config=deployment/configs/cloudbuild.yaml \
  --service-account="projects/${DEV_PROJECT_ID}/serviceAccounts/cloudbuild-sa-dev@${DEV_PROJECT_ID}.iam.gserviceaccount.com" \
  --project=$DEV_PROJECT_ID

# For production trigger (manual invocation only)
gcloud alpha builds triggers create github \
  --repo-name=quizliveapp \
  --repo-owner=YOUR-USERNAME \
  --branch-pattern=^main$ \
  --build-config=deployment/configs/cloudbuild.yaml \
  --service-account="projects/${PROD_PROJECT_ID}/serviceAccounts/cloudbuild-sa-prod@${PROD_PROJECT_ID}.iam.gserviceaccount.com" \
  --require-approval \
  --project=$PROD_PROJECT_ID
```

---

## Phase 5: Create Cloud Build Triggers

### 5.1 Create Development Trigger (Auto-Deploy)

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Select project: **YOUR DEV PROJECT** (the one you set in `$DEV_PROJECT_ID`)
3. Click "Create Trigger"

**Trigger Configuration:**

- **Name**: `${DEV_PROJECT_ID}-auto-deploy` (e.g., `gquiz-dev-auto-deploy`)
- **Description**: `Auto-deploy to dev on push to develop branch`
- **Event**: Push to a branch
- **Source**: Select your connected repository
- **Branch**: `^develop$`
- **Configuration**: Cloud Build configuration file (yaml or json)
- **Location**: `/deployment/configs/cloudbuild.yaml`

**Substitution variables:**
```
_ENVIRONMENT = dev
_FIREBASE_CONFIG = firebase.dev.json
_REGION = europe-west4
_SERVICE_NAME = <your-dev-project-id>
```

**Note**: Replace `<your-dev-project-id>` with your actual dev project ID (the value you set in `$DEV_PROJECT_ID`).

- **Service account**: Select the custom service account `cloudbuild-sa-dev@${DEV_PROJECT_ID}.iam.gserviceaccount.com`
  - Click "Connect service account"
  - Select the service account you created in Phase 3.2
- Click "Create"

### 5.2 Create Production Trigger (Manual Only)

1. Switch to **YOUR PROD PROJECT** in Cloud Console (the one you set in `$PROD_PROJECT_ID`)
2. Go to Cloud Build Triggers
3. Click "Create Trigger"

**Trigger Configuration:**

- **Name**: `${PROD_PROJECT_ID}-manual-deploy` (e.g., `gquiz-prod-manual-deploy`)
- **Description**: `Manual deployment to production from main branch`
- **Event**: Manual invocation
- **Source**: Select your connected repository
- **Branch**: `^main$`
- **Configuration**: Cloud Build configuration file (yaml or json)
- **Location**: `/deployment/configs/cloudbuild.yaml`

**Substitution variables:**
```
_ENVIRONMENT = production
_FIREBASE_CONFIG = firebase.prod.json
_REGION = europe-west4
_SERVICE_NAME = <your-prod-project-id>
```

**Note**: Replace `<your-prod-project-id>` with your actual production project ID (the value you set in `$PROD_PROJECT_ID`).

- **Service account**: Select the custom service account `cloudbuild-sa-prod@${PROD_PROJECT_ID}.iam.gserviceaccount.com`
  - Click "Connect service account"
  - Select the service account you created in Phase 3.2
- Click "Create"

**Important**: For the production trigger, you need to:

1. Go to trigger settings
2. Under "Advanced" → Enable "Require approval before build executes" (if available)
3. This adds an extra safety layer for production deployments

---

## Phase 6: First Deployment

### 6.1 Manual Development Deployment (First Time)

For the first deployment, it's recommended to deploy manually to verify everything works:

```bash
# Ensure you're on develop branch
git checkout develop

# Make sure environment files are set up
ls -la .env.development

# Run development deployment
./deploy-dev.sh
```

**What this does:**

1. ✅ Validates `.env.development` exists
2. ✅ Builds Cloud Functions
3. ✅ Deploys Firestore rules and indexes
4. ✅ Deploys Storage rules
5. ✅ Deploys Cloud Functions
6. ✅ Deploys to Cloud Run
7. ✅ Outputs the application URL

**Expected Output:**

```
✅ Deployment Complete!

🌐 Application URL: https://${DEV_PROJECT_ID}-XXXXXXXXXX-ew.a.run.app

📝 Next Steps:
1. Test the dev environment at: https://${DEV_PROJECT_ID}-XXXXXXXXXX-ew.a.run.app
...
```

### 6.2 Update CORS Configuration

After first deployment, update Cloud Functions CORS origins:

1. Open `functions/src/index.ts`
2. Find `ALLOWED_ORIGINS` array
3. Add your Cloud Run URL:

```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://localhost:3000',
  'https://YOUR-DEV-PROJECT-XXXXXXXXXX-ew.a.run.app',  // ✅ Add dev URL
];
```

4. Redeploy functions:

```bash
firebase deploy --only functions --config firebase.dev.json --project $DEV_PROJECT_ID
```

### 6.3 Test Automatic Deployment

Now test the automatic deployment pipeline:

```bash
# Make a small change (e.g., update README)
echo "# Testing auto-deploy" >> README.md

# Commit and push to develop
git add README.md
git commit -m "Test: Verify auto-deployment"
git push origin develop
```

**Monitor the deployment:**

1. Go to [Cloud Build History](https://console.cloud.google.com/cloud-build/builds)
2. Select project: **YOUR DEV PROJECT** (the one you set in `$DEV_PROJECT_ID`)
3. You should see a new build running
4. Click on it to see live logs
5. Wait for "✅ Deployment Complete!" message

**Verify deployment:**

Visit your Cloud Run URL - you should see the updated app.

### 6.4 Manual Production Deployment (First Time)

Once dev is working, deploy to production:

```bash
# Switch to main branch
git checkout main

# Merge develop (ensure it's tested!)
git merge develop

# Push to main (but don't auto-deploy yet)
git push origin main

# Manual deployment
./deploy-prod.sh
```

**What this does:**

1. ✅ Verifies you're on `main` branch
2. ✅ Verifies no uncommitted changes
3. ✅ Requires double confirmation
4. ✅ Deploys to production

**Update production CORS:**

```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://localhost:3000',
  'https://YOUR-DEV-PROJECT-XXXXXXXXXX-ew.a.run.app',
  'https://YOUR-PROD-PROJECT-XXXXXXXXXX-ew.a.run.app',  // ✅ Add prod URL
];
```

Redeploy functions:

```bash
firebase deploy --only functions --config firebase.prod.json --project $PROD_PROJECT_ID
```

---

## Daily Workflow

### Feature Development

```bash
# 1. Start from develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/new-feature

# 3. Make changes, commit
git add .
git commit -m "Add new feature"

# 4. Push to GitHub
git push origin feature/new-feature

# 5. Create PR: feature/new-feature → develop
# Go to GitHub and create Pull Request

# 6. After PR approval, merge to develop
# This triggers automatic deployment to dev

# 7. Test in dev environment
# Visit: https://${DEV_PROJECT_ID}-XXXXXXXXXX-ew.a.run.app

# 8. If tests pass, create PR: develop → main
# After approval, merge to main

# 9. Deploy to production
./deploy-prod.sh
# OR use Cloud Build trigger manually
```

### Quick Fixes

```bash
# For urgent production fixes:

# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. Fix bug, commit
git add .
git commit -m "Fix: Critical bug"

# 3. Create PR to main
git push origin hotfix/critical-bug

# 4. After approval, merge and deploy
git checkout main
git merge hotfix/critical-bug
./deploy-prod.sh

# 5. Merge back to develop
git checkout develop
git merge main
git push origin develop
```

---

## Troubleshooting

### Issue: Cloud Build fails with "Permission denied"

**Solution:**

Check that your custom Cloud Build service account has correct permissions:

```bash
# For dev environment (or use PROD_SA_EMAIL for production)
DEV_SA_EMAIL="cloudbuild-sa-dev@${DEV_PROJECT_ID}.iam.gserviceaccount.com"

# Verify current permissions
gcloud projects get-iam-policy $DEV_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${DEV_SA_EMAIL}" \
  --format="table(bindings.role)"

# Re-grant missing permissions if needed
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/run.admin"

# Verify the Cloud Build trigger is using the correct service account
gcloud builds triggers list --project=$DEV_PROJECT_ID --format="table(name,serviceAccount)"
```

### Issue: "firebase: command not found" in Cloud Build

**Solution:**

This is normal - Firebase CLI is installed during the build. Check the `install-firebase-cli` step in `cloudbuild.yaml`.

### Issue: Environment variables not loading

**Solution:**

1. Verify secret exists:
   ```bash
   # For dev (or use $PROD_PROJECT_ID for production)
   gcloud secrets list --project $DEV_PROJECT_ID
   ```

2. Check secret content:
   ```bash
   # For dev (or use $PROD_PROJECT_ID and firebase-config-production for production)
   gcloud secrets versions access latest --secret=firebase-config-dev --project $DEV_PROJECT_ID
   ```

3. Verify Cloud Build service account has access:
   ```bash
   # For dev (or use $PROD_PROJECT_ID, PROD_SA_EMAIL, and firebase-config-production for production)
   DEV_SA_EMAIL="cloudbuild-sa-dev@${DEV_PROJECT_ID}.iam.gserviceaccount.com"

   gcloud secrets add-iam-policy-binding firebase-config-dev \
     --member="serviceAccount:${DEV_SA_EMAIL}" \
     --role="roles/secretmanager.secretAccessor" \
     --project $DEV_PROJECT_ID
   ```

### Issue: Deploy script fails with "NEXT_PUBLIC_FIREBASE_PROJECT_ID not set"

**Solution:**

Verify `.env.development` or `.env.production` file exists and contains the variable:

```bash
cat .env.development | grep NEXT_PUBLIC_FIREBASE_PROJECT_ID
```

### Issue: Service account does not have required permissions

**Solution:**

If you see errors like "The caller does not have permission" or "Failed to deploy to Cloud Run", verify and re-grant all required permissions:

```bash
# For dev (or use PROD_SA_EMAIL and $PROD_PROJECT_ID for production)
DEV_SA_EMAIL="cloudbuild-sa-dev@${DEV_PROJECT_ID}.iam.gserviceaccount.com"

# List all current permissions
gcloud projects get-iam-policy $DEV_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${DEV_SA_EMAIL}" \
  --format="table(bindings.role)"

# Required roles (re-run the commands from Phase 3.3 if any are missing):
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/firebase.admin"

gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/cloudbuild.serviceAgent"

gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/serviceusage.serviceUsageConsumer"
```

### Issue: Cloud Build trigger using wrong service account

**Solution:**

Verify the trigger is configured with the custom service account:

```bash
# List all triggers and their service accounts
gcloud builds triggers list --project=$DEV_PROJECT_ID --format="table(name,serviceAccount)"

# If needed, update the trigger via Cloud Console:
# 1. Go to Cloud Build → Triggers
# 2. Click on your trigger
# 3. Click "Edit"
# 4. Under "Service account", select your custom service account
# 5. Click "Save"
```

### Issue: CORS errors in production

**Solution:**

1. Get your Cloud Run URL
2. Add it to `functions/src/index.ts` ALLOWED_ORIGINS
3. Redeploy functions:
   ```bash
   firebase deploy --only functions --config firebase.prod.json --project $PROD_PROJECT_ID
   ```

### Issue: Build timeout

**Solution:**

Increase timeout in `cloudbuild.yaml`:

```yaml
timeout: 2400s  # 40 minutes
```

### Issue: "Repository not found" when creating trigger

**Solution:**

Reconnect GitHub repository:

1. Go to Cloud Build → Triggers
2. Click "Connect Repository"
3. Re-authenticate with GitHub
4. Select repository again

### Issue: AI quiz generation fails with "Permission denied" or "Vertex AI error"

**Solution:**

The AI functions use a custom service account (`gquiz-ai-functions`) that needs specific roles:

```bash
# For dev (or use $PROD_PROJECT_ID for production)
AI_SA_EMAIL="gquiz-ai-functions@${DEV_PROJECT_ID}.iam.gserviceaccount.com"

# Check if the service account exists
gcloud iam service-accounts describe $AI_SA_EMAIL --project=$DEV_PROJECT_ID

# If it doesn't exist, create it
gcloud iam service-accounts create gquiz-ai-functions \
  --display-name="Zivo AI Functions Service Account" \
  --project=$DEV_PROJECT_ID

# Grant Vertex AI User role (for Gemini API)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${AI_SA_EMAIL}" \
  --role="roles/aiplatform.user"

# Grant Storage Object Admin role (for AI-generated images)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${AI_SA_EMAIL}" \
  --role="roles/storage.objectAdmin"

# Grant Cloud Datastore User role (for Firestore access in evaluateSubmissions)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${AI_SA_EMAIL}" \
  --role="roles/datastore.user"

# Verify the Vertex AI API is enabled
gcloud services list --enabled --project=$DEV_PROJECT_ID | grep aiplatform

# If not enabled, enable it
gcloud services enable aiplatform.googleapis.com --project=$DEV_PROJECT_ID
```

### Issue: AI quiz generation returns "Model not found"

**Solution:**

1. Verify you're using the correct model name in `functions-ai/src/config.ts`
2. Ensure the Vertex AI API is enabled in your project
3. Check that your region supports the Gemini 3 Pro model (europe-west4 is recommended)

### Issue: Cloud Build fails to deploy AI functions with "Permission denied on service account"

**Solution:**

The Cloud Build service account needs permission to deploy functions with the AI service account:

```bash
# For dev (or use $PROD_PROJECT_ID for production)
AI_SA_EMAIL="gquiz-ai-functions@${DEV_PROJECT_ID}.iam.gserviceaccount.com"
CLOUDBUILD_SA_EMAIL="cloudbuild-sa-dev@${DEV_PROJECT_ID}.iam.gserviceaccount.com"

# Grant permission
gcloud iam service-accounts add-iam-policy-binding $AI_SA_EMAIL \
  --member="serviceAccount:${CLOUDBUILD_SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" \
  --project=$DEV_PROJECT_ID
```

### Issue: CORS error when calling AI function

**Solution:**

Firebase Functions v2 require unauthenticated access at the IAM level for CORS preflight requests to succeed:

```bash
# For dev (or use $PROD_PROJECT_ID for production)

# Quiz generation function
gcloud functions add-invoker-policy-binding generateQuizWithAI \
  --region=europe-west4 \
  --member="allUsers" \
  --project=$DEV_PROJECT_ID \
  --gen2

# Image generation function
gcloud functions add-invoker-policy-binding generateQuestionImage \
  --region=europe-west4 \
  --member="allUsers" \
  --project=$DEV_PROJECT_ID \
  --gen2

# Crowdsourced question evaluation function
gcloud functions add-invoker-policy-binding evaluateSubmissions \
  --region=europe-west4 \
  --member="allUsers" \
  --project=$DEV_PROJECT_ID \
  --gen2
```

This is safe because the functions still require Firebase Auth at the application level. This step is automated in Cloud Build, so you only need to run it manually for initial setup or troubleshooting.

### Issue: Firestore trigger or scheduled functions not appearing in Firebase Console

**Symptoms:**
- Functions like `onGameUpdated`, `onGameDeleted`, or `cleanupOldGames` are not deployed
- Cloud Build shows success but functions don't appear in Firebase Console
- No deployment errors visible in logs

**Root Cause:**
Firebase Functions v2 trigger types require additional Google Cloud APIs that may not be enabled:

| Function Type | Required APIs |
|--------------|---------------|
| `onSchedule` | Cloud Scheduler API, Pub/Sub API |
| `onDocumentUpdated` | Eventarc API, Pub/Sub API |
| `onDocumentDeleted` | Eventarc API, Pub/Sub API |

**Solution:**

1. Enable the required APIs:

```bash
# For dev (or use $PROD_PROJECT_ID for production)
gcloud services enable eventarc.googleapis.com --project=$DEV_PROJECT_ID
gcloud services enable pubsub.googleapis.com --project=$DEV_PROJECT_ID
gcloud services enable cloudscheduler.googleapis.com --project=$DEV_PROJECT_ID
```

2. Grant Cloud Build service account the required roles:

```bash
# For dev (or use $PROD_PROJECT_ID and PROD_SA_EMAIL for production)
DEV_SA_EMAIL="cloudbuild-sa-dev@${DEV_PROJECT_ID}.iam.gserviceaccount.com"

# Cloud Scheduler Admin (for scheduled functions)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/cloudscheduler.admin"

# Eventarc Admin (for Firestore triggers)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/eventarc.admin"

# Pub/Sub Admin (required by Eventarc)
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member="serviceAccount:${DEV_SA_EMAIL}" \
  --role="roles/pubsub.admin"
```

3. Grant GCP service agent IAM bindings (required for Eventarc to work):

```bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe $DEV_PROJECT_ID --format="value(projectNumber)")

# Pub/Sub service account needs token creator role
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member=serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com \
  --role=roles/iam.serviceAccountTokenCreator

# Compute service account needs run.invoker for Eventarc to invoke functions
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member=serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com \
  --role=roles/run.invoker

# Compute service account needs eventarc.eventReceiver to receive events
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member=serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com \
  --role=roles/eventarc.eventReceiver

# Eventarc Service Agent needs serviceAgent role
gcloud projects add-iam-policy-binding $DEV_PROJECT_ID \
  --member=serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-eventarc.iam.gserviceaccount.com \
  --role=roles/eventarc.serviceAgent
```

4. Wait 2-3 minutes for permissions to propagate, then redeploy the functions:

```bash
firebase deploy --only functions --config firebase.dev.json --project $DEV_PROJECT_ID
```

**Expected Functions After Fix:**

- **default codebase**: submitAnswer, createHostAccount, computeQuestionResults, onGameUpdated, onGameDeleted, cleanupOldGames
- **ai codebase**: generateQuizWithAI, generateQuestionImage, evaluateSubmissions

### Issue: Cloud Scheduler location not valid error

**Symptoms:**
- Error: `Location 'europe-west4' is not a valid location. Use ListLocations to list valid locations.`
- Scheduled functions (like `cleanupOldGames`) fail to deploy

**Root Cause:**
Cloud Scheduler is not available in all regions. `europe-west4` is not supported.

**Solution:**
The `cleanupOldGames` function uses `europe-west1` instead of `europe-west4` for Cloud Scheduler compatibility. This is configured in `functions/src/functions/cleanupOldGames.ts`:

```typescript
// Cloud Scheduler is not available in europe-west4, so we use europe-west1
const SCHEDULER_REGION = 'europe-west1';
```

To check available Cloud Scheduler locations:

```bash
gcloud scheduler locations list
```

**Note:** The scheduled function will run in `europe-west1` while other functions run in `europe-west4`. This has no functional impact.

---

## Monitoring and Maintenance

### Firebase Analytics

The application includes built-in Firebase Analytics for tracking user behavior and errors. Analytics is automatically initialized when the app loads.

#### Viewing Analytics Data

1. Go to [Firebase Console](https://console.firebase.google.com) → Your Project → Analytics
2. View real-time events in the **Realtime** dashboard
3. Explore user behavior in the **Events** section
4. Monitor errors in the **Errors** section (from exception events)

#### Tracked Events

| Event | Description | Parameters |
|-------|-------------|------------|
| `game_started` | Host starts a game | `question_count` |
| `question_started` | New question begins | `question_index`, `question_type` |
| `game_ended` | Game finishes | `question_count` |
| `player_joined` | Player joins a game | - |
| `answer_submitted` | Player submits answer | `question_type`, `has_time_bonus` |
| `player_timeout` | Player times out | `question_type` |
| `quiz_created` | Host creates a quiz manually | `question_count`, `has_images` |
| `ai_quiz_generated` | AI generates quiz | `question_count`, `is_refinement` |
| `ai_quiz_saved` | Host saves AI quiz | `question_count` |
| `quiz_shared` | Host shares a quiz | - |
| `quiz_copied` | Host copies a shared quiz | `question_count`, `has_images` |

#### Error Tracking

Client-side errors are automatically logged to Google Analytics as exception events. This includes:

- Page-level errors caught by Next.js error boundaries
- Global errors in the root layout
- Runtime JavaScript errors

**To view errors:**

1. Go to Firebase Console → Analytics → Events
2. Filter for `exception` events
3. Click on an event to see error details in the parameters

Error details include:
- Error name and message
- Page URL where error occurred
- Context (which page/component)

**Note:** Error tracking is anonymous - no user IDs are included in error reports.

#### Analytics Performance

Analytics uses lazy loading to minimize impact on page load:

- SDK loads via `requestIdleCallback` (during browser idle time)
- Events are queued until SDK is ready
- Zero blocking of initial page render
- Approximate bundle size: ~15-20KB (loaded after page is interactive)

#### Custom Event Tracking

To add new events in your code:

```typescript
import { trackEvent } from '@/firebase';

// Simple event
trackEvent('my_event');

// Event with parameters
trackEvent('my_event', {
  param1: 'value1',
  param2: 123,
});
```

#### Debugging Analytics

In development, you can verify events are being tracked:

1. Open browser DevTools → Network tab
2. Filter for `google-analytics` or `analytics`
3. Look for requests to `www.google-analytics.com`

For real-time debugging:
1. Go to Firebase Console → Analytics → DebugView
2. Enable debug mode in your browser by installing the [Google Analytics Debugger extension](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)

### View Cloud Build Logs

```bash
# List recent builds (dev)
gcloud builds list --project=$DEV_PROJECT_ID --limit=10

# View specific build logs (dev)
gcloud builds log BUILD_ID --project=$DEV_PROJECT_ID

# For production, replace $DEV_PROJECT_ID with $PROD_PROJECT_ID
```

### View Cloud Run Logs

```bash
# Stream logs (dev)
gcloud run services logs read $DEV_PROJECT_ID --region=$DEPLOY_REGION --project=$DEV_PROJECT_ID

# Filter logs (dev)
gcloud run services logs read $DEV_PROJECT_ID --region=$DEPLOY_REGION --project=$DEV_PROJECT_ID --filter="severity=ERROR"

# For production, replace $DEV_PROJECT_ID with $PROD_PROJECT_ID
```

### View Cloud Functions Logs

```bash
# Dev environment
firebase functions:log --project $DEV_PROJECT_ID

# Or via gcloud
gcloud functions logs read --region=$DEPLOY_REGION --project=$DEV_PROJECT_ID

# For production, replace $DEV_PROJECT_ID with $PROD_PROJECT_ID
```

### Cost Monitoring

Monitor costs in [Google Cloud Console](https://console.cloud.google.com/billing):

- Cloud Run: Pay per request
- Cloud Functions: Pay per invocation
- Cloud Build: 120 free minutes/day, then $0.003/minute
- Firestore: Free tier: 50K reads, 20K writes/day
- Cloud Storage: Free tier: 5GB
- Vertex AI (Gemini 3 Pro): Pay per token (input/output)

---

## Security Checklist

- [ ] Environment files (`.env.development`, `.env.production`) are gitignored
- [ ] Secrets stored in Secret Manager, not in code
- [ ] Custom service accounts created for Cloud Build (not using default service accounts)
- [ ] Cloud Build service accounts have minimal required permissions (only necessary roles granted)
- [ ] Service account permissions verified using `gcloud projects get-iam-policy`
- [ ] CORS origins properly configured in Cloud Functions
- [ ] Firestore security rules deployed and tested
- [ ] Storage security rules deployed and tested
- [ ] Production deployments require approval
- [ ] Branch protection enabled on `main` branch
- [ ] Only authorized users can trigger production builds
- [ ] Regular security audits of IAM roles and service account permissions
- [ ] **Firebase App Check configured and tested**
  - [ ] reCAPTCHA site key added to environment files (`NEXT_PUBLIC_RECAPTCHA_SITE_KEY`)
  - [ ] App Check enabled in Firebase Console
  - [ ] App Check enforcement enabled for production (after testing)
- [ ] **Vertex AI (AI Functions) configured**
  - [ ] Vertex AI API enabled in project
  - [ ] Custom service account `gquiz-ai-functions` created
  - [ ] AI service account has required roles (least privilege):
    - [ ] `roles/aiplatform.user` - for Gemini API access
    - [ ] `roles/storage.objectAdmin` - for AI-generated image storage
    - [ ] `roles/datastore.user` - for Firestore access in evaluateSubmissions
  - [ ] Cloud Build service account can act as AI service account (`roles/iam.serviceAccountUser`)
  - [ ] AI functions deployed from `functions-ai` codebase with custom service account
  - [ ] AI functions allow unauthenticated invocations for CORS (automated in Cloud Build)

---

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vertex AI Gemini Documentation](https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini)

---

## Support

For issues or questions:

1. Check this documentation
2. Review [FIXES_AND_SOLUTIONS.md](./docs/FIXES_AND_SOLUTIONS.md)
3. Check Cloud Build logs
4. Review Firebase Console for errors

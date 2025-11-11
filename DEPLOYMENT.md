# gQuiz Deployment Guide

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

## Phase 1: Create Firebase Projects

### 1.1 Create Development Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. **Project name**: `gquiz-dev`
4. Disable Google Analytics (optional for dev)
5. Click "Create project"

### 1.2 Create Production Project

1. Click "Add project" again
2. **Project name**: `gquiz-production`
3. Enable Google Analytics (recommended for prod)
4. Click "Create project"

### 1.3 Enable Services (Do this for BOTH projects)

#### Enable Authentication

1. Go to Firebase Console → Your project → Build → Authentication
2. Click "Get started"
3. Enable "Google" sign-in provider
4. Add authorized domain: `your-project.firebaseapp.com`
5. Click "Save"

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

1. In Firebase Console, select `gquiz-dev`
2. Click gear icon → Project settings
3. Scroll to "Your apps"
4. Click "Web" icon (</>) to create web app
5. Register app name: `gQuiz Dev`
6. Copy the Firebase configuration object
7. Save these values - you'll need them for `.env.development`

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "gquiz-dev.firebaseapp.com",
  projectId: "gquiz-dev",
  storageBucket: "gquiz-dev.appspot.com",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "..."
};
```

**For Production Project:**

Repeat the same steps for `gquiz-production`

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
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gquiz-dev.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=gquiz-dev
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=gquiz-dev.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-dev-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-dev-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-dev-measurement-id

NEXT_PUBLIC_ENVIRONMENT=development
GCP_REGION=europe-west4
CLOUD_RUN_SERVICE_NAME=gquiz-dev
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
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gquiz-production.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=gquiz-production
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=gquiz-production.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-prod-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-prod-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-prod-measurement-id

NEXT_PUBLIC_ENVIRONMENT=production
GCP_REGION=europe-west4
CLOUD_RUN_SERVICE_NAME=gquiz-prod
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

### 3.1 Enable Cloud Build API

**For Development Project:**

```bash
# Set current project
gcloud config set project gquiz-dev

# Enable Cloud Build API
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

**For Production Project:**

```bash
# Set current project
gcloud config set project gquiz-production

# Enable Cloud Build API
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 3.2 Grant Cloud Build Permissions

**For Development Project:**

```bash
# Get project number
PROJECT_NUMBER=$(gcloud projects describe gquiz-dev --format="value(projectNumber)")

# Cloud Build service account
SERVICE_ACCOUNT="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant necessary roles
gcloud projects add-iam-policy-binding gquiz-dev \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding gquiz-dev \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding gquiz-dev \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/firebase.admin"

gcloud projects add-iam-policy-binding gquiz-dev \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

**Repeat for Production Project:**

```bash
# Get project number
PROJECT_NUMBER=$(gcloud projects describe gquiz-production --format="value(projectNumber)")

# Cloud Build service account
SERVICE_ACCOUNT="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant necessary roles
gcloud projects add-iam-policy-binding gquiz-production \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding gquiz-production \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding gquiz-production \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/firebase.admin"

gcloud projects add-iam-policy-binding gquiz-production \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

### 3.3 Store Environment Variables in Secret Manager

**For Development:**

```bash
# Set project
gcloud config set project gquiz-dev

# Create secret from .env.development
gcloud secrets create firebase-config-dev \
  --data-file=.env.development

# Verify
gcloud secrets versions access latest --secret=firebase-config-dev
```

**For Production:**

```bash
# Set project
gcloud config set project gquiz-production

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
2. Select project: `gquiz-dev`
3. Click "Connect Repository"
4. Select "GitHub (Cloud Build GitHub App)"
5. Authenticate with GitHub
6. Select your repository: `YOUR-USERNAME/quizliveapp`
7. Click "Connect"
8. Repeat for `gquiz-production` project

**Option B: Via gcloud CLI**

```bash
# This requires interactive authentication
gcloud alpha builds triggers create github \
  --repo-name=quizliveapp \
  --repo-owner=YOUR-USERNAME \
  --branch-pattern=^develop$ \
  --build-config=cloudbuild.yaml \
  --project=gquiz-dev
```

---

## Phase 5: Create Cloud Build Triggers

### 5.1 Create Development Trigger (Auto-Deploy)

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Select project: `gquiz-dev`
3. Click "Create Trigger"

**Trigger Configuration:**

- **Name**: `gquiz-dev-auto-deploy`
- **Description**: `Auto-deploy to dev on push to develop branch`
- **Event**: Push to a branch
- **Source**: Select your connected repository
- **Branch**: `^develop$`
- **Configuration**: Cloud Build configuration file (yaml or json)
- **Location**: `/cloudbuild.yaml`

**Substitution variables:**
```
_ENVIRONMENT = dev
_FIREBASE_CONFIG = firebase.dev.json
_REGION = europe-west4
_SERVICE_NAME = gquiz-dev
```

- **Service account**: Use default Cloud Build service account
- Click "Create"

### 5.2 Create Production Trigger (Manual Only)

1. Still in `gquiz-dev` project triggers (we'll move it later)
2. Click "Create Trigger"

**Trigger Configuration:**

- **Name**: `gquiz-prod-manual-deploy`
- **Description**: `Manual deployment to production from main branch`
- **Event**: Manual invocation
- **Source**: Select your connected repository
- **Branch**: `^main$`
- **Configuration**: Cloud Build configuration file (yaml or json)
- **Location**: `/cloudbuild.yaml`

**Substitution variables:**
```
_ENVIRONMENT = production
_FIREBASE_CONFIG = firebase.prod.json
_REGION = europe-west4
_SERVICE_NAME = gquiz-prod
```

- **Service account**: Use default Cloud Build service account
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

🌐 Application URL: https://gquiz-dev-XXXXXXXXXX-ew.a.run.app

📝 Next Steps:
1. Test the dev environment at: https://gquiz-dev-XXXXXXXXXX-ew.a.run.app
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
  'https://gquiz-dev-XXXXXXXXXX-ew.a.run.app',  // ✅ Add dev URL
];
```

4. Redeploy functions:

```bash
firebase deploy --only functions --config firebase.dev.json --project gquiz-dev
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
2. Select project: `gquiz-dev`
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
  'https://gquiz-dev-XXXXXXXXXX-ew.a.run.app',
  'https://gquiz-prod-XXXXXXXXXX-ew.a.run.app',  // ✅ Add prod URL
];
```

Redeploy functions:

```bash
firebase deploy --only functions --config firebase.prod.json --project gquiz-production
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
# Visit: https://gquiz-dev-XXXXXXXXXX-ew.a.run.app

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

Check that Cloud Build service account has correct permissions:

```bash
# Get service account
PROJECT_NUMBER=$(gcloud projects describe YOUR-PROJECT --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Re-grant permissions
gcloud projects add-iam-policy-binding YOUR-PROJECT \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.admin"
```

### Issue: "firebase: command not found" in Cloud Build

**Solution:**

This is normal - Firebase CLI is installed during the build. Check the `install-firebase-cli` step in `cloudbuild.yaml`.

### Issue: Environment variables not loading

**Solution:**

1. Verify secret exists:
   ```bash
   gcloud secrets list --project YOUR-PROJECT
   ```

2. Check secret content:
   ```bash
   gcloud secrets versions access latest --secret=firebase-config-dev --project YOUR-PROJECT
   ```

3. Verify Cloud Build has access:
   ```bash
   gcloud secrets add-iam-policy-binding firebase-config-dev \
     --member="serviceAccount:${SERVICE_ACCOUNT}" \
     --role="roles/secretmanager.secretAccessor" \
     --project YOUR-PROJECT
   ```

### Issue: Deploy script fails with "NEXT_PUBLIC_FIREBASE_PROJECT_ID not set"

**Solution:**

Verify `.env.development` or `.env.production` file exists and contains the variable:

```bash
cat .env.development | grep NEXT_PUBLIC_FIREBASE_PROJECT_ID
```

### Issue: CORS errors in production

**Solution:**

1. Get your Cloud Run URL
2. Add it to `functions/src/index.ts` ALLOWED_ORIGINS
3. Redeploy functions:
   ```bash
   firebase deploy --only functions --config firebase.prod.json
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

---

## Monitoring and Maintenance

### View Cloud Build Logs

```bash
# List recent builds
gcloud builds list --project=gquiz-dev --limit=10

# View specific build logs
gcloud builds log BUILD_ID --project=gquiz-dev
```

### View Cloud Run Logs

```bash
# Stream logs
gcloud run services logs read gquiz-dev --region=europe-west4 --project=gquiz-dev

# Filter logs
gcloud run services logs read gquiz-dev --region=europe-west4 --project=gquiz-dev --filter="severity=ERROR"
```

### View Cloud Functions Logs

```bash
firebase functions:log --project gquiz-dev

# Or via gcloud
gcloud functions logs read --region=europe-west4 --project=gquiz-dev
```

### Cost Monitoring

Monitor costs in [Google Cloud Console](https://console.cloud.google.com/billing):

- Cloud Run: Pay per request
- Cloud Functions: Pay per invocation
- Cloud Build: 120 free minutes/day, then $0.003/minute
- Firestore: Free tier: 50K reads, 20K writes/day
- Cloud Storage: Free tier: 5GB

---

## Security Checklist

- [ ] Environment files (`.env.development`, `.env.production`) are gitignored
- [ ] Secrets stored in Secret Manager, not in code
- [ ] CORS origins properly configured in Cloud Functions
- [ ] Firestore security rules deployed and tested
- [ ] Storage security rules deployed and tested
- [ ] Production deployments require approval
- [ ] Branch protection enabled on `main` branch
- [ ] Only authorized users can trigger production builds
- [ ] Cloud Build service accounts have minimal required permissions
- [ ] Regular security audits of IAM roles

---

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

## Support

For issues or questions:

1. Check this documentation
2. Review [FIXES_AND_SOLUTIONS.md](./docs/FIXES_AND_SOLUTIONS.md)
3. Check Cloud Build logs
4. Review Firebase Console for errors

# gQuiz Deployment Guide

## Deployment Overview

gQuiz uses a **hybrid deployment architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                    gQuiz Application                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐         ┌───────────────────┐    │
│  │   Cloud Run      │         │  Firebase         │    │
│  │  (europe-west4)  │         │  (Backend)        │    │
│  ├──────────────────┤         ├───────────────────┤    │
│  │ • Next.js App    │◄────────┤ • Cloud Functions │    │
│  │ • React Frontend │         │ • Firestore DB    │    │
│  │ • Server Routes  │         │ • Cloud Storage   │    │
│  └──────────────────┘         └───────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Files Overview

### Deployment Configuration Files

| File | Purpose | Used For |
|------|---------|----------|
| `.gcloudignore` | Excludes files from Cloud Run buildpack deployment | Buildpack deployment (recommended) |
| `.dockerignore` | Excludes files from Docker builds | Dockerfile deployment (optional) |
| `Dockerfile` | Custom container definition | Advanced use cases only |
| `cloudbuild.yaml` | Cloud Build pipeline config | CI/CD with Dockerfile |
| `deploy.sh` | One-command deployment script | Quick manual deployment |
| `firebase.json` | Firebase services config | Firebase CLI deployment |

### What Gets Excluded from Cloud Run

Via `.gcloudignore`:

```
✅ Excluded:
- functions/                    # Cloud Functions code
- firebase.json, *.rules        # Firebase configs
- node_modules/                 # Dependencies (rebuilt)
- .next/, out/                  # Build artifacts (rebuilt)
- .env.local                    # Local env (use --set-env-vars)
- Dockerfile, cloudbuild.yaml   # Deployment configs
- *.md, docs/                   # Documentation
- .git/, .vscode/, .idea/       # Version control & IDEs

❌ Included (needed for deployment):
- src/                          # Next.js source code
- package.json, package-lock.json  # Dependencies manifest
- next.config.ts                # Next.js config
- tsconfig.json                 # TypeScript config
- tailwind.config.ts            # Tailwind config
- public/                       # Static assets
```

## Deployment Methods

### Method 1: One-Command Script (Easiest) ⭐

```bash
./deploy.sh
```

**What it does:**
1. Validates prerequisites (Firebase CLI, gcloud CLI)
2. Checks `.env.local` exists
3. Builds Cloud Functions
4. Deploys Firestore rules
5. Deploys Cloud Functions to europe-west4
6. Deploys Cloud Run to europe-west4 using buildpacks
7. Shows next steps and useful links

**Pros:**
- Single command deployment
- Interactive region selection
- Validation checks
- Helpful output

**Cons:**
- Manual execution required

---

### Method 2: Manual Step-by-Step

#### Step 1: Deploy Firebase Services

```bash
# Build Cloud Functions
cd functions
npm install
npm run build
cd ..

# Deploy Firestore rules
firebase deploy --only firestore:rules --project YOUR_PROJECT_ID

# Deploy Storage rules (if needed)
firebase deploy --only storage:rules --project YOUR_PROJECT_ID

# Deploy Cloud Functions
firebase deploy --only functions --project YOUR_PROJECT_ID
```

#### Step 2: Deploy to Cloud Run

```bash
# Set project
gcloud config set project YOUR_PROJECT_ID

# Deploy with buildpacks (recommended)
# Note: Use --update-build-env-vars for build-time AND --set-env-vars for runtime
gcloud run deploy gquiz \
  --source . \
  --platform managed \
  --region europe-west4 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_API_KEY=... \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=... \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_PROJECT_ID=... \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=... \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=... \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_APP_ID=... \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=... \
  --set-env-vars NEXT_PUBLIC_FIREBASE_API_KEY=... \
  --set-env-vars NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=... \
  --set-env-vars NEXT_PUBLIC_FIREBASE_PROJECT_ID=... \
  --set-env-vars NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=... \
  --set-env-vars NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=... \
  --set-env-vars NEXT_PUBLIC_FIREBASE_APP_ID=... \
  --set-env-vars NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
```

**Pros:**
- Full control over each step
- Can skip already-deployed services
- Easy to debug issues

**Cons:**
- Multiple commands
- Manual environment variable management

---

### Method 3: Cloud Build CI/CD

#### GitHub Actions Setup

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run and Firebase

on:
  push:
    branches:
      - main

env:
  PROJECT_ID: your-project-id
  REGION: europe-west4

jobs:
  deploy-firebase:
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.modified, 'functions/') || contains(github.event.head_commit.modified, '*.rules')

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install Firebase CLI
        run: npm install -g firebase-tools

      - name: Build Functions
        run: |
          cd functions
          npm ci
          npm run build

      - name: Deploy to Firebase
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
        run: |
          firebase deploy --only functions,firestore:rules --token "$FIREBASE_TOKEN"

  deploy-cloud-run:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ env.PROJECT_ID }}

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy gquiz \
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

**Setup Secrets in GitHub:**
1. Go to Repository Settings > Secrets and variables > Actions
2. Add secrets:
   - `GCP_SA_KEY`: Service account JSON key
   - `FIREBASE_TOKEN`: Run `firebase login:ci` locally
   - All `FIREBASE_*` environment variables

**Pros:**
- Automatic deployment on push
- No manual intervention needed
- Consistent deployments
- Audit trail via Git

**Cons:**
- Initial setup complexity
- Requires GitHub Actions knowledge
- Secret management needed

---

## Buildpacks vs Dockerfile

### Buildpacks (Recommended) ✅

**When to use:**
- Standard Next.js deployment
- Want automatic updates to build tooling
- Prefer simplicity over control
- Trust Google's build optimizations

**How it works:**
```bash
gcloud run deploy --source .
```

1. Uploads source code (respects `.gcloudignore`)
2. Cloud Build detects Next.js
3. Uses Google's Node.js buildpack
4. Automatically runs `npm install` and `npm run build`
5. Creates optimized container
6. Deploys to Cloud Run

**Advantages:**
- ✅ No Dockerfile to maintain
- ✅ Automatic security updates
- ✅ Google-optimized builds
- ✅ Simpler configuration

**Disadvantages:**
- ❌ Less control over build process
- ❌ Can't customize base image
- ❌ Limited to buildpack capabilities

---

### Dockerfile (Advanced)

**When to use:**
- Need custom build steps
- Want to optimize image size manually
- Need specific Node.js version not in buildpacks
- Require additional system packages

**How it works:**
```bash
gcloud builds submit --config cloudbuild.yaml
```

1. Uses your custom `Dockerfile`
2. Multi-stage build for optimization
3. Full control over layers and caching
4. Can install system dependencies

**Advantages:**
- ✅ Full control over build
- ✅ Can optimize image size
- ✅ Custom base images
- ✅ Install system packages

**Disadvantages:**
- ❌ Must maintain Dockerfile
- ❌ Manual security updates
- ❌ More complex configuration
- ❌ Requires Docker knowledge

---

## Region Configuration

All services are configured for **europe-west4** (Netherlands):

| Service | Region Setting | File Location |
|---------|----------------|---------------|
| Cloud Functions | `region: 'europe-west4'` | `functions/src/index.ts:49` |
| Cloud Run | `--region europe-west4` | `deploy.sh:85`, `cloudbuild.yaml:51` |
| Firestore | Auto (project default) | Firebase Console |
| Storage | Auto (project default) | Firebase Console |

**Why europe-west4?**
- ✅ Low latency for EU users
- ✅ GDPR compliance
- ✅ Data residency in EU
- ✅ Cost-effective
- ✅ High availability

**To change region:**
1. Update `functions/src/index.ts:49` - Change region in `onCall({ region: 'YOUR_REGION' })`
2. Update `deploy.sh:35` - Change default region
3. Update `cloudbuild.yaml:51` - Change `_REGION` substitution
4. Redeploy all services

---

## Post-Deployment Checklist

After running `./deploy.sh` or manual deployment:

- [ ] **Verify Cloud Functions deployed**
  ```bash
  firebase functions:list
  ```
  Should show: `submitAnswer(europe-west4)`

- [ ] **Check Firestore rules active**
  ```bash
  firebase firestore:rules
  ```

- [ ] **Test Cloud Run URL**
  Visit: `https://gquiz-[hash]-ew.a.run.app`

- [ ] **Create host user**
  Firebase Console > Authentication > Add user

- [ ] **Test game flow**
  1. Create quiz as host
  2. Host game
  3. Join as player
  4. Submit answer (should use Cloud Function)

- [ ] **Monitor logs**
  ```bash
  # Cloud Functions
  firebase functions:log

  # Cloud Run
  gcloud run services logs read gquiz --region europe-west4
  ```

- [ ] **Verify security**
  - Try to modify score via DevTools (should fail)
  - Check Firestore rules prevent unauthorized updates
  - Confirm image uploads reject files > 5MB

---

## Troubleshooting

### "Functions not found" error

**Cause**: Cloud Function not deployed or wrong region

**Fix**:
```bash
firebase deploy --only functions
# Verify: firebase functions:list
```

### "Firebase: Error (auth/invalid-api-key)" during build

**Cause**: Environment variables not available during Next.js build phase

**Fix**: Use `--update-build-env-vars` instead of (or in addition to) `--set-env-vars`:
```bash
gcloud run deploy gquiz \
  --source . \
  --region europe-west4 \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_API_KEY=... \
  --set-env-vars NEXT_PUBLIC_FIREBASE_API_KEY=...
```

**Why both flags?**
- `--update-build-env-vars`: Available during `npm run build` (Next.js prerendering)
- `--set-env-vars`: Available at runtime (when serving requests)

### Upload is very large (>100MB)

**Cause**: `.gcloudignore` not excluding properly

**Fix**: Check `.gcloudignore` excludes:
- `node_modules/`
- `.next/`
- `functions/`

### Environment variables not working

**Cause**: Not set in Cloud Run

**Fix**:
```bash
# Check current vars
gcloud run services describe gquiz --region europe-west4

# Update if needed
gcloud run services update gquiz --region europe-west4 \
  --set-env-vars KEY=value
```

### Build fails with "standalone output required"

**Cause**: `next.config.ts` missing `output: 'standalone'`

**Fix**: Add to `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  // ...
};
```

---

## Cost Optimization

### Free Tier Limits (per month)

**Firebase:**
- Firestore: 50K reads, 20K writes, 20K deletes
- Cloud Functions: 2M invocations, 400K GB-seconds
- Storage: 5GB stored, 1GB downloaded

**Cloud Run:**
- 2M requests
- 360K GB-seconds (RAM)
- 180K vCPU-seconds

### Tips to Stay in Free Tier

1. **Set max instances**: `--max-instances 10`
2. **Scale to zero**: `--min-instances 0`
3. **Monitor usage**: Firebase Console > Usage
4. **Set budget alerts**: Cloud Console > Billing > Budgets

### Scaling for Production

For games with 100+ concurrent players:

```bash
gcloud run services update gquiz \
  --region europe-west4 \
  --max-instances 50 \
  --cpu 2 \
  --memory 1Gi
```

---

## Quick Reference

### Deploy Everything
```bash
./deploy.sh
```

### Deploy Only Functions
```bash
cd functions && npm run build && cd ..
firebase deploy --only functions
```

### Deploy Only Cloud Run
```bash
gcloud run deploy gquiz --source . --region europe-west4 \
  --set-env-vars-file .env.local
```

### View Logs
```bash
# Functions
firebase functions:log

# Cloud Run
gcloud run services logs read gquiz --region europe-west4 --limit 50

# Follow logs in real-time
gcloud run services logs tail gquiz --region europe-west4
```

### Rollback Cloud Run
```bash
# List revisions
gcloud run revisions list --service gquiz --region europe-west4

# Rollback to specific revision
gcloud run services update-traffic gquiz \
  --region europe-west4 \
  --to-revisions REVISION_NAME=100
```

---

## Support

- **Firebase Console**: https://console.firebase.google.com
- **Cloud Run Console**: https://console.cloud.google.com/run
- **Logs**: Use commands above
- **Issues**: Check `SECURITY_IMPROVEMENTS.md` and `README.md`

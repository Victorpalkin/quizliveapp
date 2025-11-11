# Deployment Resources

This directory contains all deployment-related scripts and configuration files for the gQuiz application.

## 📁 Directory Structure

```
deployment/
├── scripts/            # Deployment automation scripts
│   ├── deploy.sh       # Environment selector (run this first)
│   ├── deploy-dev.sh   # Development deployment
│   └── deploy-prod.sh  # Production deployment
│
└── configs/            # Deployment configuration files
    ├── cloudbuild.yaml # Cloud Build CI/CD pipeline
    ├── firebase.dev.json    # Firebase config for dev
    └── firebase.prod.json   # Firebase config for production
```

---

## 🚀 Quick Start

### First Time Deployment

1. **Read the deployment guide** (essential):
   ```bash
   cat ../docs/deployment/DEPLOYMENT.md
   ```

2. **Set up environment files**:
   ```bash
   cp ../.env.development.template ../.env.development
   cp ../.env.production.template ../.env.production
   # Edit both files with your Firebase credentials
   ```

3. **Run the deployment script**:
   ```bash
   ./scripts/deploy.sh
   ```

### Quick Deploy Commands

```bash
# Deploy to development
./scripts/deploy-dev.sh

# Deploy to production (requires confirmations)
./scripts/deploy-prod.sh

# Interactive menu
./scripts/deploy.sh
```

---

## 📜 Scripts Reference

### `scripts/deploy.sh` - Environment Selector

Interactive menu to choose deployment target.

**Usage:**
```bash
./scripts/deploy.sh
```

**Options:**
1. Deploy to DEVELOPMENT environment
2. Deploy to PRODUCTION environment
3. View deployment documentation
4. Exit

### `scripts/deploy-dev.sh` - Development Deployment

Deploys to the development environment.

**What it does:**
- ✅ Validates `.env.development` exists
- ✅ Builds Cloud Functions
- ✅ Deploys Firestore rules and indexes
- ✅ Deploys Storage rules
- ✅ Deploys Cloud Functions
- ✅ Deploys to Cloud Run
- ✅ Outputs deployment URL

**Usage:**
```bash
./scripts/deploy-dev.sh
```

**Requirements:**
- `.env.development` must exist in project root
- Firebase CLI installed (`npm install -g firebase-tools`)
- Google Cloud CLI installed
- Authenticated with `gcloud` and `firebase`

### `scripts/deploy-prod.sh` - Production Deployment

Deploys to the production environment with safety checks.

**Safety Features:**
- ✅ Verifies you're on `main` branch
- ✅ Verifies no uncommitted changes
- ✅ Requires double confirmation
- ✅ Higher resource limits for Cloud Run

**Usage:**
```bash
./scripts/deploy-prod.sh
```

**Requirements:**
- `.env.production` must exist in project root
- Must be on `main` branch
- Working directory must be clean (no uncommitted changes)
- Type "yes" to confirm (twice)

---

## ⚙️ Configuration Files

### `configs/cloudbuild.yaml` - CI/CD Pipeline

Defines the Cloud Build pipeline for automated deployments.

**Triggered by:**
- Push to `develop` branch → Auto-deploy to dev
- Manual trigger on `main` branch → Deploy to production

**Pipeline Steps:**
1. Install dependencies
2. Build Cloud Functions
3. Run tests (optional)
4. Deploy Firestore rules
5. Deploy Storage rules
6. Deploy Cloud Functions
7. Deploy to Cloud Run
8. Output deployment URL

**Substitution Variables:**
```yaml
_ENVIRONMENT: 'dev' or 'production'
_FIREBASE_CONFIG: 'deployment/configs/firebase.dev.json' or 'deployment/configs/firebase.prod.json'
_REGION: 'europe-west4'
_SERVICE_NAME: 'gquiz-dev' or 'gquiz-prod'
```

**Used by:** Google Cloud Build triggers (configured in Cloud Console)

### `configs/firebase.dev.json` - Development Firebase Config

Firebase CLI configuration for development environment.

**Points to:**
- Firestore rules: `firestore.rules`
- Firestore indexes: `firestore.indexes.json`
- Storage bucket: `gquiz-dev.appspot.com`
- Storage rules: `storage.rules`
- Functions source: `functions/`

**Used by:** `deploy-dev.sh`, Cloud Build (dev trigger)

### `configs/firebase.prod.json` - Production Firebase Config

Firebase CLI configuration for production environment.

**Points to:**
- Firestore rules: `firestore.rules`
- Firestore indexes: `firestore.indexes.json`
- Storage bucket: `gquiz-production.appspot.com`
- Storage rules: `storage.rules`
- Functions source: `functions/`

**Used by:** `deploy-prod.sh`, Cloud Build (prod trigger)

---

## 🔧 Common Tasks

### Update Cloud Functions CORS Origins

After first deployment, update CORS origins:

```bash
# 1. Get your Cloud Run URL
gcloud run services describe gquiz-dev --region=europe-west4 --format='value(status.url)'

# 2. Edit functions/src/index.ts
# Add the URL to ALLOWED_ORIGINS array

# 3. Redeploy functions
firebase deploy --only functions --config deployment/configs/firebase.dev.json --project gquiz-dev
```

### Troubleshoot Deployment

```bash
# Check Cloud Build logs
gcloud builds list --project=gquiz-dev --limit=5

# View specific build
gcloud builds log BUILD_ID --project=gquiz-dev

# Check Cloud Run logs
gcloud run services logs read gquiz-dev --region=europe-west4 --project=gquiz-dev

# Check Cloud Functions logs
firebase functions:log --project gquiz-dev
```

### Update Environment Variables

```bash
# 1. Edit environment file
nano ../.env.development

# 2. Update Secret Manager (for Cloud Build)
gcloud secrets versions add firebase-config-dev --data-file=../.env.development --project=gquiz-dev

# 3. Redeploy
./scripts/deploy-dev.sh
```

---

## 📖 Documentation

For detailed setup instructions and troubleshooting, see:

- **[Complete Deployment Guide](../docs/deployment/DEPLOYMENT.md)** - Step-by-step setup
- **[Quick Reference](../docs/deployment/DEPLOYMENT_SETUP_SUMMARY.md)** - Quick lookup guide
- **[Main README](../README.md)** - Project overview

---

## 🔒 Security Notes

**Never commit:**
- ❌ `.env.development`
- ❌ `.env.production`
- ❌ Any files with actual Firebase credentials

**Always use:**
- ✅ Secret Manager for Cloud Build
- ✅ Environment files in root (gitignored)
- ✅ Templates (`.env.*.template`) committed for reference

**Production Safety:**
- ✅ Manual deployments only (no auto-deploy)
- ✅ Branch verification (must be on `main`)
- ✅ Double confirmation required
- ✅ Clean working directory check

---

## ℹ️ Notes

- All scripts must be run from the project root or via `./deployment/scripts/`
- Scripts automatically change to project root before executing
- Firebase configs use paths relative to project root
- Cloud Build uses configs in `deployment/configs/`

---

**Last Updated**: 2025-11-11

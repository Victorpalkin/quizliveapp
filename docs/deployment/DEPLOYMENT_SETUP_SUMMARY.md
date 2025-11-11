# Deployment Setup - Summary

This document summarizes all the files created and changes made to set up the production and dev/test deployment infrastructure.

## What Was Implemented

✅ **Production and Dev/Test Environments**: Complete separation of environments
✅ **Automatic CI/CD Pipeline**: Cloud Build triggers for GitHub
✅ **Manual Deployment Scripts**: Scripts for local deployment
✅ **Environment Configuration**: Templates and actual config files
✅ **Visual Environment Indicators**: Badge component to distinguish environments
✅ **Comprehensive Documentation**: Complete deployment guide

---

## Files Created

### Configuration Files

| File | Purpose |
|------|---------|
| `.env.example` | Template showing all required environment variables |
| `.env.development.template` | Template for development environment |
| `.env.production.template` | Template for production environment |
| `firebase.dev.json` | Firebase configuration for development |
| `firebase.prod.json` | Firebase configuration for production |

**Note**: You need to create actual `.env.development` and `.env.production` files from the templates with your real Firebase credentials.

### Cloud Build

| File | Purpose |
|------|---------|
| `cloudbuild.yaml` | CI/CD pipeline definition for automated deployments |

**What it does**:
- Installs dependencies
- Builds Cloud Functions
- Deploys Firestore rules and indexes
- Deploys Storage rules
- Deploys Cloud Functions
- Builds and deploys to Cloud Run
- Outputs deployment URL

### Deployment Scripts

| File | Purpose |
|------|---------|
| `deploy-dev.sh` | Manual deployment to development environment |
| `deploy-prod.sh` | Manual deployment to production environment (with safety checks) |
| `deploy.sh` | Updated to be an environment selector |

All scripts are executable (`chmod +x`).

### UI Components

| File | Purpose |
|------|---------|
| `src/components/app/environment-badge.tsx` | Visual indicator showing current environment |
| `src/app/layout.tsx` | Updated to include EnvironmentBadge |

### Documentation

| File | Purpose |
|------|---------|
| `DEPLOYMENT.md` | Complete deployment guide with step-by-step instructions |
| `DEPLOYMENT_SETUP_SUMMARY.md` | This file - quick overview |

### Modified Files

| File | What Changed |
|------|--------------|
| `.gitignore` | Added proper exclusions for environment files and Cloud Build artifacts |
| `src/app/layout.tsx` | Added EnvironmentBadge component |
| `deploy.sh` | Converted to environment selector menu |

---

## Next Steps

To complete the setup, you need to:

### 1. Create Firebase Projects

Create two Firebase projects in [Firebase Console](https://console.firebase.google.com):

- `gquiz-dev` (development)
- `gquiz-production` (production)

For each project, enable:
- Authentication (Google Sign-In)
- Firestore Database
- Cloud Storage
- Cloud Functions

### 2. Create Environment Files

```bash
# Create development environment file
cp .env.development.template .env.development
# Edit .env.development with your dev Firebase credentials

# Create production environment file
cp .env.production.template .env.production
# Edit .env.production with your prod Firebase credentials
```

Get your Firebase credentials from:
- Firebase Console → Project Settings → Your Apps → Web App

### 3. Set Up Cloud Build

For each project:

```bash
# Enable APIs
gcloud config set project gquiz-dev  # or gquiz-production
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Grant permissions to Cloud Build service account
# See DEPLOYMENT.md Phase 3.2 for detailed commands
```

### 4. Store Secrets in Secret Manager

```bash
# For dev
gcloud config set project gquiz-dev
gcloud secrets create firebase-config-dev --data-file=.env.development

# For prod
gcloud config set project gquiz-production
gcloud secrets create firebase-config-production --data-file=.env.production
```

### 5. Connect GitHub Repository

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Connect your GitHub repository
3. Create triggers (see DEPLOYMENT.md Phase 5)

### 6. First Deployment

```bash
# Test dev deployment
./deploy-dev.sh

# After testing, deploy to prod
./deploy-prod.sh
```

---

## Architecture Overview

```
GitHub Repository
├── main branch      → Manual deploy to Production
└── develop branch   → Auto-deploy to Dev

Cloud Build Pipeline (cloudbuild.yaml)
├── Build & Test
├── Deploy Firebase (Firestore, Storage, Functions)
└── Deploy Cloud Run

Environments
├── Development (gquiz-dev)
│   ├── Auto-deploys on push to develop
│   ├── Shows "DEV" badge
│   └── Safe for testing
│
└── Production (gquiz-production)
    ├── Manual deployments only
    ├── No badge shown
    └── Live application
```

---

## Quick Reference

### Deploy to Development

```bash
./deploy-dev.sh
# OR
./deploy.sh  # Select option 1
```

### Deploy to Production

```bash
./deploy-prod.sh
# OR
./deploy.sh  # Select option 2
```

### View Deployment Logs

```bash
# Cloud Build logs
gcloud builds list --project=gquiz-dev

# Cloud Run logs
gcloud run services logs read gquiz-dev --region=europe-west4 --project=gquiz-dev

# Cloud Functions logs
firebase functions:log --project gquiz-dev
```

### Update Environment Variables

```bash
# 1. Edit .env.development or .env.production
nano .env.development

# 2. Update Secret Manager
gcloud secrets versions add firebase-config-dev --data-file=.env.development --project=gquiz-dev

# 3. Redeploy
./deploy-dev.sh
```

---

## Environment Variables Reference

All environment files need these variables:

```bash
# Firebase Project Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Environment Identifier
NEXT_PUBLIC_ENVIRONMENT=  # 'development' or 'production'

# Deployment Configuration
GCP_REGION=europe-west4
CLOUD_RUN_SERVICE_NAME=  # 'gquiz-dev' or 'gquiz-prod'
```

---

## Workflow Examples

### Daily Development

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "Add new feature"

# 3. Push to GitHub
git push origin feature/new-feature

# 4. Create PR to develop
# Merge PR → auto-deploys to dev

# 5. Test in dev environment
# Visit: https://gquiz-dev-XXX.run.app

# 6. If tests pass, merge develop to main
# Deploy to production manually
./deploy-prod.sh
```

### Hotfix Production

```bash
# 1. Create hotfix from main
git checkout -b hotfix/critical-bug

# 2. Fix and commit
git add .
git commit -m "Fix: Critical bug"

# 3. Deploy to production
git checkout main
git merge hotfix/critical-bug
./deploy-prod.sh

# 4. Merge back to develop
git checkout develop
git merge main
```

---

## Security Reminders

✅ **Never commit** `.env.development` or `.env.production`
✅ **Always use** Secret Manager for sensitive data
✅ **Enable branch protection** on `main` branch
✅ **Require PR reviews** before merging to main
✅ **Update CORS origins** after first deployment
✅ **Monitor Cloud Build** logs for unauthorized access
✅ **Use manual triggers** for production deployments

---

## Cost Estimates

**Development Environment** (typical usage):
- Cloud Run: ~$2-5/month
- Cloud Functions: Usually within free tier
- Firestore: Usually within free tier
- Storage: Usually within free tier
- Cloud Build: 120 free minutes/day

**Production Environment**:
- Depends on traffic
- Monitor in [Cloud Console Billing](https://console.cloud.google.com/billing)

---

## Support and Documentation

- **Full Deployment Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Bug Fixes & Solutions**: See [docs/FIXES_AND_SOLUTIONS.md](./docs/FIXES_AND_SOLUTIONS.md)
- **Firebase Console**: https://console.firebase.google.com
- **Cloud Build Console**: https://console.cloud.google.com/cloud-build
- **Cloud Run Console**: https://console.cloud.google.com/run

---

## Verification Checklist

After completing the setup, verify:

- [ ] Two Firebase projects created (dev and prod)
- [ ] `.env.development` created with dev credentials
- [ ] `.env.production` created with prod credentials
- [ ] Cloud Build API enabled on both projects
- [ ] Cloud Build service accounts have correct permissions
- [ ] Secrets created in Secret Manager for both environments
- [ ] GitHub repository connected to Cloud Build
- [ ] Cloud Build triggers created (dev auto, prod manual)
- [ ] First manual dev deployment successful
- [ ] CORS origins updated in Cloud Functions
- [ ] Auto-deployment tested (push to develop)
- [ ] First manual prod deployment successful
- [ ] Environment badge shows "DEV" in dev environment
- [ ] Environment badge hidden in production
- [ ] All deployment URLs documented

---

**Ready to deploy?** Follow [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed step-by-step instructions!

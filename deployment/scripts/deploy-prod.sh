#!/bin/bash

# gQuiz Production Environment Deployment Script
# This script deploys the application to the production environment
# WARNING: This affects the live production application!

set -e  # Exit on error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the project root directory (two levels up from deployment/scripts/)
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Change to project root
cd "$ROOT_DIR"

echo "🚀 gQuiz PRODUCTION Deployment"
echo "=============================="
echo ""
echo "⚠️  WARNING: This will deploy to PRODUCTION!"
echo "⚠️  This affects the live application and real users!"
echo ""

# Configuration
ENVIRONMENT="production"
FIREBASE_CONFIG="firebase.prod.json"
REGION="europe-west4"

# Safety check: Ensure we're on main branch
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
if [ "$BRANCH" != "main" ]; then
    echo "❌ SAFETY CHECK FAILED!"
    echo "Production deployments must be from 'main' branch."
    echo "Current branch: $BRANCH"
    echo ""
    echo "To deploy to production:"
    echo "  git checkout main"
    echo "  git pull origin main"
    echo "  ./deploy-prod.sh"
    exit 1
fi

# Safety check: Ensure working directory is clean
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    echo "❌ SAFETY CHECK FAILED!"
    echo "Working directory has uncommitted changes."
    echo "Please commit or stash your changes before deploying to production."
    echo ""
    git status
    exit 1
fi

# Check if required tools are installed
command -v firebase >/dev/null 2>&1 || { echo "❌ Firebase CLI is not installed. Install with: npm install -g firebase-tools"; exit 1; }
command -v gcloud >/dev/null 2>&1 || { echo "❌ Google Cloud CLI is not installed. Visit: https://cloud.google.com/sdk/docs/install"; exit 1; }

# Check if .env.production exists
if [ ! -f "$ROOT_DIR/.env.production" ]; then
    echo "❌ .env.production file not found!"
    echo "Please create .env.production with your Firebase production project configuration."
    echo "You can copy from .env.production.template:"
    echo "  cp .env.production.template .env.production"
    echo "Then edit .env.production with your actual Firebase credentials."
    exit 1
fi

# Load environment variables
echo "📋 Loading production environment variables..."
source "$ROOT_DIR/.env.production"

# Extract project ID from environment
if [ -z "$NEXT_PUBLIC_FIREBASE_PROJECT_ID" ]; then
    echo "❌ NEXT_PUBLIC_FIREBASE_PROJECT_ID not set in .env.production"
    exit 1
fi

PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
SERVICE_NAME=${CLOUD_RUN_SERVICE_NAME:-gquiz-prod}

echo ""
echo "📋 Deployment Configuration:"
echo "   Environment: $ENVIRONMENT"
echo "   Project ID: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Service Name: $SERVICE_NAME"
echo "   Firebase Config: $FIREBASE_CONFIG"
echo "   Branch: $BRANCH"
echo "   Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
echo ""
echo "⚠️  This will update the LIVE PRODUCTION application!"
echo ""
read -p "Type 'yes' to continue with production deployment: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "🔐 Final confirmation required!"
read -p "Are you absolutely sure you want to deploy to PRODUCTION? (yes/no) " -r
echo ""

if [[ ! $REPLY =~ ^yes$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Set GCP project
echo ""
echo "🔧 Setting GCP project..."
gcloud config set project $PROJECT_ID

echo ""
echo "Step 1: Building Cloud Functions..."
echo "===================================="
cd functions
echo "Installing dependencies..."
npm install
echo "Building functions..."
npm run build
cd ..
echo "✅ Cloud Functions built successfully"

echo ""
echo "Step 2: Deploying Firebase Services..."
echo "========================================"
echo "Deploying Firestore rules and indexes..."
firebase deploy --only firestore --config $FIREBASE_CONFIG --project $PROJECT_ID

echo "Deploying Storage rules..."
firebase deploy --only storage --config $FIREBASE_CONFIG --project $PROJECT_ID

echo "Deploying Cloud Functions to $REGION..."
firebase deploy --only functions --config $FIREBASE_CONFIG --project $PROJECT_ID

echo "✅ Firebase services deployed successfully"

echo ""
echo "Step 3: Deploying to Cloud Run..."
echo "=================================="
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --platform managed \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 100 \
  --min-instances 1 \
  --set-env-vars NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
  --set-env-vars NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
  --set-env-vars NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
  --set-env-vars NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
  --set-env-vars NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
  --set-env-vars NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
  --set-env-vars NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID \
  --set-env-vars NEXT_PUBLIC_ENVIRONMENT=$ENVIRONMENT \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID \
  --update-build-env-vars NEXT_PUBLIC_ENVIRONMENT=$ENVIRONMENT

echo ""
echo "✅ Production Deployment Complete!"
echo ""

# Get and display Cloud Run URL
CLOUD_RUN_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)' 2>/dev/null)

if [ ! -z "$CLOUD_RUN_URL" ]; then
    echo "🌐 Production URL: $CLOUD_RUN_URL"
    echo ""
fi

echo "🔒 SECURITY: Update CORS Origins"
echo "================================="
echo "IMPORTANT: Ensure your Cloud Run URL is in Cloud Functions CORS allowed origins:"
echo "   1. Check functions/src/index.ts ALLOWED_ORIGINS array"
echo "   2. Add '${CLOUD_RUN_URL}' if not present"
echo "   3. Redeploy functions if needed: firebase deploy --only functions --config $FIREBASE_CONFIG"
echo ""

echo "📝 Post-Deployment Checklist:"
echo "1. ✓ Verify production deployment: $CLOUD_RUN_URL"
echo "2. ✓ Test critical user flows (login, create quiz, host game, join game)"
echo "3. ✓ Check Cloud Functions logs: firebase functions:log --project $PROJECT_ID"
echo "4. ✓ Monitor Cloud Run logs: gcloud run services logs read $SERVICE_NAME --region $REGION"
echo "5. ✓ Monitor error rates in Cloud Console"
echo "6. ✓ Verify CORS configuration is correct"
echo "7. ✓ Tag this release: git tag -a v1.x.x -m 'Production release v1.x.x'"
echo ""
echo "🔗 Useful Links:"
echo "   Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID"
echo "   Cloud Run Console: https://console.cloud.google.com/run?project=$PROJECT_ID"
echo "   Cloud Functions Logs: https://console.cloud.google.com/functions/list?project=$PROJECT_ID"
echo ""

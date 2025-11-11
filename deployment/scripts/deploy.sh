#!/bin/bash

# gQuiz Deployment Script - Environment Selector
# This script helps you choose the correct deployment method
#
# For automatic CI/CD setup and detailed instructions, see DEPLOYMENT.md

set -e  # Exit on error

echo "🚀 gQuiz Deployment - Environment Selector"
echo "==========================================="
echo ""
echo "This project now supports separate dev and production environments."
echo ""
echo "Deployment Options:"
echo "  1) Deploy to DEVELOPMENT environment"
echo "  2) Deploy to PRODUCTION environment"
echo "  3) View deployment documentation"
echo "  4) Exit"
echo ""
read -p "Select option (1-4): " option
echo ""

case $option in
  1)
    echo "🔧 Launching development deployment..."
    echo ""
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ ! -f "$SCRIPT_DIR/deploy-dev.sh" ]; then
      echo "❌ deploy-dev.sh not found!"
      exit 1
    fi
    exec "$SCRIPT_DIR/deploy-dev.sh"
    ;;
  2)
    echo "⚠️  Launching PRODUCTION deployment..."
    echo ""
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ ! -f "$SCRIPT_DIR/deploy-prod.sh" ]; then
      echo "❌ deploy-prod.sh not found!"
      exit 1
    fi
    exec "$SCRIPT_DIR/deploy-prod.sh"
    ;;
  3)
    echo "📖 Opening deployment documentation..."
    echo ""
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
    if [ -f "$ROOT_DIR/docs/deployment/DEPLOYMENT.md" ]; then
      ${PAGER:-less} "$ROOT_DIR/docs/deployment/DEPLOYMENT.md"
    else
      echo "❌ DEPLOYMENT.md not found!"
      echo ""
      echo "Quick guide:"
      echo "  • For dev: deployment/scripts/deploy-dev.sh"
      echo "  • For prod: deployment/scripts/deploy-prod.sh"
      echo "  • See README.md for more info"
    fi
    exit 0
    ;;
  4)
    echo "Deployment cancelled."
    exit 0
    ;;
  *)
    echo "❌ Invalid option. Please run ./deploy.sh again and select 1-4."
    exit 1
    ;;
esac

# Legacy deployment code below (kept for reference)
# ================================================
# This is the old single-environment deployment
# It's kept here for reference but should not be used
# ================================================

exit 0  # Exit before legacy code

# OLD CODE BELOW - DO NOT USE
# ============================

# Check if required tools are installed
command -v firebase >/dev/null 2>&1 || { echo "❌ Firebase CLI is not installed. Install with: npm install -g firebase-tools"; exit 1; }
command -v gcloud >/dev/null 2>&1 || { echo "❌ Google Cloud CLI is not installed. Visit: https://cloud.google.com/sdk/docs/install"; exit 1; }

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found!"
    echo "Please create .env.local with your Firebase configuration."
    exit 1
fi

# Load environment variables
source .env.local

# Prompt for project ID if not set
if [ -z "$NEXT_PUBLIC_FIREBASE_PROJECT_ID" ]; then
    read -p "Enter your Firebase/GCP Project ID: " PROJECT_ID
else
    PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
fi

# Prompt for deployment region
read -p "Enter deployment region (default: europe-west4): " REGION
REGION=${REGION:-europe-west4}

echo ""
echo "📋 Deployment Configuration:"
echo "   Project ID: $PROJECT_ID"
echo "   Region: $REGION"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "Step 1: Building Cloud Functions..."
echo "===================================="
cd functions
npm install
npm run build
cd ..
echo "✅ Cloud Functions built successfully"

echo ""
echo "Step 2: Deploying Firebase Services..."
echo "========================================"
echo "Deploying Firestore rules and indexes..."
firebase deploy --only firestore --project $PROJECT_ID

# echo "Deploying Storage rules..."
firebase deploy --only storage --project $PROJECT_ID

echo "Deploying Cloud Functions to $REGION..."
firebase deploy --only functions --project $PROJECT_ID

echo "✅ Firebase services deployed successfully"

echo ""
echo "Step 3: Deploying to Cloud Run..."
echo "=================================="
gcloud config set project $PROJECT_ID

gcloud run deploy gquiz \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
  --update-build-env-vars NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID \
  --set-env-vars NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
  --set-env-vars NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
  --set-env-vars NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
  --set-env-vars NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
  --set-env-vars NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
  --set-env-vars NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
  --set-env-vars NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

echo ""
echo "✅ Deployment Complete!"
echo ""

# Get and display Cloud Run URL
CLOUD_RUN_URL=$(gcloud run services describe gquiz --region=$REGION --format='value(status.url)' 2>/dev/null)

if [ ! -z "$CLOUD_RUN_URL" ]; then
    echo "🌐 Application URL: $CLOUD_RUN_URL"
    echo ""
fi

echo "🔒 SECURITY: Update CORS Origins"
echo "================================="
echo "IMPORTANT: Add your Cloud Run URL to Cloud Functions CORS allowed origins:"
echo "   1. Edit functions/src/index.ts"
echo "   2. Add '${CLOUD_RUN_URL}' to ALLOWED_ORIGINS array"
echo "   3. Redeploy functions: firebase deploy --only functions"
echo ""
echo "Or run: ./functions/update-cors-origins.sh"
echo ""
echo "📝 Next Steps:"
echo "1. Create a host user in Firebase Authentication Console"
echo "2. Visit your Cloud Run URL to test the application"
echo "3. Check Cloud Functions logs: firebase functions:log"
echo "4. Monitor Cloud Run logs: gcloud run services logs read gquiz --region $REGION"
echo ""
echo "🔗 Useful Links:"
echo "   Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID"
echo "   Cloud Run Console: https://console.cloud.google.com/run?project=$PROJECT_ID"
echo ""

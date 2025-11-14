#!/bin/bash

# gQuiz Development Environment Deployment Script
# This script deploys the application to the dev/test environment

set -e  # Exit on error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the project root directory (two levels up from deployment/scripts/)
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Change to project root
cd "$ROOT_DIR"

echo "🚀 gQuiz Development Deployment"
echo "==============================="
echo ""

# Configuration
ENVIRONMENT="dev"
FIREBASE_CONFIG="firebase.dev.json"
REGION="europe-west4"

# Check if required tools are installed
command -v firebase >/dev/null 2>&1 || { echo "❌ Firebase CLI is not installed. Install with: npm install -g firebase-tools"; exit 1; }
command -v gcloud >/dev/null 2>&1 || { echo "❌ Google Cloud CLI is not installed. Visit: https://cloud.google.com/sdk/docs/install"; exit 1; }

# Check if .env.development exists
if [ ! -f "$ROOT_DIR/.env.development" ]; then
    echo "❌ .env.development file not found!"
    echo "Please create .env.development with your Firebase dev project configuration."
    echo "You can copy from .env.development.template:"
    echo "  cp .env.development.template .env.development"
    echo "Then edit .env.development with your actual Firebase credentials."
    exit 1
fi

# Load environment variables
echo "📋 Loading development environment variables..."
source "$ROOT_DIR/.env.development"

# Extract project ID from environment
if [ -z "$NEXT_PUBLIC_FIREBASE_PROJECT_ID" ]; then
    echo "❌ NEXT_PUBLIC_FIREBASE_PROJECT_ID not set in .env.development"
    exit 1
fi

PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
SERVICE_NAME=${CLOUD_RUN_SERVICE_NAME:-gquiz-dev}

echo ""
echo "📋 Deployment Configuration:"
echo "   Environment: $ENVIRONMENT"
echo "   Project ID: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Service Name: $SERVICE_NAME"
echo "   Firebase Config: $FIREBASE_CONFIG"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
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
  --max-instances 10 \
  --min-instances 0 \
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
echo "✅ Deployment Complete!"
echo ""

# Get and display Cloud Run URL
CLOUD_RUN_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)' 2>/dev/null)

if [ ! -z "$CLOUD_RUN_URL" ]; then
    echo "🌐 Application URL: $CLOUD_RUN_URL"
    echo ""
fi

echo "📝 Next Steps:"
echo "1. Test the dev environment at: $CLOUD_RUN_URL"
echo "2. Check Cloud Functions logs: firebase functions:log --project $PROJECT_ID"
echo "3. Monitor Cloud Run logs: gcloud run services logs read $SERVICE_NAME --region $REGION"
echo "4. If everything looks good, you can merge your changes to trigger auto-deployment"
echo ""
echo "🔗 Useful Links:"
echo "   Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID"
echo "   Cloud Run Console: https://console.cloud.google.com/run?project=$PROJECT_ID"
echo ""

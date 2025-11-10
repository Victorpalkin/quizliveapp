#!/bin/bash

# gQuiz Deployment Script
# This script helps deploy the gQuiz application to Google Cloud Run and Firebase

set -e  # Exit on error

echo "🚀 gQuiz Deployment Script"
echo "=========================="
echo ""

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
echo "Deploying Firestore rules..."
firebase deploy --only firestore:rules --project $PROJECT_ID

# echo "Deploying Storage rules..."
# firebase deploy --only storage:rules --project $PROJECT_ID

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

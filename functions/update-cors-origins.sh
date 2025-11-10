#!/bin/bash

# Helper script to get Cloud Run URL and update CORS allowed origins
# Run this after deploying to Cloud Run for the first time

set -e

echo "🔒 CORS Origin Configuration Helper"
echo "===================================="
echo ""

# Get project ID
if [ -z "$NEXT_PUBLIC_FIREBASE_PROJECT_ID" ]; then
    read -p "Enter your GCP Project ID: " PROJECT_ID
else
    PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
fi

# Get region
read -p "Enter deployment region (default: europe-west4): " REGION
REGION=${REGION:-europe-west4}

echo ""
echo "Fetching Cloud Run service URL..."

# Get Cloud Run URL
CLOUD_RUN_URL=$(gcloud run services describe gquiz --region=$REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null)

if [ -z "$CLOUD_RUN_URL" ]; then
    echo "❌ Cloud Run service 'gquiz' not found in region $REGION"
    echo "   Please deploy to Cloud Run first using ./deploy.sh"
    exit 1
fi

echo "✅ Found Cloud Run URL: $CLOUD_RUN_URL"
echo ""
echo "📝 Add this URL to ALLOWED_ORIGINS in functions/src/index.ts:"
echo ""
echo "   '${CLOUD_RUN_URL}',"
echo ""
echo "Current ALLOWED_ORIGINS should include:"
echo "   - http://localhost:3000  (development)"
echo "   - http://localhost:3001  (alternative port)"
echo "   - https://localhost:3000 (local HTTPS)"
echo "   - ${CLOUD_RUN_URL}       (production)"
echo ""
echo "After updating, redeploy Cloud Functions:"
echo "   firebase deploy --only functions --project $PROJECT_ID"
echo ""

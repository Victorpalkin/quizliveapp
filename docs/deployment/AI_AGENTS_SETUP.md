# AI Agents Database Setup Guide

This guide covers setting up the AI Agents database for the Agentic Use Cases Collection feature in Thoughts Gathering.

## Overview

The Agentic Use Cases Collection feature enables matching collected topics with AI agents from the tracker database using vector embeddings and semantic search. When enabled, it:

1. Matches each topic group with the top 3 semantically similar AI agents
2. Displays matching agents inline with topic groups
3. Shows the top 5 most mature agents across all matches

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   AI Agent Tracker TSV                       │
│                   (~3,181 agents)                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ import-ai-agents.ts
┌─────────────────────────────────────────────────────────────┐
│                   Vertex AI Embeddings                       │
│                   (gemini-embedding-001)                     │
│                   1536 dimensions per agent                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               Firestore 'aiAgents' Collection                │
│                                                              │
│  Document structure:                                         │
│  {                                                           │
│    uniqueId: string,                                         │
│    agentName: string,                                        │
│    aiClass: string,                                          │
│    aiType: string,                                           │
│    functionalArea: string,                                   │
│    department: string,                                       │
│    industry: string,                                         │
│    summary: string,                                          │
│    referenceLink: string,                                    │
│    maturity: number,                                         │
│    score: number,                                            │
│    embedding: FieldValue.vector([...])  // 1536 dims         │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ findNearest() query
┌─────────────────────────────────────────────────────────────┐
│                   extractTopics Function                     │
│                                                              │
│  For each topic:                                             │
│  1. Generate embedding for topic text                        │
│  2. Query aiAgents with vector similarity                    │
│  3. Return top 3 matching agents                             │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Node.js 20+
- Firebase CLI installed and configured
- GCP project with Vertex AI API enabled
- Service account with required roles

### Required GCP APIs

Enable the following APIs in your GCP project:

```bash
gcloud services enable aiplatform.googleapis.com
gcloud services enable firestore.googleapis.com
```

### Required IAM Roles

The service account needs:
- `roles/aiplatform.user` - For Vertex AI Embeddings API
- `roles/datastore.user` - For Firestore access

## Setup Steps

### 1. Install Script Dependencies

Navigate to the scripts directory and install dependencies:

```bash
cd scripts
npm install
```

### 2. Configure Environment

Set the required environment variables:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export GCLOUD_PROJECT=your-project-id
```

Or use the default application credentials:

```bash
gcloud auth application-default login
gcloud config set project your-project-id
```

### 3. Create Firestore Vector Index

Create the vector index for semantic search. This is required before querying:

```bash
gcloud firestore indexes composite create \
  --collection-group=aiAgents \
  --query-scope=COLLECTION \
  --field-config field-path=embedding,vector-config='{"dimension":"1536","flat": {}}'
```

**Note:** Index creation takes 10-30 minutes. You can check the status in the Firebase Console under Firestore > Indexes.

### 4. Run the Import Script

Run the import script to populate the aiAgents collection:

```bash
cd scripts
npx tsx import-ai-agents.ts
```

The script will:
- Parse the TSV file from `docs/AI Agent tracker - AI Agent tracker.tsv`
- Generate embeddings for each agent using Vertex AI
- Store agents in the `aiAgents` Firestore collection
- Display progress logs

**Expected duration:** 15-30 minutes for 3000+ agents due to embedding API rate limits.

### 5. Verify Import

Check in Firebase Console:

1. Navigate to Firestore > `aiAgents` collection
2. Verify document count (~3181)
3. Sample a document to confirm:
   - `embedding` field exists with 1536 values
   - All required fields are populated

## Updating Agent Data

### Force Reimport (Delete and Reimport All)

```bash
npx tsx import-ai-agents.ts --force
```

This deletes all existing documents and reimports from the TSV file.

### Incremental Update (New Agents Only)

```bash
npx tsx import-ai-agents.ts --incremental
```

This only imports agents that don't already exist in the collection.

## Troubleshooting

### "Quota exceeded" errors

The Vertex AI Embeddings API has rate limits. The import script includes automatic retry with exponential backoff. If issues persist:

1. Check your project quotas in GCP Console
2. Increase the `EMBEDDING_DELAY_MS` value in the script
3. Run in smaller batches using the `--incremental` flag

### "Index not ready" errors

Vector index creation can take up to 30 minutes. Check index status:

1. Firebase Console > Firestore > Indexes
2. Look for the `aiAgents` composite index
3. Wait for status to show "Enabled"

### "Permission denied" errors

Ensure your service account has the required roles:

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

### Missing embeddings

If some documents are missing the `embedding` field, run a force reimport:

```bash
npx tsx import-ai-agents.ts --force
```

## Cost Estimate

### One-time Import
- Embedding generation: ~$0.50-1.00 (for 3181 agents)
- Firestore writes: ~$0.05 (3181 documents)

### Runtime Usage
- Embedding per topic: ~$0.0001 per query
- Firestore reads: ~$0.0001 per 3-document read
- Expected per session: $0.01-0.05 depending on topic count

### Monthly Storage
- Firestore documents: ~$0.01/month (3000 documents)

## Using the Feature

### Enable for a Thoughts Gathering Activity

1. Create or edit a Thoughts Gathering activity
2. Enable the "Agentic Use Cases Collection" toggle
3. Save the activity

### View Results

After analyzing submissions:

1. Each topic group shows matched AI agents inline
2. The "Top Mature AI Agents" card shows the 5 most mature matches
3. Export includes all agent matches in the markdown file

## Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - General deployment guide
- [Functions README](../../functions-ai/README.md) - Cloud Functions documentation

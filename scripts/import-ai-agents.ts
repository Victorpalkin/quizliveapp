/**
 * Import AI Agents from TSV file into Firestore with vector embeddings
 *
 * This script:
 * 1. Parses the AI Agent Tracker TSV file
 * 2. Generates embeddings using Vertex AI (text-embedding-004)
 * 3. Stores agents in Firestore 'aiAgents' collection with FieldValue.vector()
 *
 * Usage:
 *   npx tsx import-ai-agents.ts           # Full import
 *   npx tsx import-ai-agents.ts --force   # Force reimport (deletes existing)
 *   npx tsx import-ai-agents.ts --incremental   # Only import new/changed agents
 *
 * Prerequisites:
 *   - GOOGLE_APPLICATION_CREDENTIALS set to service account key
 *   - Firestore vector index created for 'aiAgents' collection
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TSV_FILE_PATH = path.join(__dirname, '../docs/AI Agent tracker - AI Agent tracker.tsv');
const COLLECTION_NAME = 'aiAgents';
const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSION = 768; // text-embedding-004 outputs 768 dimensions (within Firestore's 2048 limit)
const BATCH_SIZE = 50; // Number of documents to write in a batch
const EMBEDDING_DELAY_MS = 100; // Delay between embedding requests to avoid rate limiting

interface AIAgent {
  uniqueId: string;
  agentName: string;
  aiClass: string;
  aiType: string;
  functionalArea: string;
  department: string;
  industry: string;
  summary: string;
  referenceLink: string;
  maturity: number;
  score: number;
}

interface TSVRow {
  unique_id: string;
  ai_class: string;
  ai_type: string;
  agent_name: string;
  functional_area: string;
  department: string;
  industry: string;
  summary: string;
  references: string;
  maturity: string;
  score: string;
}

/**
 * Parse TSV file into array of objects
 */
function parseTSV(filePath: string): TSVRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  if (lines.length < 2) {
    throw new Error('TSV file must have at least a header row and one data row');
  }

  // Parse header
  const headers = lines[0].split('\t').map(h => h.trim());

  // Parse data rows
  const rows: TSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split('\t');
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });

    rows.push(row as unknown as TSVRow);
  }

  return rows;
}

/**
 * Convert TSV row to AIAgent object
 */
function rowToAgent(row: TSVRow): AIAgent {
  return {
    uniqueId: row.unique_id,
    agentName: row.agent_name || 'Unknown Agent',
    aiClass: row.ai_class || '',
    aiType: row.ai_type || '',
    functionalArea: row.functional_area || '',
    department: row.department || '',
    industry: row.industry || '',
    summary: row.summary || '',
    referenceLink: row.references || '',
    maturity: parseInt(row.maturity) || 0,
    score: parseInt(row.score) || 0,
  };
}

/**
 * Generate text for embedding (combines key fields)
 */
function getEmbeddingText(agent: AIAgent): string {
  const parts = [
    agent.agentName,
    agent.summary,
    agent.functionalArea,
    agent.industry,
    agent.aiType,
    agent.department,
  ].filter(Boolean);

  return parts.join(' ').substring(0, 8000); // Limit text length for embedding
}

/**
 * Generate embedding for text using Vertex AI
 */
async function generateEmbedding(client: GoogleGenAI, text: string): Promise<number[]> {
  const response = await client.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [{ role: 'user', parts: [{ text }] }],
  });

  const embedding = response.embeddings?.[0]?.values;
  if (!embedding || embedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Invalid embedding response: expected ${EMBEDDING_DIMENSION} dimensions`);
  }

  return embedding;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main import function
 */
async function importAgents(options: { force?: boolean; incremental?: boolean } = {}) {
  console.log('='.repeat(60));
  console.log('AI Agents Import Script');
  console.log('='.repeat(60));

  // Initialize Firebase Admin
  if (!getApps().length) {
    initializeApp();
  }
  const db = getFirestore();

  // Initialize Vertex AI client
  const project = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  if (!project) {
    throw new Error('GCLOUD_PROJECT or GOOGLE_CLOUD_PROJECT environment variable is required');
  }

  console.log(`Using GCP project: ${project}`);

  const genaiClient = new GoogleGenAI({
    vertexai: true,
    project,
    location: 'us-central1', // Embeddings API works best in us-central1
  });

  // Parse TSV file
  console.log(`\nParsing TSV file: ${TSV_FILE_PATH}`);
  const rows = parseTSV(TSV_FILE_PATH);
  console.log(`Found ${rows.length} agents in TSV file`);

  // Convert to agents
  const agents = rows.map(rowToAgent);

  // Handle force mode - delete all existing documents
  if (options.force) {
    console.log('\n--force flag detected: Deleting all existing agents...');
    const existingDocs = await db.collection(COLLECTION_NAME).listDocuments();
    const deletePromises = existingDocs.map(doc => doc.delete());
    await Promise.all(deletePromises);
    console.log(`Deleted ${existingDocs.length} existing documents`);
  }

  // Handle incremental mode - get existing document IDs
  let existingIds = new Set<string>();
  if (options.incremental) {
    console.log('\n--incremental flag detected: Checking for existing agents...');
    const existingDocs = await db.collection(COLLECTION_NAME).select().get();
    existingIds = new Set(existingDocs.docs.map(doc => doc.id));
    console.log(`Found ${existingIds.size} existing agents`);
  }

  // Process agents in batches
  console.log('\nProcessing agents...');
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < agents.length; i += BATCH_SIZE) {
    const batch = agents.slice(i, i + BATCH_SIZE);
    const writeBatch = db.batch();
    let batchCount = 0;

    for (const agent of batch) {
      // Skip if incremental and already exists
      if (options.incremental && existingIds.has(agent.uniqueId)) {
        skipped++;
        continue;
      }

      try {
        // Generate embedding
        const embeddingText = getEmbeddingText(agent);
        const embedding = await generateEmbedding(genaiClient, embeddingText);

        // Add to batch
        const docRef = db.collection(COLLECTION_NAME).doc(agent.uniqueId);
        writeBatch.set(docRef, {
          ...agent,
          embedding: FieldValue.vector(embedding),
          updatedAt: FieldValue.serverTimestamp(),
        });

        batchCount++;
        processed++;

        // Rate limiting delay
        await sleep(EMBEDDING_DELAY_MS);

      } catch (error) {
        console.error(`Error processing agent ${agent.uniqueId}: ${error}`);
        errors++;
      }
    }

    // Commit batch
    if (batchCount > 0) {
      await writeBatch.commit();
      console.log(`Progress: ${processed}/${agents.length} agents processed (${skipped} skipped, ${errors} errors)`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Import Complete!');
  console.log('='.repeat(60));
  console.log(`Total agents in TSV: ${agents.length}`);
  console.log(`Successfully imported: ${processed}`);
  console.log(`Skipped (already exist): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log('\nNext steps:');
  console.log('1. Verify import in Firebase Console > Firestore > aiAgents collection');
  console.log('2. Ensure vector index is created (see AI_AGENTS_SETUP.md)');
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  force: args.includes('--force'),
  incremental: args.includes('--incremental'),
};

// Run import
importAgents(options)
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFatal error:', error);
    process.exit(1);
  });

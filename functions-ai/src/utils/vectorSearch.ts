/**
 * Vector search utilities for AI Agent matching
 *
 * Uses Firestore Vector Search with Vertex AI embeddings to find
 * semantically similar AI agents for topic groups.
 */

import { GoogleGenAI } from '@google/genai';
import * as admin from 'firebase-admin';

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIMENSION = 1536; // Scaled down from 3072 to fit Firestore's 2048 limit
const COLLECTION_NAME = 'aiAgents';

/**
 * AI Agent data structure stored in Firestore
 */
export interface AIAgent {
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

/**
 * Simplified agent data for matching results
 */
export interface MatchingAgent {
  uniqueId: string;
  agentName: string;
  summary: string;
  referenceLink: string;
  maturity: number;
  score: number;
  functionalArea: string;
  industry: string;
  distance?: number;  // Cosine distance (0=identical, 1=orthogonal)
}

// Configuration for similarity filtering
// Cosine distance: 0.0 = identical, 1.0 = orthogonal, 2.0 = opposite
// Threshold 0.6 is lenient, broadly related (recommended starting point)
const MAX_DISTANCE_THRESHOLD = 0.6;

/**
 * Generate embedding for a text query using Vertex AI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const project = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  if (!project) {
    throw new Error('GCLOUD_PROJECT or GOOGLE_CLOUD_PROJECT environment variable is required');
  }

  const client = new GoogleGenAI({
    vertexai: true,
    project,
    location: 'us-central1', // Embeddings API available here
  });

  const response = await client.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [{ role: 'user', parts: [{ text }] }],
    config: {
      outputDimensionality: EMBEDDING_DIMENSION, // Reduce from 3072 to 1536
    },
  });

  const embedding = response.embeddings?.[0]?.values;
  if (!embedding) {
    throw new Error('Failed to generate embedding: no embedding in response');
  }

  return embedding;
}

/**
 * Find top N similar agents for a topic using vector search
 */
export async function findSimilarAgents(
  topicText: string,
  limit: number = 3
): Promise<MatchingAgent[]> {
  const db = admin.firestore();

  // Generate embedding for the topic
  const queryEmbedding = await generateEmbedding(topicText);

  // Vector similarity search with distance threshold and result field
  // Note: distanceThreshold and distanceResultField are valid Firestore options
  // but not yet in the TypeScript types
  const results = await db.collection(COLLECTION_NAME)
    .findNearest('embedding', queryEmbedding, {
      limit: limit * 2,  // Request more to allow for filtering
      distanceMeasure: 'COSINE',
      distanceThreshold: MAX_DISTANCE_THRESHOLD,  // Filter weak matches
      distanceResultField: 'vectorDistance',       // Capture distance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .get();

  // Map results and include distance
  const agents = results.docs
    .map(doc => {
      const data = doc.data() as AIAgent & { vectorDistance?: number };
      return {
        uniqueId: data.uniqueId,
        agentName: data.agentName,
        summary: data.summary ? data.summary.substring(0, 300) : '',
        referenceLink: data.referenceLink,
        maturity: data.maturity || 0,
        score: data.score || 0,
        functionalArea: data.functionalArea || '',
        industry: data.industry || '',
        distance: data.vectorDistance,
      };
    })
    .slice(0, limit);  // Take only requested limit

  console.log(`Vector search for "${topicText.substring(0, 50)}..." returned ${agents.length} agents`);
  if (agents.length > 0) {
    console.log(`  Matches: ${agents.map(a => `${a.agentName} (d=${a.distance?.toFixed(3)})`).join(', ')}`);
  }

  return agents;
}

/**
 * Calculate a composite score for ranking agents
 * Weighs maturity (60%) and score (40%)
 */
export function calculateAgentRank(agent: MatchingAgent): number {
  return (agent.maturity * 0.6) + (agent.score * 0.4);
}

/**
 * Get top N most mature agents from a list of matched agents
 */
export function getTopMatureAgents(
  agents: MatchingAgent[],
  limit: number = 5
): MatchingAgent[] {
  // Deduplicate by uniqueId
  const uniqueAgents = new Map<string, MatchingAgent>();
  agents.forEach(agent => {
    if (!uniqueAgents.has(agent.uniqueId)) {
      uniqueAgents.set(agent.uniqueId, agent);
    }
  });

  // Sort by composite score and take top N
  return Array.from(uniqueAgents.values())
    .sort((a, b) => calculateAgentRank(b) - calculateAgentRank(a))
    .slice(0, limit);
}

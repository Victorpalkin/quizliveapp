import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { REGION } from '../config';

/**
 * Deletes all documents in a subcollection.
 * Uses batched writes for efficiency (Firestore limit: 500 per batch).
 */
async function deleteSubcollection(gameId: string, subcollectionName: string): Promise<number> {
  const db = admin.firestore();
  const collectionRef = db.collection('games').doc(gameId).collection(subcollectionName);
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    return 0;
  }

  // Delete in batches of 500 (Firestore limit)
  const batchSize = 500;
  let deletedCount = 0;

  const batches: admin.firestore.WriteBatch[] = [];
  let currentBatch = db.batch();
  let currentBatchCount = 0;

  for (const doc of snapshot.docs) {
    currentBatch.delete(doc.ref);
    currentBatchCount++;
    deletedCount++;

    if (currentBatchCount >= batchSize) {
      batches.push(currentBatch);
      currentBatch = db.batch();
      currentBatchCount = 0;
    }
  }

  // Add the last batch if it has documents
  if (currentBatchCount > 0) {
    batches.push(currentBatch);
  }

  // Execute all batches
  await Promise.all(batches.map(batch => batch.commit()));

  return deletedCount;
}

const SIMPLE_SUBCOLLECTIONS = [
  'players', 'submissions', 'aggregates', 'responses', 'reactions',
  'workflowState', 'questions', 'leaderboard', 'analytics', 'items', 'ratings',
];

/**
 * Deletes all documents in a subcollection that itself contains a nested subcollection.
 */
async function deleteNestedSubcollection(gameId: string, subcollectionName: string, nestedName: string): Promise<void> {
  const db = admin.firestore();
  const parentSnapshot = await db.collection('games').doc(gameId).collection(subcollectionName).get();
  if (parentSnapshot.empty) return;

  for (const parentDoc of parentSnapshot.docs) {
    const nestedSnapshot = await parentDoc.ref.collection(nestedName).get();
    if (nestedSnapshot.empty) continue;

    const batchSize = 500;
    let currentBatch = db.batch();
    let count = 0;
    for (const doc of nestedSnapshot.docs) {
      currentBatch.delete(doc.ref);
      count++;
      if (count % batchSize === 0) {
        await currentBatch.commit();
        currentBatch = db.batch();
      }
    }
    if (count % batchSize !== 0) await currentBatch.commit();
  }
}

/**
 * Deletes all subcollections for a game.
 */
async function deleteAllGameSubcollections(gameId: string): Promise<number> {
  // Delete nested subcollections first
  await Promise.all([
    deleteNestedSubcollection(gameId, 'slideNudges', 'nudges'),
    deleteNestedSubcollection(gameId, 'agenticSessions', 'nudges'),
  ]);

  // Delete all simple subcollections (including the parent slideNudges/agenticSessions docs)
  const allSubcollections = [...SIMPLE_SUBCOLLECTIONS, 'slideNudges', 'agenticSessions'];
  const counts = await Promise.all(
    allSubcollections.map(name => deleteSubcollection(gameId, name))
  );

  return counts.reduce((sum, c) => sum + c, 0);
}

// Note: onGameUpdated was removed. Submissions are now preserved for analytics
// and only deleted when the entire game is deleted (via onGameDeleted).

/**
 * Cloud Function triggered when a game document is deleted.
 * Cleans up ALL subcollections (players, submissions, aggregates).
 */
export const onGameDeleted = onDocumentDeleted(
  {
    document: 'games/{gameId}',
    region: REGION,
  },
  async (event) => {
    const gameId = event.params.gameId;
    console.log(`[Cleanup] Game ${gameId} deleted, cleaning up all subcollections...`);

    const totalDeleted = await deleteAllGameSubcollections(gameId);
    console.log(`[Cleanup] Deleted ${totalDeleted} documents for game ${gameId}`);
  }
);

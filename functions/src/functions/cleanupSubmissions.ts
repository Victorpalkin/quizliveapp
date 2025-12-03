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

/**
 * Deletes all subcollections for a game (players, submissions, aggregates).
 */
async function deleteAllGameSubcollections(gameId: string): Promise<{ players: number; submissions: number; aggregates: number }> {
  const [players, submissions, aggregates] = await Promise.all([
    deleteSubcollection(gameId, 'players'),
    deleteSubcollection(gameId, 'submissions'),
    deleteSubcollection(gameId, 'aggregates'),
  ]);

  return { players, submissions, aggregates };
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

    const deleted = await deleteAllGameSubcollections(gameId);
    console.log(`[Cleanup] Deleted for game ${gameId}: ${deleted.players} players, ${deleted.submissions} submissions, ${deleted.aggregates} aggregates`);
  }
);

import { onDocumentUpdated, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { REGION } from '../config';

/**
 * Deletes all submissions for a given game.
 * This is called when a game is cancelled or ended.
 */
async function deleteAllSubmissions(gameId: string): Promise<number> {
  const db = admin.firestore();
  const submissionsRef = db.collection('games').doc(gameId).collection('submissions');
  const snapshot = await submissionsRef.get();

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
 * Cloud Function triggered when a game document is updated.
 * Cleans up submissions when game state changes to 'ended'.
 */
export const onGameUpdated = onDocumentUpdated(
  {
    document: 'games/{gameId}',
    region: REGION,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;

    // Check if game just transitioned to 'ended' state
    if (before.state !== 'ended' && after.state === 'ended') {
      const gameId = event.params.gameId;
      console.log(`[Cleanup] Game ${gameId} ended, cleaning up submissions...`);

      const deletedCount = await deleteAllSubmissions(gameId);
      console.log(`[Cleanup] Deleted ${deletedCount} submissions for game ${gameId}`);
    }
  }
);

/**
 * Cloud Function triggered when a game document is deleted.
 * This handles cancellation where the game document is deleted entirely.
 */
export const onGameDeleted = onDocumentDeleted(
  {
    document: 'games/{gameId}',
    region: REGION,
  },
  async (event) => {
    const gameId = event.params.gameId;
    console.log(`[Cleanup] Game ${gameId} deleted, cleaning up submissions...`);

    const deletedCount = await deleteAllSubmissions(gameId);
    console.log(`[Cleanup] Deleted ${deletedCount} submissions for game ${gameId}`);
  }
);

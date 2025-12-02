import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

// Cloud Scheduler is not available in europe-west4, so we use europe-west1 for scheduled functions
const SCHEDULER_REGION = 'europe-west1';

const RETENTION_DAYS = 30;

/**
 * Deletes all documents in a subcollection.
 * Uses batched writes for efficiency (Firestore limit: 500 per batch).
 */
async function deleteSubcollection(gameRef: admin.firestore.DocumentReference, subcollectionName: string): Promise<number> {
  const db = admin.firestore();
  const collectionRef = gameRef.collection(subcollectionName);
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    return 0;
  }

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

  if (currentBatchCount > 0) {
    batches.push(currentBatch);
  }

  await Promise.all(batches.map(batch => batch.commit()));
  return deletedCount;
}

/**
 * Deletes a game and all its subcollections.
 */
async function deleteGameWithSubcollections(gameRef: admin.firestore.DocumentReference): Promise<{
  players: number;
  submissions: number;
  aggregates: number;
}> {
  // Delete all subcollections first
  const [players, submissions, aggregates] = await Promise.all([
    deleteSubcollection(gameRef, 'players'),
    deleteSubcollection(gameRef, 'submissions'),
    deleteSubcollection(gameRef, 'aggregates'),
  ]);

  // Delete the game document
  await gameRef.delete();

  return { players, submissions, aggregates };
}

/**
 * Scheduled Cloud Function to clean up old games.
 * Runs daily at 3:00 AM UTC.
 *
 * Deletes:
 * 1. Games older than 30 days (based on createdAt field)
 * 2. Orphaned player subcollections (where the parent game document doesn't exist)
 */
export const cleanupOldGames = onSchedule(
  {
    schedule: '0 3 * * *', // Daily at 3:00 AM UTC
    region: SCHEDULER_REGION,
    timeoutSeconds: 540, // 9 minutes (max for scheduled functions)
    memory: '512MiB',
  },
  async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const cutoffDate = new Date(now.toDate().getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

    console.log(`[Cleanup] Starting cleanup of games older than ${RETENTION_DAYS} days (before ${cutoffDate.toISOString()})`);

    let oldGamesDeleted = 0;
    let orphanedCollectionsDeleted = 0;
    let totalPlayersDeleted = 0;
    let totalSubmissionsDeleted = 0;
    let totalAggregatesDeleted = 0;

    try {
      // 1. Delete games older than 30 days
      const oldGamesQuery = db.collection('games')
        .where('createdAt', '<', cutoffTimestamp)
        .limit(100); // Process in batches to avoid timeout

      const oldGamesSnapshot = await oldGamesQuery.get();

      for (const gameDoc of oldGamesSnapshot.docs) {
        const gameId = gameDoc.id;
        console.log(`[Cleanup] Deleting old game: ${gameId}`);

        const deleted = await deleteGameWithSubcollections(gameDoc.ref);
        oldGamesDeleted++;
        totalPlayersDeleted += deleted.players;
        totalSubmissionsDeleted += deleted.submissions;
        totalAggregatesDeleted += deleted.aggregates;
      }

      console.log(`[Cleanup] Deleted ${oldGamesDeleted} old games`);

      // 2. Find and delete orphaned subcollections
      // This handles cases where only players exist but the game document was deleted
      // We use collectionGroup query to find all players, then check if parent game exists
      const playersSnapshot = await db.collectionGroup('players').limit(500).get();

      // Group players by game ID
      const gameIdsWithPlayers = new Set<string>();
      for (const playerDoc of playersSnapshot.docs) {
        // Path is: games/{gameId}/players/{playerId}
        const pathParts = playerDoc.ref.path.split('/');
        if (pathParts.length >= 2 && pathParts[0] === 'games') {
          gameIdsWithPlayers.add(pathParts[1]);
        }
      }

      // Check which game documents don't exist
      for (const gameId of gameIdsWithPlayers) {
        const gameRef = db.collection('games').doc(gameId);
        const gameDoc = await gameRef.get();

        if (!gameDoc.exists) {
          console.log(`[Cleanup] Found orphaned subcollections for game: ${gameId}`);

          const [players, submissions, aggregates] = await Promise.all([
            deleteSubcollection(gameRef, 'players'),
            deleteSubcollection(gameRef, 'submissions'),
            deleteSubcollection(gameRef, 'aggregates'),
          ]);

          orphanedCollectionsDeleted++;
          totalPlayersDeleted += players;
          totalSubmissionsDeleted += submissions;
          totalAggregatesDeleted += aggregates;
        }
      }

      console.log(`[Cleanup] Cleanup complete:
        - Old games deleted: ${oldGamesDeleted}
        - Orphaned collections cleaned: ${orphanedCollectionsDeleted}
        - Total players deleted: ${totalPlayersDeleted}
        - Total submissions deleted: ${totalSubmissionsDeleted}
        - Total aggregates deleted: ${totalAggregatesDeleted}`);

    } catch (error) {
      console.error('[Cleanup] Error during cleanup:', error);
      throw error;
    }
  }
);

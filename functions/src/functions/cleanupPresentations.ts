import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { getStorage } from 'firebase-admin/storage';
import { REGION } from '../config';

/**
 * Cloud Function triggered when a presentation document is deleted.
 * Cleans up all slide images from Firebase Storage.
 */
export const onPresentationDeleted = onDocumentDeleted(
  {
    document: 'presentations/{presentationId}',
    region: REGION,
  },
  async (event) => {
    const presentationId = event.params.presentationId;
    console.log(`[Cleanup] Presentation ${presentationId} deleted, cleaning up images...`);

    try {
      const bucket = getStorage().bucket();
      const prefix = `presentations/${presentationId}/`;

      // List all files with this prefix
      const [files] = await bucket.getFiles({ prefix });

      if (files.length === 0) {
        console.log(`[Cleanup] No images found for presentation ${presentationId}`);
        return;
      }

      // Delete all files
      await Promise.all(
        files.map(async (file) => {
          try {
            await file.delete();
          } catch (error) {
            console.error(`[Cleanup] Failed to delete file ${file.name}:`, error);
          }
        })
      );

      console.log(`[Cleanup] Deleted ${files.length} images for presentation ${presentationId}`);
    } catch (error) {
      console.error(`[Cleanup] Failed to delete images for presentation ${presentationId}:`, error);
    }
  }
);

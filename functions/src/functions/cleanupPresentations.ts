import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { REGION } from '../config';

/**
 * Cloud Function trigger: when a presentation document is deleted,
 * clean up associated storage files (images) and shares.
 */
export const onPresentationDeleted = onDocumentDeleted(
  {
    document: 'presentations/{presentationId}',
    region: REGION,
  },
  async (event) => {
    const presentationId = event.params.presentationId;
    const data = event.data?.data();

    if (!data) return;

    const bucket = admin.storage().bucket();
    const db = admin.firestore();

    // Delete associated storage files
    try {
      const [files] = await bucket.getFiles({
        prefix: `presentations/${presentationId}/`,
      });

      if (files.length > 0) {
        await Promise.all(files.map((file) => file.delete()));
      }
    } catch (error) {
      // Storage cleanup is best-effort
      console.error(`Error cleaning up storage for presentation ${presentationId}:`, error);
    }

    // Delete shares subcollection
    try {
      const sharesSnap = await db.collection(`presentations/${presentationId}/shares`).get();
      if (!sharesSnap.empty) {
        const batch = db.batch();
        sharesSnap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
    } catch (error) {
      console.error(`Error cleaning up shares for presentation ${presentationId}:`, error);
    }
  }
);

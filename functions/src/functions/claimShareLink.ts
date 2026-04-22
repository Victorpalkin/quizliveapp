import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { ALLOWED_ORIGINS, REGION } from '../config';
import { verifyAppCheck } from '../utils/appCheck';

interface ClaimRequest {
  token: string;
}

interface ClaimResult {
  contentType: string;
  contentId: string;
  contentTitle: string;
}

export const claimShareLink = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 10,
    concurrency: 40,
    enforceAppCheck: true,
  },
  async (request): Promise<ClaimResult> => {
    verifyAppCheck(request);

    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in to claim a share link');
    }

    const email = request.auth.token.email;
    if (!email) {
      throw new HttpsError('failed-precondition', 'Account must have an email address');
    }

    const { token } = request.data as ClaimRequest;
    if (!token || typeof token !== 'string') {
      throw new HttpsError('invalid-argument', 'Token is required');
    }

    const db = admin.firestore();
    const linkDoc = await db.collection('shareLinks').doc(token).get();

    if (!linkDoc.exists) {
      throw new HttpsError('not-found', 'Share link not found or has expired');
    }

    const link = linkDoc.data()!;

    if (link.active === false) {
      throw new HttpsError('not-found', 'Share link not found or has expired');
    }

    if (link.ownerId === request.auth.uid) {
      throw new HttpsError('failed-precondition', 'You cannot claim your own share link');
    }

    const normalizedEmail = email.toLowerCase();
    const shareRef = db
      .collection(link.contentCollection)
      .doc(link.contentId)
      .collection('shares')
      .doc(normalizedEmail);

    const existing = await shareRef.get();
    if (existing.exists) {
      return {
        contentType: link.contentType,
        contentId: link.contentId,
        contentTitle: link.contentTitle,
      };
    }

    const shareData: Record<string, unknown> = {
      sharedWith: normalizedEmail,
      sharedBy: link.ownerId,
      sharedByEmail: link.ownerEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (link.contentCollection === 'quizzes') {
      shareData.quizId = link.contentId;
      shareData.quizTitle = link.contentTitle;
    } else if (link.contentCollection === 'activities') {
      shareData.pollId = link.contentId;
      shareData.pollTitle = link.contentTitle;
    } else if (link.contentCollection === 'presentations') {
      shareData.presentationId = link.contentId;
      shareData.presentationTitle = link.contentTitle;
    }

    await shareRef.set(shareData);

    return {
      contentType: link.contentType,
      contentId: link.contentId,
      contentTitle: link.contentTitle,
    };
  }
);

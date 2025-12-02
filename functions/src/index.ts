import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export Cloud Functions
export { submitAnswer } from './functions/submitAnswer';
export { createHostAccount } from './functions/createHostAccount';
export { computeQuestionResults } from './functions/computeQuestionResults';

// Export Cleanup Triggers
export { onGameUpdated, onGameDeleted } from './functions/cleanupSubmissions';

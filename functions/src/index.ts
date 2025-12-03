import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export Cloud Functions
export { submitAnswer } from './functions/submitAnswer';
export { createHostAccount } from './functions/createHostAccount';
export { computeQuestionResults } from './functions/computeQuestionResults';
export { computeGameAnalytics } from './functions/computeGameAnalytics';

// Export Cleanup Triggers
export { onGameDeleted } from './functions/cleanupSubmissions';

// Export Scheduled Cleanup Functions
export { cleanupOldGames } from './functions/cleanupOldGames';

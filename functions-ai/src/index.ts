import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export AI Cloud Functions
export { generateQuizWithAI } from './functions/generateQuizWithAI';
export { generatePollWithAI } from './functions/generatePollWithAI';
export { generatePresentationWithAI } from './functions/generatePresentationWithAI';
export { generateQuestionImage } from './functions/generateQuestionImage';
export { evaluateSubmissions } from './functions/evaluateSubmissions';
export { extractTopics } from './functions/extractTopics';
// extractSlideTopics was removed - use extractTopics with slideId parameter instead

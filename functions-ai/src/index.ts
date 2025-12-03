import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export AI Cloud Functions
export { generateQuizWithAI } from './functions/generateQuizWithAI';
export { generateQuestionImage } from './functions/generateQuestionImage';
export { evaluateSubmissions } from './functions/evaluateSubmissions';
export { extractTopics } from './functions/extractTopics';

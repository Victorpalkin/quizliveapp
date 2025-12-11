import { HttpsError } from 'firebase-functions/v2/https';
import { SubmitAnswerRequest } from '../types';
import { DEFAULT_QUESTION_TIME_LIMIT } from '../config';

/**
 * Validate basic required fields for answer submission
 *
 * @param data - The submit answer request data
 * @throws HttpsError if validation fails
 */
export function validateBasicFields(data: SubmitAnswerRequest): void {
  const { gameId, playerId, questionIndex, answerIndex, answerIndices, sliderValue, timeRemaining } = data;

  // Validate required fields
  if (!gameId || !playerId || questionIndex === undefined) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: gameId, playerId, questionIndex'
    );
  }

  // At least one answer type must be provided
  const textAnswer = (data as any).textAnswer;
  if (answerIndex === undefined && !answerIndices && sliderValue === undefined && textAnswer === undefined) {
    throw new HttpsError(
      'invalid-argument',
      'Missing answer: must provide answerIndex, answerIndices, sliderValue, or textAnswer'
    );
  }

  if (timeRemaining === undefined || timeRemaining < 0) {
    throw new HttpsError(
      'invalid-argument',
      'Invalid timeRemaining value'
    );
  }
}

/**
 * Validate time remaining is within bounds
 *
 * @param timeRemaining - Time remaining when answer was submitted
 * @param questionTimeLimit - The time limit for this question
 * @throws HttpsError if validation fails
 */
export function validateTimeRemaining(
  timeRemaining: number,
  questionTimeLimit?: number
): void {
  const timeLimit = questionTimeLimit || DEFAULT_QUESTION_TIME_LIMIT;

  if (timeRemaining > timeLimit) {
    throw new HttpsError(
      'invalid-argument',
      'Time remaining cannot exceed time limit'
    );
  }
}

/**
 * Validate single-choice question data
 * Note: correctAnswerIndex is now fetched from server-side answer key, not client request
 *
 * @param data - The submit answer request data
 * @throws HttpsError if validation fails
 */
export function validateSingleChoice(data: SubmitAnswerRequest): void {
  const { answerIndex } = data;

  if (answerIndex === undefined) {
    throw new HttpsError('invalid-argument', 'Single choice question requires answerIndex');
  }

  // -1 means no answer/timeout - minimal validation only
  if (answerIndex !== -1 && answerIndex < 0) {
    throw new HttpsError('invalid-argument', 'Invalid answer index');
  }
}

/**
 * Validate multiple-choice question data
 * Note: correctAnswerIndices is now fetched from server-side answer key, not client request
 *
 * @param data - The submit answer request data
 * @throws HttpsError if validation fails
 */
export function validateMultipleChoice(data: SubmitAnswerRequest): void {
  const { answerIndices } = data;

  if (!answerIndices) {
    throw new HttpsError('invalid-argument', 'Multiple choice question requires answerIndices');
  }

  // Minimal validation - check indices aren't negative
  for (const idx of answerIndices) {
    if (idx < 0) {
      throw new HttpsError('invalid-argument', `Invalid answer index: ${idx}`);
    }
  }
}

/**
 * Validate slider question data
 * Note: correctValue, minValue, maxValue are now fetched from server-side answer key
 * We can only validate that sliderValue is a number here
 *
 * @param data - The submit answer request data
 * @throws HttpsError if validation fails
 */
export function validateSlider(data: SubmitAnswerRequest): void {
  const { sliderValue } = data;

  if (sliderValue === undefined) {
    throw new HttpsError('invalid-argument', 'Slider question requires sliderValue');
  }

  if (typeof sliderValue !== 'number' || isNaN(sliderValue)) {
    throw new HttpsError('invalid-argument', 'sliderValue must be a valid number');
  }
}

/**
 * Validate poll single-choice question data
 *
 * @param data - The submit answer request data
 * @throws HttpsError if validation fails
 */
export function validatePollSingle(data: SubmitAnswerRequest): void {
  const { answerIndex } = data;

  if (answerIndex === undefined) {
    throw new HttpsError('invalid-argument', 'Poll single choice question requires answerIndex');
  }

  if (answerIndex < 0) {
    throw new HttpsError('invalid-argument', 'Invalid answer index');
  }
}

/**
 * Validate poll multiple-choice question data
 *
 * @param data - The submit answer request data
 * @throws HttpsError if validation fails
 */
export function validatePollMultiple(data: SubmitAnswerRequest): void {
  const { answerIndices } = data;

  if (!answerIndices || answerIndices.length === 0) {
    throw new HttpsError('invalid-argument', 'Poll multiple choice question requires answerIndices');
  }

  // Minimal validation - check indices aren't negative
  for (const idx of answerIndices) {
    if (idx < 0) {
      throw new HttpsError('invalid-argument', `Invalid answer index: ${idx}`);
    }
  }
}

/**
 * Validate free-response question data
 * Note: correctAnswer and alternativeAnswers are now fetched from server-side answer key
 *
 * @param data - The submit answer request data
 * @throws HttpsError if validation fails
 */
export function validateFreeResponse(data: SubmitAnswerRequest): void {
  const { textAnswer } = data;

  if (textAnswer === undefined) {
    throw new HttpsError('invalid-argument', 'Free-response question requires textAnswer');
  }

  // Validate textAnswer is a string and not too long
  if (typeof textAnswer !== 'string') {
    throw new HttpsError('invalid-argument', 'textAnswer must be a string');
  }

  if (textAnswer.length > 200) {
    throw new HttpsError('invalid-argument', 'textAnswer exceeds maximum length of 200 characters');
  }
}

/**
 * Validate question-specific data based on question type
 *
 * @param data - The submit answer request data
 * @throws HttpsError if validation fails
 */
export function validateQuestionData(data: SubmitAnswerRequest): void {
  const { questionType } = data;

  if (!questionType) {
    throw new HttpsError('invalid-argument', 'Question type is required');
  }

  switch (questionType) {
    case 'single-choice':
      validateSingleChoice(data);
      break;
    case 'multiple-choice':
      validateMultipleChoice(data);
      break;
    case 'slider':
      validateSlider(data);
      break;
    case 'free-response':
      validateFreeResponse(data);
      break;
    case 'poll-single':
      validatePollSingle(data);
      break;
    case 'poll-multiple':
      validatePollMultiple(data);
      break;
    default:
      throw new HttpsError('invalid-argument', `Unknown question type: ${questionType}`);
  }
}

/**
 * Validate host account creation request
 *
 * @param email - Email address
 * @param password - Password
 * @param name - Display name
 * @param jobRole - Job role
 * @param team - Team name
 * @throws HttpsError if validation fails
 */
export function validateHostAccountRequest(
  email: string,
  password: string,
  name: string,
  jobRole: string,
  team: string
): { trimmedEmail: string; trimmedName: string; trimmedJobRole: string; trimmedTeam: string } {
  // Validate required fields
  if (!email || !password || !name || !jobRole || !team) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: email, password, name, jobRole, team'
    );
  }

  // Trim and lowercase email for consistent validation
  const trimmedEmail = email.trim().toLowerCase();

  // Server-side domain validation - CRITICAL SECURITY CHECK
  if (!trimmedEmail.endsWith('@google.com')) {
    throw new HttpsError(
      'invalid-argument',
      'Only @google.com email addresses are allowed to register'
    );
  }

  // Validate name is not empty after trimming
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    throw new HttpsError('invalid-argument', 'Name cannot be empty');
  }

  // Validate job role and team are not empty
  const trimmedJobRole = jobRole.trim();
  const trimmedTeam = team.trim();
  if (trimmedJobRole.length === 0 || trimmedTeam.length === 0) {
    throw new HttpsError('invalid-argument', 'Job role and team cannot be empty');
  }

  return { trimmedEmail, trimmedName, trimmedJobRole, trimmedTeam };
}

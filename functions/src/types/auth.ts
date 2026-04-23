/**
 * Request interface for createHostAccount Cloud Function
 */
export interface CreateHostAccountRequest {
  email: string;
  password: string;
}

/**
 * Result returned from createHostAccount function
 * Note: verificationLink is intentionally NOT returned for security reasons
 */
export interface CreateHostAccountResult {
  success: boolean;
  userId: string;
  message: string;
}

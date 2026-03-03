export interface HostProfile {
  id: string;              // Firebase Auth UID
  email: string;           // @google.com email
  name: string;            // Display name
  jobRole: string;         // Job role/title
  team: string;            // Team name
  emailVerified: boolean;  // Email verification status
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizShare {
  id: string;
  quizId: string;
  quizTitle: string;
  sharedWith: string; // email
  sharedBy: string; // userId
  sharedByEmail: string;
  createdAt: Date;
}

export interface PollShare {
  id: string;
  pollId: string;
  pollTitle: string;
  sharedWith: string; // email
  sharedBy: string; // userId
  sharedByEmail: string;
  createdAt: Date;
}

export interface PresentationShare {
  id: string;
  presentationId: string;
  presentationTitle: string;
  sharedWith: string; // email
  sharedBy: string; // userId
  sharedByEmail: string;
  createdAt: Date;
}

// Generic content share type for unified handling
export type ContentShare = QuizShare | PollShare | PresentationShare;
export type ContentType = 'quiz' | 'poll' | 'presentation';

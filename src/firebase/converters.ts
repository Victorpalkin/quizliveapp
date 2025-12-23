import {
  DocumentData,
  QueryDocumentSnapshot,
  SnapshotOptions,
  FirestoreDataConverter,
  Timestamp,
} from 'firebase/firestore';
import {
  Quiz,
  Game,
  Player,
  QuizShare,
  ThoughtsGatheringActivity,
  ThoughtSubmission,
  EvaluationActivity,
  EvaluationItem,
  PlayerRatings,
} from '@/lib/types';
import { removeUndefined } from '@/lib/firestore-utils';

/**
 * Safely convert a Firestore timestamp field to a Date.
 * Handles: Timestamp objects, serverTimestamp() sentinels (null/undefined), and missing fields.
 */
function toDateSafe(value: unknown): Date | undefined {
  if (!value) return undefined;
  // Check if it's a Firestore Timestamp (has toDate method)
  if (typeof value === 'object' && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate();
  }
  // If it's already a Date, return it
  if (value instanceof Date) {
    return value;
  }
  return undefined;
}

export const quizConverter: FirestoreDataConverter<Quiz> = {
  toFirestore(quiz: Quiz): DocumentData {
    const { id, ...data } = quiz;
    return removeUndefined({
      ...data,
      createdAt: data.createdAt instanceof Date ? Timestamp.fromDate(data.createdAt) : data.createdAt,
      updatedAt: data.updatedAt instanceof Date ? Timestamp.fromDate(data.updatedAt) : data.updatedAt,
    });
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Quiz {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      title: data.title,
      description: data.description,
      questions: data.questions,
      hostId: data.hostId,
      crowdsource: data.crowdsource,
      createdAt: toDateSafe(data.createdAt),
      updatedAt: toDateSafe(data.updatedAt),
    };
  }
};

export const gameConverter: FirestoreDataConverter<Game> = {
  toFirestore(game: Game): DocumentData {
    const { id, ...data } = game;
    return removeUndefined(data);
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Game {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      quizId: data.quizId,
      hostId: data.hostId,
      state: data.state,
      currentQuestionIndex: data.currentQuestionIndex,
      gamePin: data.gamePin,
      questionStartTime: data.questionStartTime,
      crowdsourceState: data.crowdsourceState,
      questions: data.questions,
      createdAt: toDateSafe(data.createdAt),
      // Activity system fields
      activityType: data.activityType,
      activityId: data.activityId,
      // Presentation specific
      presentationId: data.presentationId,
      // Thoughts Gathering specific
      submissionsOpen: data.submissionsOpen,
      // Evaluation specific
      itemSubmissionsOpen: data.itemSubmissionsOpen,
    };
  }
};

export const playerConverter: FirestoreDataConverter<Player> = {
  toFirestore(player: Player): DocumentData {
    const { id, ...data } = player;
    return removeUndefined(data);
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Player {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      name: data.name,
      score: data.score,
      answers: data.answers || [],
      currentStreak: data.currentStreak ?? 0,
    };
  }
};

export const quizShareConverter: FirestoreDataConverter<QuizShare> = {
  toFirestore(quizShare: QuizShare): DocumentData {
    const { id, ...data } = quizShare;
    // Convert Date to Timestamp for Firestore
    return removeUndefined({
      ...data,
      createdAt: data.createdAt instanceof Date ? Timestamp.fromDate(data.createdAt) : data.createdAt,
    });
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): QuizShare {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      quizId: data.quizId,
      quizTitle: data.quizTitle,
      sharedWith: data.sharedWith,
      sharedBy: data.sharedBy,
      sharedByEmail: data.sharedByEmail,
      createdAt: toDateSafe(data.createdAt) || new Date(),
    };
  }
};

// ==========================================
// Thoughts Gathering Activity Converters
// ==========================================

export const thoughtsGatheringActivityConverter: FirestoreDataConverter<ThoughtsGatheringActivity> = {
  toFirestore(activity: ThoughtsGatheringActivity): DocumentData {
    const { id, ...data } = activity;
    return removeUndefined({
      ...data,
      createdAt: data.createdAt instanceof Date ? Timestamp.fromDate(data.createdAt) : data.createdAt,
      updatedAt: data.updatedAt instanceof Date ? Timestamp.fromDate(data.updatedAt) : data.updatedAt,
    });
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): ThoughtsGatheringActivity {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      type: 'thoughts-gathering',
      title: data.title,
      description: data.description,
      hostId: data.hostId,
      config: data.config,
      createdAt: toDateSafe(data.createdAt) || new Date(),
      updatedAt: toDateSafe(data.updatedAt) || new Date(),
    };
  }
};

export const thoughtSubmissionConverter: FirestoreDataConverter<ThoughtSubmission> = {
  toFirestore(submission: ThoughtSubmission): DocumentData {
    const { id, ...data } = submission;
    return removeUndefined(data);
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): ThoughtSubmission {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      playerId: data.playerId,
      playerName: data.playerName,
      rawText: data.rawText,
      submittedAt: data.submittedAt,
      extractedTopics: data.extractedTopics,
    };
  }
};

// ==========================================
// Evaluation Activity Converters
// ==========================================

export const evaluationActivityConverter: FirestoreDataConverter<EvaluationActivity> = {
  toFirestore(activity: EvaluationActivity): DocumentData {
    const { id, ...data } = activity;
    return removeUndefined({
      ...data,
      createdAt: data.createdAt instanceof Date ? Timestamp.fromDate(data.createdAt) : data.createdAt,
      updatedAt: data.updatedAt instanceof Date ? Timestamp.fromDate(data.updatedAt) : data.updatedAt,
    });
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): EvaluationActivity {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      type: 'evaluation',
      title: data.title,
      description: data.description,
      hostId: data.hostId,
      config: data.config,
      createdAt: toDateSafe(data.createdAt) || new Date(),
      updatedAt: toDateSafe(data.updatedAt) || new Date(),
      // Source tracking fields (optional)
      sourceActivityId: data.sourceActivityId,
      sourceGameId: data.sourceGameId,
      sourceType: data.sourceType,
    };
  }
};

export const evaluationItemConverter: FirestoreDataConverter<EvaluationItem> = {
  toFirestore(item: EvaluationItem): DocumentData {
    const { id, ...data } = item;
    return removeUndefined(data);
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): EvaluationItem {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      text: data.text,
      description: data.description,
      submittedBy: data.submittedBy,
      submittedByPlayerId: data.submittedByPlayerId,
      isHostItem: data.isHostItem ?? true,
      approved: data.approved ?? true,
      order: data.order ?? 0,
      createdAt: data.createdAt,
    };
  }
};

// Backward compatibility aliases
/** @deprecated Use thoughtsGatheringActivityConverter instead */
export const interestCloudActivityConverter = thoughtsGatheringActivityConverter;
/** @deprecated Use thoughtSubmissionConverter instead */
export const interestSubmissionConverter = thoughtSubmissionConverter;
/** @deprecated Use evaluationActivityConverter instead */
export const rankingActivityConverter = evaluationActivityConverter;
/** @deprecated Use evaluationItemConverter instead */
export const rankingItemConverter = evaluationItemConverter;

export const playerRatingsConverter: FirestoreDataConverter<PlayerRatings> = {
  toFirestore(ratings: PlayerRatings): DocumentData {
    return removeUndefined({
      playerId: ratings.playerId,
      playerName: ratings.playerName,
      ratings: ratings.ratings,
      submittedAt: ratings.submittedAt,
      isComplete: ratings.isComplete,
    });
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): PlayerRatings {
    const data = snapshot.data(options);
    return {
      playerId: data.playerId,
      playerName: data.playerName,
      ratings: data.ratings || {},
      submittedAt: data.submittedAt,
      isComplete: data.isComplete ?? false,
    };
  }
};

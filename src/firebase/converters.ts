import {
  DocumentData,
  QueryDocumentSnapshot,
  SnapshotOptions,
  FirestoreDataConverter,
  Timestamp,
} from 'firebase/firestore';
import { Quiz, Game, Player, QuizShare, InterestCloudActivity, InterestSubmission } from '@/lib/types';

export const quizConverter: FirestoreDataConverter<Quiz> = {
  toFirestore(quiz: Quiz): DocumentData {
    const { id, ...data } = quiz;
    return data;
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
    };
  }
};

export const gameConverter: FirestoreDataConverter<Game> = {
  toFirestore(game: Game): DocumentData {
    const { id, ...data } = game;
    return data;
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
      // Activity system fields
      activityType: data.activityType,
      activityId: data.activityId,
    };
  }
};

export const playerConverter: FirestoreDataConverter<Player> = {
  toFirestore(player: Player): DocumentData {
    const { id, ...data } = player;
    return data;
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
    return {
      ...data,
      createdAt: data.createdAt instanceof Date ? Timestamp.fromDate(data.createdAt) : data.createdAt,
    };
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
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  }
};

export const interestCloudActivityConverter: FirestoreDataConverter<InterestCloudActivity> = {
  toFirestore(activity: InterestCloudActivity): DocumentData {
    const { id, ...data } = activity;
    // Filter out undefined values (Firestore rejects undefined)
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );
    return {
      ...filtered,
      createdAt: data.createdAt instanceof Date ? Timestamp.fromDate(data.createdAt) : data.createdAt,
      updatedAt: data.updatedAt instanceof Date ? Timestamp.fromDate(data.updatedAt) : data.updatedAt,
    };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): InterestCloudActivity {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      type: 'interest-cloud',
      title: data.title,
      description: data.description,
      hostId: data.hostId,
      config: data.config,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }
};

export const interestSubmissionConverter: FirestoreDataConverter<InterestSubmission> = {
  toFirestore(submission: InterestSubmission): DocumentData {
    const { id, ...data } = submission;
    return data;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): InterestSubmission {
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

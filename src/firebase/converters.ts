import {
  DocumentData,
  QueryDocumentSnapshot,
  SnapshotOptions,
  FirestoreDataConverter,
  Timestamp,
} from 'firebase/firestore';
import { Quiz, Game, Player, QuizShare } from '@/lib/types';

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

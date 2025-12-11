// src/firebase/error-emitter.ts
import { EventEmitter } from 'events';
import type { FirestorePermissionError, FirestoreIndexError } from './errors';

type ErrorEvents = {
  'permission-error': (error: FirestorePermissionError) => void;
  'index-error': (error: FirestoreIndexError) => void;
  'firestore-error': (error: Error) => void;
};

class ErrorEventEmitter extends EventEmitter {
  emit<T extends keyof ErrorEvents>(
    event: T,
    ...args: Parameters<ErrorEvents[T]>
  ): boolean {
    return super.emit(event, ...args);
  }

  on<T extends keyof ErrorEvents>(
    event: T,
    listener: ErrorEvents[T]
  ): this {
    return super.on(event, listener);
  }

  off<T extends keyof ErrorEvents>(
    event: T,
    listener: ErrorEvents[T]
  ): this {
    return super.off(event, listener);
  }
}

export const errorEmitter = new ErrorEventEmitter();

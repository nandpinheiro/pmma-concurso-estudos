import type { AppState, MarkState, Question } from '../types';

const DATABASE_NAME = 'pmma-study-database';
const DATABASE_VERSION = 1;
const STORE_NAMES = ['questions', 'attempts', 'marks', 'settings'] as const;
const SETTINGS_KEY = 'app';

interface StoredMark {
  questionId: string;
  value: MarkState;
}

interface StoredSettings {
  key: string;
  value: AppState['settings'];
}

export interface StorageService {
  get<T>(key: string, fallback: T): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Falha ao consultar IndexedDB.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Transação IndexedDB cancelada.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Falha na transação IndexedDB.'));
  });
}

function readLegacyState<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

export class IndexedDbStorageService implements StorageService {
  private databasePromise: Promise<IDBDatabase> | undefined;
  private lastState: AppState | undefined;
  private writeQueue: Promise<void> = Promise.resolve();

  private openDatabase(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB indisponível.'));
    if (this.databasePromise) return this.databasePromise;

    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('questions')) {
          const store = database.createObjectStore('questions', { keyPath: 'id' });
          store.createIndex('discipline', 'disciplina', { unique: false });
          store.createIndex('topic', ['disciplina', 'assunto'], { unique: false });
        }
        if (!database.objectStoreNames.contains('attempts')) {
          const store = database.createObjectStore('attempts', { keyPath: 'id' });
          store.createIndex('questionId', 'questionId', { unique: false });
          store.createIndex('answeredAt', 'data', { unique: false });
          store.createIndex('sessionId', 'sessionId', { unique: false });
        }
        if (!database.objectStoreNames.contains('marks')) {
          database.createObjectStore('marks', { keyPath: 'questionId' });
        }
        if (!database.objectStoreNames.contains('settings')) {
          database.createObjectStore('settings', { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Não foi possível abrir IndexedDB.'));
      request.onblocked = () => reject(new Error('A abertura do IndexedDB foi bloqueada por outra aba.'));
    }).catch((error: unknown) => {
      this.databasePromise = undefined;
      throw error;
    });

    return this.databasePromise!;
  }

  private async readState(database: IDBDatabase): Promise<AppState | undefined> {
    const transaction = database.transaction(STORE_NAMES, 'readonly');
    const questionsRequest = requestResult(transaction.objectStore('questions').getAll() as IDBRequest<Question[]>);
    const attemptsRequest = requestResult(transaction.objectStore('attempts').getAll() as IDBRequest<AppState['attempts']>);
    const marksRequest = requestResult(transaction.objectStore('marks').getAll() as IDBRequest<StoredMark[]>);
    const settingsRequest = requestResult(transaction.objectStore('settings').get(SETTINGS_KEY) as IDBRequest<StoredSettings | undefined>);
    const [questions, attempts, marks, settings] = await Promise.all([
      questionsRequest,
      attemptsRequest,
      marksRequest,
      settingsRequest,
    ]);
    await transactionDone(transaction);
    if (!settings) return undefined;

    return {
      questions,
      attempts,
      marks: Object.fromEntries(marks.map((mark) => [mark.questionId, mark.value])),
      settings: settings.value,
    };
  }

  private async writeState(database: IDBDatabase, state: AppState, previous?: AppState): Promise<void> {
    const transaction = database.transaction(STORE_NAMES, 'readwrite');
    const questions = transaction.objectStore('questions');
    const attempts = transaction.objectStore('attempts');
    const marks = transaction.objectStore('marks');
    const settings = transaction.objectStore('settings');

    if (!previous || previous.questions !== state.questions) {
      questions.clear();
      state.questions.forEach((question) => questions.put(question));
    }

    const attemptsAreAppendOnly = previous &&
      state.attempts.length >= previous.attempts.length &&
      previous.attempts.every((attempt, index) => state.attempts[index]?.id === attempt.id);
    if (!attemptsAreAppendOnly) {
      attempts.clear();
      state.attempts.forEach((attempt) => attempts.put(attempt));
    } else {
      state.attempts.slice(previous.attempts.length).forEach((attempt) => attempts.put(attempt));
    }

    if (!previous) {
      Object.entries(state.marks).forEach(([questionId, value]) => marks.put({ questionId, value } satisfies StoredMark));
    } else {
      Object.keys(previous.marks).filter((questionId) => !(questionId in state.marks)).forEach((questionId) => marks.delete(questionId));
      Object.entries(state.marks).forEach(([questionId, value]) => {
        if (previous.marks[questionId] !== value) marks.put({ questionId, value } satisfies StoredMark);
      });
    }

    if (!previous || previous.settings !== state.settings) {
      settings.put({ key: SETTINGS_KEY, value: state.settings } satisfies StoredSettings);
    }
    await transactionDone(transaction);
  }

  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const database = await this.openDatabase();
      const stored = await this.readState(database);
      if (stored) {
        this.lastState = stored;
        return stored as T;
      }

      const legacy = readLegacyState(key, fallback);
      if (legacy && typeof legacy === 'object' && 'questions' in legacy && 'attempts' in legacy && 'settings' in legacy) {
        const state = legacy as unknown as AppState;
        await this.writeState(database, state);
        this.lastState = state;
        try {
          window.localStorage.removeItem(key);
        } catch {}
        return state as T;
      }

      const initial = fallback as AppState;
      await this.writeState(database, initial);
      this.lastState = initial;
      return fallback;
    } catch {
      return readLegacyState(key, fallback);
    }
  }

  set<T>(key: string, value: T): Promise<void> {
    const state = value as AppState;
    const operation = this.writeQueue.then(async () => {
      try {
        const database = await this.openDatabase();
        await this.writeState(database, state, this.lastState);
        this.lastState = state;
      } catch {
        try {
          window.localStorage.setItem(key, JSON.stringify(value));
        } catch {}
      }
    });
    this.writeQueue = operation;
    return operation;
  }

  async remove(key: string): Promise<void> {
    try {
      const database = await this.openDatabase();
      const transaction = database.transaction(STORE_NAMES, 'readwrite');
      STORE_NAMES.forEach((storeName) => transaction.objectStore(storeName).clear());
      await transactionDone(transaction);
      this.lastState = undefined;
    } catch {}
    try {
      window.localStorage.removeItem(key);
    } catch {}
  }
}

export const storageService = new IndexedDbStorageService();

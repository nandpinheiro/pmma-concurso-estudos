export interface StorageService {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

export class LocalStorageStorageService implements StorageService {
  private readStorage(): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage;
  }

  get<T>(key: string, fallback: T): T {
    const storage = this.readStorage();
    if (!storage) {
      return fallback;
    }

    const item = storage.getItem(key);
    if (!item) {
      return fallback;
    }

    try {
      return JSON.parse(item) as T;
    } catch {
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    const storage = this.readStorage();
    if (!storage) {
      return;
    }

    storage.setItem(key, JSON.stringify(value));
  }

  remove(key: string): void {
    const storage = this.readStorage();
    if (!storage) {
      return;
    }

    storage.removeItem(key);
  }
}

export const storageService = new LocalStorageStorageService();

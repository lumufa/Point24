import { getTT, isWeb } from './tt-env';

const memoryStore = new Map<string, string>();

export function getItem(key: string): string | null {
    const tt = getTT();
    if (tt && typeof tt.getStorageSync === 'function') {
        const raw = tt.getStorageSync(key);
        if (raw === '' || raw === null || raw === undefined) return null;
        return typeof raw === 'string' ? raw : String(raw);
    }
    if (isWeb()) {
        const ls = (globalThis as any).localStorage;
        return ls ? ls.getItem(key) : null;
    }
    return memoryStore.has(key) ? memoryStore.get(key)! : null;
}

export function setItem(key: string, value: string): void {
    const tt = getTT();
    if (tt && typeof tt.setStorageSync === 'function') {
        tt.setStorageSync(key, value);
        return;
    }
    if (isWeb()) {
        const ls = (globalThis as any).localStorage;
        if (ls) ls.setItem(key, value);
        return;
    }
    memoryStore.set(key, value);
}

export function removeItem(key: string): void {
    const tt = getTT();
    if (tt && typeof tt.removeStorageSync === 'function') {
        tt.removeStorageSync(key);
        return;
    }
    if (isWeb()) {
        const ls = (globalThis as any).localStorage;
        if (ls) ls.removeItem(key);
        return;
    }
    memoryStore.delete(key);
}

export function getJSON<T>(key: string, fallback: T): T {
    const raw = getItem(key);
    if (raw === null) return fallback;
    try {
        const parsed = JSON.parse(raw);
        return parsed as T;
    } catch (e) {
        return fallback;
    }
}

export function setJSON(key: string, value: unknown): void {
    setItem(key, JSON.stringify(value));
}

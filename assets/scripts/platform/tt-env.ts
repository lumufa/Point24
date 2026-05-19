const g: any = typeof globalThis !== 'undefined' ? globalThis : {};

export function getTT(): any | null {
    const t = g.tt;
    return t && typeof t === 'object' ? t : null;
}

export function isDouyin(): boolean {
    return getTT() !== null;
}

export function isEditor(): boolean {
    const cc: any = g.cc;
    return !!(cc && cc.EDITOR);
}

export function isDevTool(): boolean {
    const tt = getTT();
    if (!tt || typeof tt.getSystemInfoSync !== 'function') return false;
    try {
        const info = tt.getSystemInfoSync();
        return !!info && info.platform === 'devtools';
    } catch (e) {
        return false;
    }
}

export function isWeb(): boolean {
    return !isDouyin() && typeof g.window !== 'undefined' && typeof g.document !== 'undefined';
}

export function logEnv(): string {
    if (isDouyin()) return isDevTool() ? 'douyin-devtools' : 'douyin-device';
    if (isEditor()) return 'cocos-editor';
    if (isWeb()) return 'web';
    return 'unknown';
}

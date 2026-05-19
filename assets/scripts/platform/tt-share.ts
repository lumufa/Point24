import { getTT } from './tt-env';

export type ShareChannel = 'video' | 'article' | 'token';

export interface ShareOptions {
    title: string;
    imageUrl?: string;
    query?: Record<string, string | number>;
    channel?: ShareChannel;
    extra?: Record<string, unknown>;
}

function serializeQuery(q?: Record<string, string | number>): string | undefined {
    if (!q) return undefined;
    const keys = Object.keys(q);
    if (keys.length === 0) return undefined;
    const parts: string[] = [];
    for (const k of keys) {
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(q[k])));
    }
    return parts.join('&');
}

export function shareAppMessage(opts: ShareOptions): Promise<boolean> {
    const tt = getTT();
    if (!tt || typeof tt.shareAppMessage !== 'function') {
        console.warn('[tt-share] runtime not available, share ignored:', opts.title);
        return Promise.resolve(false);
    }
    return new Promise<boolean>(resolve => {
        tt.shareAppMessage({
            channel: opts.channel ?? 'video',
            title: opts.title,
            imageUrl: opts.imageUrl,
            query: serializeQuery(opts.query),
            extra: opts.extra,
            success: () => resolve(true),
            fail: (err: any) => {
                console.warn('[tt-share] fail:', err && err.errMsg);
                resolve(false);
            },
        });
    });
}

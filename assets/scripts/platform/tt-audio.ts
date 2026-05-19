import { getTT } from './tt-env';

export interface AudioClip {
    play(): void;
    pause(): void;
    stop(): void;
    setVolume(v: number): void;
    destroy(): void;
}

export interface CreateClipOptions {
    src: string;
    loop?: boolean;
    volume?: number;
}

function clamp01(v: number): number {
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
}

class TTClip implements AudioClip {
    private ctx: any;
    constructor(tt: any, opts: CreateClipOptions) {
        this.ctx = tt.createInnerAudioContext();
        this.ctx.src = opts.src;
        this.ctx.loop = !!opts.loop;
        this.ctx.volume = clamp01(opts.volume ?? 1);
    }
    play() { this.ctx.play(); }
    pause() { this.ctx.pause(); }
    stop() { this.ctx.stop(); }
    setVolume(v: number) { this.ctx.volume = clamp01(v); }
    destroy() { this.ctx.destroy(); }
}

class WebClip implements AudioClip {
    private el: any;
    constructor(opts: CreateClipOptions) {
        const AudioCtor = (globalThis as any).Audio;
        this.el = new AudioCtor(opts.src);
        this.el.loop = !!opts.loop;
        this.el.volume = clamp01(opts.volume ?? 1);
    }
    play() {
        const p = this.el.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
    }
    pause() { this.el.pause(); }
    stop() { this.el.pause(); this.el.currentTime = 0; }
    setVolume(v: number) { this.el.volume = clamp01(v); }
    destroy() { this.el.pause(); this.el.src = ''; }
}

class NullClip implements AudioClip {
    play() {}
    pause() {}
    stop() {}
    setVolume(_v: number) {}
    destroy() {}
}

export function createClip(opts: CreateClipOptions): AudioClip {
    const tt = getTT();
    if (tt && typeof tt.createInnerAudioContext === 'function') {
        return new TTClip(tt, opts);
    }
    const AudioCtor = (globalThis as any).Audio;
    if (typeof AudioCtor === 'function') {
        return new WebClip(opts);
    }
    return new NullClip();
}

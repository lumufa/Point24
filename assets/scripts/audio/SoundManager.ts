import { isDouyin } from '../platform/tt-env';
import type { SoundName } from '../state/roundReducer';

interface ToneSpec {
    freq: number;
    duration: number;
    offset?: number;
    type?: OscillatorType;
    volume?: number;
}

const BASE_GAIN = 20;

const TONES: Record<SoundName, ToneSpec[]> = {
    select: [{ freq: 520, duration: 0.05, type: 'triangle', volume: 0.02 }],
    merge: [
        { freq: 480, duration: 0.06, type: 'triangle', volume: 0.022 },
        { freq: 640, duration: 0.08, offset: 0.04, type: 'triangle', volume: 0.018 },
    ],
    error: [{ freq: 260, duration: 0.12, type: 'sawtooth', volume: 0.018 }],
    win: [
        { freq: 520, duration: 0.08, type: 'triangle', volume: 0.025 },
        { freq: 660, duration: 0.1, offset: 0.08, type: 'triangle', volume: 0.022 },
        { freq: 880, duration: 0.16, offset: 0.18, type: 'triangle', volume: 0.02 },
    ],
};

let ctx: AudioContext | null = null;
let ctxUnavailable = false;

function getCtx(): AudioContext | null {
    if (ctxUnavailable) return null;
    if (ctx) {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        return ctx;
    }
    const g: any = globalThis as any;
    const Ctor = g.AudioContext || g.webkitAudioContext;
    if (typeof Ctor !== 'function') {
        ctxUnavailable = true;
        return null;
    }
    try {
        ctx = new Ctor();
        return ctx;
    } catch (e) {
        ctxUnavailable = true;
        return null;
    }
}

function playTone(spec: ToneSpec, gain: number): void {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    const startAt = c.currentTime + (spec.offset ?? 0);
    const endAt = startAt + spec.duration;
    const peak = Math.min(1, Math.max(0.0001, (spec.volume ?? 0.02) * gain * BASE_GAIN));
    osc.type = spec.type ?? 'triangle';
    osc.frequency.setValueAtTime(spec.freq, startAt);
    g.gain.setValueAtTime(0.0001, startAt);
    g.gain.exponentialRampToValueAtTime(peak, startAt + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, endAt);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(startAt);
    osc.stop(endAt + 0.02);
}

export interface SoundOptions {
    enabled: boolean;
    volume: number;
}

export class SoundManager {
    private opts: SoundOptions = { enabled: true, volume: 1 };

    update(opts: Partial<SoundOptions>): void {
        this.opts = { ...this.opts, ...opts };
    }

    play(name: SoundName): void {
        if (!this.opts.enabled) return;
        if (isDouyin()) {
            return;
        }
        const specs = TONES[name];
        if (!specs) return;
        try {
            for (const s of specs) playTone(s, this.opts.volume);
        } catch (e) {
        }
    }
}

export type TickHandler = () => void;

export class SecondTicker {
    private handle: any = null;
    private tick: TickHandler;

    constructor(tick: TickHandler) {
        this.tick = tick;
    }

    start(): void {
        if (this.handle !== null) return;
        const g: any = globalThis;
        if (typeof g.setInterval === 'function') {
            this.handle = g.setInterval(this.tick, 1000);
        }
    }

    stop(): void {
        if (this.handle === null) return;
        const g: any = globalThis;
        if (typeof g.clearInterval === 'function') {
            g.clearInterval(this.handle);
        }
        this.handle = null;
    }

    isRunning(): boolean {
        return this.handle !== null;
    }
}

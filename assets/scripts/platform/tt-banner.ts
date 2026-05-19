import { getTT } from './tt-env';

export interface BannerStyle {
    left?: number;
    top?: number;
    width?: number;
}

export interface BannerHandle {
    show(): void;
    hide(): void;
    destroy(): void;
}

class NullBanner implements BannerHandle {
    show() {}
    hide() {}
    destroy() {}
}

class TTBanner implements BannerHandle {
    private instance: any;
    constructor(tt: any, adUnitId: string, style: BannerStyle) {
        let sys: any = { screenWidth: 375, screenHeight: 667 };
        try {
            if (typeof tt.getSystemInfoSync === 'function') {
                sys = tt.getSystemInfoSync() || sys;
            }
        } catch (e) {}

        const width = style.width ?? Math.min(sys.screenWidth, 300);
        const left = style.left ?? (sys.screenWidth - width) / 2;
        const top = style.top ?? (sys.screenHeight - 120);

        this.instance = tt.createBannerAd({
            adUnitId,
            style: { left, top, width },
        });
        if (typeof this.instance.onError === 'function') {
            this.instance.onError((err: any) => {
                console.warn('[tt-banner] error', err && err.errMsg);
            });
        }
    }
    show() {
        if (typeof this.instance.show === 'function') this.instance.show();
    }
    hide() {
        if (typeof this.instance.hide === 'function') this.instance.hide();
    }
    destroy() {
        if (typeof this.instance.destroy === 'function') this.instance.destroy();
    }
}

export function createBanner(adUnitId: string, style: BannerStyle = {}): BannerHandle {
    const tt = getTT();
    if (!tt || typeof tt.createBannerAd !== 'function') return new NullBanner();
    return new TTBanner(tt, adUnitId, style);
}

import { getTT } from './tt-env';

export type AdScene = 'hint' | 'skip' | 'revive' | 'daily-bonus';
export type AdResult = 'reward' | 'cancel' | 'error' | 'no-sdk' | 'not-ready';

interface AdRecord {
    instance: any;
    unitId: string;
    lastError: string | null;
}

const adMap = new Map<AdScene, AdRecord>();

export function preloadRewardedAd(scene: AdScene, adUnitId: string): void {
    const tt = getTT();
    if (!tt || typeof tt.createRewardedVideoAd !== 'function') return;
    if (adMap.has(scene)) return;

    const instance = tt.createRewardedVideoAd({ adUnitId });
    const record: AdRecord = { instance, unitId: adUnitId, lastError: null };

    if (typeof instance.onError === 'function') {
        instance.onError((err: any) => {
            record.lastError = (err && err.errMsg) || 'unknown';
            console.warn('[tt-rewarded-ad] error', scene, record.lastError);
        });
    }
    if (typeof instance.load === 'function') {
        const p = instance.load();
        if (p && typeof p.catch === 'function') {
            p.catch((err: any) => {
                record.lastError = (err && err.errMsg) || 'load-fail';
            });
        }
    }
    adMap.set(scene, record);
}

export function showRewardedAd(scene: AdScene): Promise<AdResult> {
    const tt = getTT();
    if (!tt || typeof tt.createRewardedVideoAd !== 'function') {
        return Promise.resolve('no-sdk');
    }
    const record = adMap.get(scene);
    if (!record) return Promise.resolve('not-ready');

    return new Promise<AdResult>(resolve => {
        let settled = false;
        let closeHandler: (ev: any) => void;
        let errorHandler: (err: any) => void;

        const cleanup = () => {
            try { record.instance.offClose && record.instance.offClose(closeHandler); } catch (e) {}
            try { record.instance.offError && record.instance.offError(errorHandler); } catch (e) {}
        };
        const done = (r: AdResult) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(r);
        };

        closeHandler = (ev: any) => {
            if (ev && ev.isEnded) done('reward');
            else done('cancel');
        };
        errorHandler = (err: any) => {
            record.lastError = (err && err.errMsg) || 'show-fail';
            done('error');
        };

        if (typeof record.instance.onClose === 'function') record.instance.onClose(closeHandler);
        if (typeof record.instance.onError === 'function') record.instance.onError(errorHandler);

        const showPromise = record.instance.show && record.instance.show();
        if (showPromise && typeof showPromise.catch === 'function') {
            showPromise.catch(() => {
                const loadPromise = record.instance.load && record.instance.load();
                if (loadPromise && typeof loadPromise.then === 'function') {
                    loadPromise.then(() => record.instance.show && record.instance.show())
                        .catch(() => done('error'));
                } else {
                    done('error');
                }
            });
        }
    });
}

export function getLastError(scene: AdScene): string | null {
    const record = adMap.get(scene);
    return record ? record.lastError : null;
}

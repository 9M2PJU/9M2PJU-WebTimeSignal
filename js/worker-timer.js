/**
 * 9M2PJU WebTimeSignal - Background Worker Timer
 * Prevents timer throttling when the browser tab is hidden or backgrounded.
 */

export class WorkerTimer {
    constructor(intervalMs = 25) {
        this.intervalMs = intervalMs;
        this.worker = null;
        this.fallbackTimerId = null;
        this.callbacks = new Set();
        this._initWorker();
    }

    _initWorker() {
        const workerCode = `
            let timerId = null;
            self.onmessage = function(e) {
                if (e.data.action === 'start') {
                    if (timerId) clearInterval(timerId);
                    timerId = setInterval(() => {
                        self.postMessage('tick');
                    }, e.data.interval || 25);
                } else if (e.data.action === 'stop') {
                    if (timerId) clearInterval(timerId);
                    timerId = null;
                }
            };
        `;

        try {
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            this.worker = new Worker(URL.createObjectURL(blob));
            this.worker.onmessage = () => {
                this._tick();
            };
        } catch (e) {
            console.warn('WorkerTimer: Web Workers not available, using fallback timer.', e);
            this.worker = null;
        }
    }

    onTick(callback) {
        this.callbacks.add(callback);
    }

    _tick() {
        for (const cb of this.callbacks) {
            try {
                cb();
            } catch (err) {
                console.error('WorkerTimer callback error:', err);
            }
        }
    }

    start() {
        if (this.worker) {
            this.worker.postMessage({ action: 'start', interval: this.intervalMs });
        } else {
            if (this.fallbackTimerId) clearInterval(this.fallbackTimerId);
            this.fallbackTimerId = setInterval(() => this._tick(), this.intervalMs);
        }
    }

    stop() {
        if (this.worker) {
            this.worker.postMessage({ action: 'stop' });
        }
        if (this.fallbackTimerId) {
            clearInterval(this.fallbackTimerId);
            this.fallbackTimerId = null;
        }
    }
}

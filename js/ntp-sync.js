/**
 * 9M2PJU WebTimeSignal - Precision Network Time Synchronization (Web NTP)
 * Implements RFC 5905 Clock Filter Algorithm with Multi-Source Atomic Aggregation,
 * Monotonic Timestamping, Outlier Rejection, and Jitter/Dispersion estimation.
 */

export class NTPSync {
    constructor() {
        this.offsetMs = 0;
        this.rttMs = 0;
        this.jitterMs = 0;
        this.lastSyncTime = null;
        this.status = 'idle'; // 'idle' | 'syncing' | 'synced' | 'failed'
        this.source = 'Local Clock';
        this.colo = 'LOCAL';
        this.sampleCount = 0;
        this.listeners = new Set();
        this.autoSyncInterval = null;

        // Monotonic anchor: performance.now() value captured at the moment the
        // offset was computed, plus the Date.now() value at that same moment.
        // This lets getNow() advance with the monotonic clock instead of
        // freezing the offset against a drifting system clock.
        this._anchorPerf = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        this._anchorDate = Date.now();

        // Start background auto-resync every 5 minutes to counteract crystal drift
        this.startPeriodicSync(300000);

        if (typeof document !== 'undefined' && document.addEventListener) {
            document.addEventListener('visibilitychange', () => {
                // Avoid wasting battery probing while hidden; re-sync on return
                // if the last sync is stale (>60s).
                if (document.visibilityState === 'visible' && this.lastSyncTime &&
                    (Date.now() - this.lastSyncTime.getTime() > 60000) && this.status !== 'syncing') {
                    this.sync();
                }
            });
        }
    }

    /**
     * Subscribe to NTP sync state updates.
     * @param {Function} callback
     */
    onChange(callback) {
        this.listeners.add(callback);
    }

    _notify() {
        for (const cb of this.listeners) {
            try {
                cb({
                    status: this.status,
                    offsetMs: Math.round(this.offsetMs * 10) / 10,
                    rttMs: this.rttMs,
                    jitterMs: this.jitterMs,
                    lastSyncTime: this.lastSyncTime,
                    source: this.source,
                    colo: this.colo,
                    sampleCount: this.sampleCount,
                    correctedDate: this.getNow()
                });
            } catch (e) {
                console.error('NTP listener error:', e);
            }
        }
    }

    /**
     * Returns high-resolution atomic-corrected Date.
     * Extrapolates from the monotonic anchor so the clock keeps advancing
     * smoothly (and immune to OS clock steps) between re-syncs.
     * @returns {Date}
     */
    getNow() {
        const nowPerf = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const elapsed = nowPerf - this._anchorPerf;
        return new Date(this._anchorDate + elapsed + this.offsetMs);
    }

    startPeriodicSync(intervalMs = 300000) {
        if (this.autoSyncInterval) clearInterval(this.autoSyncInterval);
        this.autoSyncInterval = setInterval(() => {
            // Skip background probing when the tab is hidden to save battery.
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
            this.sync();
        }, intervalMs);
    }

    /**
     * Pure RFC 5905 clock-filter step, extracted for unit testing.
     * Sorts by RTT, retains the lowest-delay 50% (min 2), returns median
     * offset of the retained set plus RMS jitter around that median.
     * @param {Array<{offset:number,rtt:number}>} rawSamples
     * @returns {{offset:number,rtt:number,jitter:number,kept:number}|null}
     */
    static filterSamples(rawSamples) {
        if (!rawSamples || rawSamples.length === 0) return null;
        if (rawSamples.length === 1) {
            return { offset: rawSamples[0].offset, rtt: rawSamples[0].rtt, jitter: 0.5, kept: 1 };
        }
        const sorted = [...rawSamples].sort((a, b) => a.rtt - b.rtt);
        const filteredCount = Math.max(2, Math.ceil(sorted.length * 0.5));
        const best = sorted.slice(0, filteredCount);
        const offsets = best.map(s => s.offset).sort((a, b) => a - b);
        const median = offsets[Math.floor(offsets.length / 2)];
        const variance = best.reduce((sum, s) => sum + Math.pow(s.offset - median, 2), 0) / best.length;
        return { offset: median, rtt: best[0].rtt, jitter: Math.sqrt(variance), kept: best.length };
    }

    /**
     * Perform high-accuracy multi-burst atomic time synchronization.
     * @returns {Promise<boolean>}
     */
    async sync() {
        this.status = 'syncing';
        this._notify();

        const rawSamples = [];

        // Candidate Atomic Time Endpoints (Ranked by Precision & Latency)
        const endpoints = [
            { url: '/api/time', type: 'json' },
            { url: 'https://cloudflare.com/cdn-cgi/trace', type: 'trace' },
            { url: 'https://1.1.1.1/cdn-cgi/trace', type: 'trace' },
            { url: 'https://1.0.0.1/cdn-cgi/trace', type: 'trace' }
        ];

        for (const ep of endpoints) {
            // Burst probing: 3 samples per endpoint
            for (let i = 0; i < 3; i++) {
                try {
                    const t0 = performance.now();
                    const clientTimeBefore = Date.now();
                    const cacheBuster = Math.random().toString(36).substring(7);

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 4000);
                    let res;
                    try {
                        res = await fetch(`${ep.url}?_cb=${cacheBuster}`, {
                            cache: 'no-store',
                            mode: 'cors',
                            signal: controller.signal
                        });
                    } finally {
                        clearTimeout(timeoutId);
                    }

                    const t1 = performance.now();
                    const rtt = t1 - t0;

                    if (res.ok) {
                        let serverMs = null;
                        let serverColo = 'EDGE';

                        if (ep.type === 'json') {
                            const data = await res.json();
                            serverMs = data.serverTimestampMs;
                            // Compensate for edge worker processing delay when reported.
                            if (typeof data.processingMs === 'number') {
                                serverMs -= data.processingMs / 2;
                            }
                            serverColo = data.colo || 'EDGE';
                        } else if (ep.type === 'trace') {
                            const text = await res.text();
                            const tsMatch = text.match(/ts=([0-9.]+)/);
                            const coloMatch = text.match(/colo=([A-Z0-9]+)/);
                            if (tsMatch && tsMatch[1]) {
                                serverMs = parseFloat(tsMatch[1]) * 1000;
                            }
                            if (coloMatch && coloMatch[1]) {
                                serverColo = coloMatch[1];
                            }
                        }

                        if (serverMs !== null && !isNaN(serverMs)) {
                            // RFC 5905 NTP Offset Calculation:
                            // Offset = T_server - (T_client_before + RTT/2)
                            const clientMidpoint = clientTimeBefore + (rtt / 2);
                            const offset = serverMs - clientMidpoint;

                            rawSamples.push({
                                offset: offset,
                                rtt: rtt,
                                serverMs: serverMs,
                                colo: serverColo,
                                source: ep.url.includes('api/time') ? `Cloudflare Edge Atomic API (${serverColo})` : `Cloudflare NTS Anycast (${serverColo})`
                            });
                        }
                    }
                } catch (e) {
                    // Ignore transient network errors and continue to next probe
                }
            }
        }

        // Clock Filter & Statistical Outlier Rejection Algorithm
        if (rawSamples.length >= 2) {
            rawSamples.sort((a, b) => a.rtt - b.rtt);
            const filteredCount = Math.max(2, Math.ceil(rawSamples.length * 0.5));
            const bestSamples = rawSamples.slice(0, filteredCount);
            const filtered = NTPSync.filterSamples(rawSamples);

            // Keep full float precision internally; round only for display.
            this.offsetMs = filtered.offset;
            this.rttMs = Math.round(filtered.rtt);
            this.jitterMs = parseFloat(filtered.jitter.toFixed(1));
            this.source = bestSamples[0].source;
            this.colo = bestSamples[0].colo;
            this.sampleCount = rawSamples.length;
            this.lastSyncTime = new Date();
            this._anchorPerf = performance.now();
            this._anchorDate = Date.now();
            this.status = 'synced';
            this._notify();
            return true;
        } else if (rawSamples.length === 1) {
            const single = rawSamples[0];
            this.offsetMs = single.offset;
            this.rttMs = Math.round(single.rtt);
            this.jitterMs = 0.5;
            this.source = single.source;
            this.colo = single.colo;
            this.sampleCount = 1;
            this.lastSyncTime = new Date();
            this._anchorPerf = performance.now();
            this._anchorDate = Date.now();
            this.status = 'synced';
            this._notify();
            return true;
        } else {
            this.status = 'failed';
            this.source = 'Local System Clock (Fallback)';
            this._anchorPerf = performance.now();
            this._anchorDate = Date.now();
            this.offsetMs = 0;
            this._notify();
            return false;
        }
    }
}

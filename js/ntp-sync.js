/**
 * 9M2PJU WebTimeSignal - Precision Network Time Synchronization (Web NTP)
 * Computes millisecond-accurate offset against atomic internet time sources.
 */

export class NTPSync {
    constructor() {
        this.offsetMs = 0;
        this.rttMs = 0;
        this.lastSyncTime = null;
        this.status = 'idle'; // 'idle' | 'syncing' | 'synced' | 'failed'
        this.source = 'Local Clock';
        this.listeners = new Set();
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
                    offsetMs: this.offsetMs,
                    rttMs: this.rttMs,
                    lastSyncTime: this.lastSyncTime,
                    source: this.source,
                    correctedDate: this.getNow()
                });
            } catch (e) {
                console.error('NTP listener error:', e);
            }
        }
    }

    /**
     * Returns the current date corrected with the network offset.
     * @returns {Date}
     */
    getNow() {
        return new Date(Date.now() + this.offsetMs);
    }

    /**
     * Perform high-accuracy time synchronization against available online time servers.
     * @returns {Promise<boolean>}
     */
    async sync() {
        this.status = 'syncing';
        this._notify();

        const samples = [];

        // Strategy 1: Cloudflare trace (Ultra-fast, high precision)
        try {
            for (let i = 0; i < 3; i++) {
                const t0 = Date.now();
                const res = await fetch(`https://cloudflare.com/cdn-cgi/trace?_t=${t0}`, {
                    cache: 'no-store',
                    mode: 'cors'
                });
                const t1 = Date.now();
                if (res.ok) {
                    const text = await res.text();
                    const match = text.match(/ts=([0-9.]+)/);
                    if (match && match[1]) {
                        const serverSec = parseFloat(match[1]);
                        const serverMs = serverSec * 1000;
                        const rtt = t1 - t0;
                        const offset = (serverMs + (rtt / 2)) - t1;
                        samples.push({ offset, rtt, source: 'Cloudflare NTP' });
                    }
                }
            }
        } catch (e) {
            // Fallback to other providers
        }

        // Strategy 2: WorldTimeAPI
        if (samples.length === 0) {
            try {
                for (let i = 0; i < 2; i++) {
                    const t0 = Date.now();
                    const res = await fetch(`https://worldtimeapi.org/api/timezone/Etc/UTC?_t=${t0}`, {
                        cache: 'no-store'
                    });
                    const t1 = Date.now();
                    if (res.ok) {
                        const data = await res.json();
                        const serverMs = new Date(data.utc_datetime).getTime();
                        const rtt = t1 - t0;
                        const offset = (serverMs + (rtt / 2)) - t1;
                        samples.push({ offset, rtt, source: 'WorldTimeAPI' });
                    }
                }
            } catch (e) {
                // Ignore and try next
            }
        }

        // Strategy 3: Origin HTTP Date header fallback
        if (samples.length === 0) {
            try {
                const t0 = Date.now();
                const res = await fetch(`/?_t=${t0}`, { method: 'HEAD', cache: 'no-store' });
                const t1 = Date.now();
                const dateHeader = res.headers.get('date');
                if (dateHeader) {
                    const serverMs = new Date(dateHeader).getTime();
                    const rtt = t1 - t0;
                    const offset = (serverMs + (rtt / 2)) - t1;
                    samples.push({ offset, rtt, source: 'HTTP Date Header' });
                }
            } catch (e) {
                // Local network offline
            }
        }

        if (samples.length > 0) {
            // Select sample with minimum RTT (most accurate)
            samples.sort((a, b) => a.rtt - b.rtt);
            const best = samples[0];
            this.offsetMs = Math.round(best.offset);
            this.rttMs = Math.round(best.rtt);
            this.source = best.source;
            this.lastSyncTime = new Date();
            this.status = 'synced';
            this._notify();
            return true;
        } else {
            this.status = 'failed';
            this.source = 'Local System Clock (Fallback)';
            this._notify();
            return false;
        }
    }
}

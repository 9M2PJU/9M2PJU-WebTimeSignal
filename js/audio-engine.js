/**
 * 9M2PJU WebTimeSignal - Web Audio Engine
 * Features:
 * - Anti-phase differential stereo drive (+180° inverted Right channel for 2x coil voltage)
 * - Non-linear WaveShaper distortion for harmonic enrichment
 * - High-precision Lookahead scheduler driven by background WorkerTimer
 * - Real-time AnalyserNode for audio visualization
 * - Screen WakeLock management
 */

import { WorkerTimer } from './worker-timer.js';

export class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.leftGain = null;
        this.rightGain = null;
        this.merger = null;
        this.analyser = null;
        this.waveShaper = null;

        // Settings
        this.volume = 1.0;
        this.stereoAntiPhase = true;
        this.harmonicOverdrive = true;
        this.carrierFreq = 13333.333; // Default JJY 40 kHz base

        // State
        this.isPlaying = false;
        this.wakeLock = null;
        this.currentEncoder = null;
        this.currentFrame = null;
        this.currentFrameStartTime = 0; // Epoch ms of frame second 0
        this.audioFrameStartTime = 0;   // ctx.currentTime corresponding to frame second 0
        this.scheduledSeconds = new Set();
        this.lastScheduledMinute = -1;

        // Callbacks
        this.onSecondChange = null;
        this.onStatusChange = null;

        this.timer = new WorkerTimer(25);
        this.timer.onTick(() => this._schedulerLoop());
    }

    /**
     * Build non-linear distortion curve for WaveShaperNode.
     * Generates rich odd harmonics (3rd, 5th, 7th...) by clipping transitions sharply.
     * @param {number} k Distortion factor (e.g. 50)
     * @returns {Float32Array}
     */
    _makeDistortionCurve(k = 50) {
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    /**
     * Initialize Web Audio graph.
     */
    async init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }

        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }

        // Clean existing nodes if any
        if (this.masterGain) {
            try { this.masterGain.disconnect(); } catch (e) {}
        }

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

        // Analyser for UI visualizer
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.8;

        // WaveShaper Overdrive
        this.waveShaper = this.ctx.createWaveShaper();
        this.waveShaper.curve = this._makeDistortionCurve(40);
        this.waveShaper.oversample = '4x';

        // Channel Splitter / Merger for Differential Stereo Drive
        this.merger = this.ctx.createChannelMerger(2);
        this.leftGain = this.ctx.createGain();
        this.rightGain = this.ctx.createGain();

        this._updateStereoPolarity();

        // Connect graph
        // Source -> [WaveShaper] -> Left/Right Gains -> Merger -> MasterGain -> Analyser -> Destination
        this.leftGain.connect(this.merger, 0, 0);   // To Left Channel
        this.rightGain.connect(this.merger, 0, 1);  // To Right Channel

        this.merger.connect(this.masterGain);
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
    }

    _updateStereoPolarity() {
        if (!this.leftGain || !this.rightGain || !this.ctx) return;
        const now = this.ctx.currentTime;
        this.leftGain.gain.setValueAtTime(1.0, now);
        // Anti-phase: Right channel is inverted (-1.0) to achieve 2x potential difference across coils
        this.rightGain.gain.setValueAtTime(this.stereoAntiPhase ? -1.0 : 1.0, now);
    }

    setStereoAntiPhase(enabled) {
        this.stereoAntiPhase = !!enabled;
        this._updateStereoPolarity();
    }

    setHarmonicOverdrive(enabled) {
        this.harmonicOverdrive = !!enabled;
    }

    setVolume(val) {
        this.volume = Math.max(0.0, Math.min(1.0, val));
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        }
    }

    setCarrierFrequency(freq) {
        this.carrierFreq = freq;
    }

    /**
     * Start transmitting time signals continuously.
     * @param {Object} encoder Protocol encoder instance (e.g. JJYEncoder, WWVBEncoder)
     * @param {Function} timeProvider Function returning current Date (e.g. from NTPSync)
     * @param {Object} options Options like summerTime, leapSecond
     */
    async start(encoder, timeProvider, options = {}) {
        await this.init();
        this.currentEncoder = encoder;
        this.timeProvider = timeProvider;
        this.options = options;
        this.isPlaying = true;
        this.carrierFreq = encoder.baseAudioFrequency;

        // Reset scheduling state
        this.scheduledSeconds.clear();
        this.lastScheduledMinute = -1;

        // Request Screen Wake Lock
        if ('wakeLock' in navigator) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
            } catch (err) {
                console.warn('Wake Lock request failed:', err);
            }
        }

        this.timer.start();
        if (this.onStatusChange) this.onStatusChange(true);
    }

    /**
     * High precision lookahead scheduling loop.
     */
    _schedulerLoop() {
        if (!this.isPlaying || !this.ctx || !this.currentEncoder) return;

        const now = this.timeProvider ? this.timeProvider() : new Date();
        const nowMs = now.getTime();
        const currentSec = now.getSeconds();

        // Check if we need to encode a new 60-second frame
        const currentMinuteEpoch = Math.floor(nowMs / 60000) * 60000;

        if (this.currentFrameStartTime !== currentMinuteEpoch) {
            this.currentFrameStartTime = currentMinuteEpoch;
            const targetDate = new Date(currentMinuteEpoch);
            this.currentFrame = this.currentEncoder.encodeFrame(targetDate, this.options);
            this.scheduledSeconds.clear();

            // Calculate AudioContext time reference for this frame's second 0 (NTP locked)
            const frameStartOffsetSec = (currentMinuteEpoch - nowMs) / 1000;
            this.audioFrameStartTime = this.ctx.currentTime + frameStartOffsetSec;
        }

        // Notify UI about current playback second
        if (this.onSecondChange && this.currentFrame) {
            this.onSecondChange(currentSec, this.currentFrame[currentSec], this.currentFrame);
        }

        // Lookahead scheduling window (schedule notes up to 1.5 seconds ahead)
        const lookaheadWindow = 1.5;
        const currentAudioTime = this.ctx.currentTime;

        for (let s = 0; s < 60; s++) {
            if (this.scheduledSeconds.has(s)) continue;

            const secondStartAudioTime = this.audioFrameStartTime + s;
            const timeUntilStart = secondStartAudioTime - currentAudioTime;

            // Schedule if it falls within the lookahead window and is not in the past
            if (timeUntilStart >= -0.05 && timeUntilStart <= lookaheadWindow) {
                this.scheduledSeconds.add(s);
                const symbolInfo = this.currentFrame[s];
                this._schedulePulse(secondStartAudioTime, symbolInfo.toneDuration);
            }
        }
    }

    /**
     * Schedule a single tone pulse at a specific audio timestamp.
     * @param {number} startTime AudioContext time
     * @param {number} duration Tone duration in seconds
     */
    _schedulePulse(startTime, duration) {
        if (duration <= 0.001) return; // Silent / missing pulse (e.g. DCF77 s59)

        const osc = this.ctx.createOscillator();
        const pulseGain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(this.carrierFreq, startTime);

        // Micro-envelope to prevent audio clicks (1ms ramp)
        const rampTime = 0.002;
        pulseGain.gain.setValueAtTime(0.0001, startTime);
        pulseGain.gain.exponentialRampToValueAtTime(1.0, startTime + rampTime);
        pulseGain.gain.setValueAtTime(1.0, startTime + duration - rampTime);
        pulseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(pulseGain);

        if (this.harmonicOverdrive && this.waveShaper) {
            pulseGain.connect(this.waveShaper);
            this.waveShaper.connect(this.leftGain);
            this.waveShaper.connect(this.rightGain);
        } else {
            pulseGain.connect(this.leftGain);
            pulseGain.connect(this.rightGain);
        }

        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    /**
     * Play a quick 1-second carrier test tone for volume and coil coupling testing.
     * @param {number} freq Base frequency in Hz
     */
    async playTestTone(freq = 13333.333) {
        await this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        const t = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.exponentialRampToValueAtTime(1.0, t + 0.01);
        gain.gain.setValueAtTime(1.0, t + 0.99);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

        osc.connect(gain);
        gain.connect(this.leftGain);
        gain.connect(this.rightGain);

        osc.start(t);
        osc.stop(t + 1.0);
    }

    /**
     * Stop signal transmission and release resources.
     */
    stop() {
        this.isPlaying = false;
        this.timer.stop();
        this.scheduledSeconds.clear();
        this.currentFrame = null;

        if (this.wakeLock) {
            try {
                this.wakeLock.release();
            } catch (e) {}
            this.wakeLock = null;
        }

        if (this.ctx) {
            try {
                this.ctx.close();
            } catch (e) {}
            this.ctx = null;
        }

        if (this.onStatusChange) this.onStatusChange(false);
    }
}

/**
 * 9M2PJU WebTimeSignal - Main Application Controller
 */

import { I18n } from './i18n.js';
import { NTPSync } from './ntp-sync.js';
import { AudioEngine } from './audio-engine.js';
import { JJYEncoder } from './encoders/jjy.js';
import { WWVBEncoder } from './encoders/wwvb.js';
import { DCF77Encoder } from './encoders/dcf77.js';
import { MSFEncoder } from './encoders/msf.js';
import { BPCEncoder } from './encoders/bpc.js';

class App {
    constructor() {
        this.i18n = new I18n();
        this.ntp = new NTPSync();
        this.audio = new AudioEngine();

        // Encoders catalog
        this.encoders = {
            'JJY40': new JJYEncoder(40),
            'JJY60': new JJYEncoder(60),
            'WWVB': new WWVBEncoder(),
            'DCF77': new DCF77Encoder(),
            'MSF': new MSFEncoder(),
            'BPC': new BPCEncoder()
        };

        this.currentEncoder = this.encoders['JJY40'];
        this.currentFrame = null;
        this.isTransmitting = false;
        this.wakeLockSentinel = null;
        this.deferredInstallPrompt = null;
        this.inspectedSecond = null;

        this.dom = {};
        this._bindDOM();
        this._bindEvents();
        this._initPWA();
        this._initInspectorGrid();
        this._initClockLoop();
        this._initVisualizer();

        // Auto sync with NTP on startup
        this.ntp.sync();
        this.i18n.updateDOM();
    }

    _bindDOM() {
        this.dom = {
            langSelect: document.getElementById('lang-select'),
            themeToggle: document.getElementById('theme-toggle'),
            btnPwaInstall: document.getElementById('btn-pwa-install'),
            pwaBanner: document.getElementById('pwa-install-banner'),
            btnBannerInstall: document.getElementById('btn-banner-install'),
            btnBannerDismiss: document.getElementById('btn-banner-dismiss'),
            iosModal: document.getElementById('ios-install-modal'),
            btnCloseIosModal: document.getElementById('btn-close-ios-modal'),
            btnDoneIosModal: document.getElementById('btn-done-ios-modal'),
            wakeLockBadge: document.getElementById('wake-lock-badge'),
            protocolSelect: document.getElementById('protocol-select'),
            ntpSyncBtn: document.getElementById('btn-ntp-sync'),
            ntpDot: document.getElementById('ntp-status-dot'),
            ntpStatusText: document.getElementById('ntp-status-text'),
            ntpOffsetVal: document.getElementById('ntp-offset-val'),
            ntpRttVal: document.getElementById('ntp-rtt-val'),
            ntpJitterVal: document.getElementById('ntp-jitter-val'),
            ntpColoVal: document.getElementById('ntp-colo-val'),
            clockDisplay: document.getElementById('clock-display'),
            clockTzInfo: document.getElementById('clock-tz-info'),
            btnStartStop: document.getElementById('btn-start-stop'),
            btnTestTone: document.getElementById('btn-test-tone'),
            volumeSlider: document.getElementById('volume-slider'),
            volumeVal: document.getElementById('volume-val'),
            antiPhaseToggle: document.getElementById('toggle-antiphase'),
            overdriveToggle: document.getElementById('toggle-overdrive'),
            summerTimeToggle: document.getElementById('toggle-summertime'),
            customTimeToggle: document.getElementById('toggle-custom-time'),
            customTimeGroup: document.getElementById('custom-time-group'),
            customTimeInput: document.getElementById('custom-time-input'),
            inspectorGrid: document.getElementById('inspector-grid'),
            canvas: document.getElementById('oscilloscope-canvas'),
            activeSecVal: document.getElementById('active-sec-val'),
            activeSymbolVal: document.getElementById('active-symbol-val'),
            activeFieldVal: document.getElementById('active-field-val')
        };
    }

    _bindEvents() {
        // Language Switcher
        this.dom.langSelect.value = this.i18n.currentLang;
        this.dom.langSelect.addEventListener('change', (e) => {
            this.i18n.setLanguage(e.target.value);
            this._updateClockDisplay();
            this._renderStaticFrame();
        });

        // Theme Switcher
        this.dom.themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            this.dom.themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
            localStorage.setItem('web_time_signal_theme', next);
        });

        // Load saved theme if any
        const savedTheme = localStorage.getItem('web_time_signal_theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            this.dom.themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
        }

        // Protocol Selection
        this.dom.protocolSelect.addEventListener('change', (e) => {
            const code = e.target.value;
            if (this.encoders[code]) {
                this.currentEncoder = this.encoders[code];
                if (this.isTransmitting) {
                    this.audio.start(this.currentEncoder, () => this._getCurrentTime(), this._getOptions());
                }
                this._renderStaticFrame();
            }
        });

        // NTP Sync Button
        this.dom.ntpSyncBtn.addEventListener('click', () => {
            this.ntp.sync();
        });

        // NTP Updates
        this.ntp.onChange((info) => {
            this.dom.ntpDot.className = `status-dot ${info.status === 'synced' ? 'synced' : (info.status === 'syncing' ? 'syncing' : 'error')}`;
            if (info.status === 'synced') {
                this.dom.ntpStatusText.textContent = `${this.i18n.t('ntpStatusSynced')} (${info.source})`;
                this.dom.ntpOffsetVal.textContent = `${info.offsetMs >= 0 ? '+' : ''}${info.offsetMs} ms`;
                this.dom.ntpRttVal.textContent = `${info.rttMs} ms`;
                if (this.dom.ntpJitterVal) this.dom.ntpJitterVal.textContent = `±${info.jitterMs} ms`;
                if (this.dom.ntpColoVal) this.dom.ntpColoVal.textContent = info.colo || 'EDGE';
            } else if (info.status === 'syncing') {
                this.dom.ntpStatusText.textContent = this.i18n.t('ntpStatusSyncing');
            } else {
                this.dom.ntpStatusText.textContent = this.i18n.t('ntpStatusFailed');
                this.dom.ntpOffsetVal.textContent = '0 ms';
                this.dom.ntpRttVal.textContent = '--';
                if (this.dom.ntpJitterVal) this.dom.ntpJitterVal.textContent = '±0.0 ms';
                if (this.dom.ntpColoVal) this.dom.ntpColoVal.textContent = 'LOCAL';
            }
        });

        // Start / Stop Transmission
        this.dom.btnStartStop.addEventListener('click', () => {
            if (this.isTransmitting) {
                this._stopTransmission();
            } else {
                this._startTransmission();
            }
        });

        // Test Tone
        this.dom.btnTestTone.addEventListener('click', () => {
            this.audio.playTestTone(this.currentEncoder.baseAudioFrequency);
        });

        // Volume
        this.dom.volumeSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.audio.setVolume(val);
            this.dom.volumeVal.textContent = `${Math.round(val * 100)}%`;
        });

        // Toggles
        this.dom.antiPhaseToggle.addEventListener('change', (e) => {
            this.audio.setStereoAntiPhase(e.target.checked);
        });

        this.dom.overdriveToggle.addEventListener('change', (e) => {
            this.audio.setHarmonicOverdrive(e.target.checked);
        });

        this.dom.summerTimeToggle.addEventListener('change', () => {
            if (this.isTransmitting) {
                this.audio.start(this.currentEncoder, () => this._getCurrentTime(), this._getOptions());
            }
            this._renderStaticFrame();
        });

        // Custom Time Override Toggle
        this.dom.customTimeToggle.addEventListener('change', (e) => {
            this.dom.customTimeGroup.style.display = e.target.checked ? 'block' : 'none';
        });

        // Visibility change for Screen Wake Lock
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible' && this.isTransmitting) {
                await this._requestWakeLock();
            }
        });

        // Audio Engine callbacks
        this.audio.onSecondChange = (sec, symbolInfo, frame) => {
            if (this.currentFrame !== frame || sec === 0) {
                this.currentFrame = frame;
                this._renderFrameCells(frame);
            }
            this._highlightSecond(sec, symbolInfo);
        };

        this.audio.onStatusChange = (running) => {
            this.isTransmitting = running;
            this.dom.btnStartStop.className = running ? 'btn btn-danger btn-action' : 'btn btn-primary btn-action';
            const labelSpan = this.dom.btnStartStop.querySelector('span:not(.btn-indicator)');
            if (labelSpan) {
                labelSpan.textContent = running ? this.i18n.t('stop') : this.i18n.t('start');
            } else {
                this.dom.btnStartStop.textContent = running ? this.i18n.t('stop') : this.i18n.t('start');
            }
        };
    }

    _initPWA() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        if (isStandalone) {
            // Already running as standalone PWA
            if (this.dom.btnPwaInstall) this.dom.btnPwaInstall.classList.add('hidden');
            if (this.dom.pwaBanner) this.dom.pwaBanner.classList.add('hidden');
            return;
        }

        // Handle beforeinstallprompt (Chrome / Android / Edge / Desktop)
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredInstallPrompt = e;

            if (this.dom.btnPwaInstall) {
                this.dom.btnPwaInstall.classList.remove('hidden');
            }

            const dismissed = sessionStorage.getItem('web_time_signal_pwa_dismissed');
            if (!dismissed && this.dom.pwaBanner) {
                this.dom.pwaBanner.classList.remove('hidden');
            }
        });

        // Handle iOS install presentation
        if (isIOS && !isStandalone) {
            if (this.dom.btnPwaInstall) {
                this.dom.btnPwaInstall.classList.remove('hidden');
            }
        }

        // Install button click triggers
        const triggerInstall = async () => {
            if (isIOS) {
                if (this.dom.iosModal) this.dom.iosModal.classList.remove('hidden');
                return;
            }

            if (!this.deferredInstallPrompt) {
                // Fallback guide if prompt not available
                alert(this.i18n.t('installDesc'));
                return;
            }

            this.deferredInstallPrompt.prompt();
            const choiceResult = await this.deferredInstallPrompt.userChoice;
            if (choiceResult.outcome === 'accepted') {
                if (this.dom.btnPwaInstall) this.dom.btnPwaInstall.classList.add('hidden');
                if (this.dom.pwaBanner) this.dom.pwaBanner.classList.add('hidden');
            }
            this.deferredInstallPrompt = null;
        };

        if (this.dom.btnPwaInstall) {
            this.dom.btnPwaInstall.addEventListener('click', triggerInstall);
        }

        if (this.dom.btnBannerInstall) {
            this.dom.btnBannerInstall.addEventListener('click', triggerInstall);
        }

        if (this.dom.btnBannerDismiss) {
            this.dom.btnBannerDismiss.addEventListener('click', () => {
                if (this.dom.pwaBanner) this.dom.pwaBanner.classList.add('hidden');
                sessionStorage.setItem('web_time_signal_pwa_dismissed', '1');
            });
        }

        // iOS modal dismissal
        const closeIosModal = () => {
            if (this.dom.iosModal) this.dom.iosModal.classList.add('hidden');
        };

        if (this.dom.btnCloseIosModal) {
            this.dom.btnCloseIosModal.addEventListener('click', closeIosModal);
        }
        if (this.dom.btnDoneIosModal) {
            this.dom.btnDoneIosModal.addEventListener('click', closeIosModal);
        }
        if (this.dom.iosModal) {
            this.dom.iosModal.addEventListener('click', (e) => {
                if (e.target === this.dom.iosModal) closeIosModal();
            });
        }

        // When successfully installed
        window.addEventListener('appinstalled', () => {
            if (this.dom.btnPwaInstall) this.dom.btnPwaInstall.classList.add('hidden');
            if (this.dom.pwaBanner) this.dom.pwaBanner.classList.add('hidden');
            this.deferredInstallPrompt = null;
            console.log('9M2PJU WebTimeSignal PWA was successfully installed.');
        });
    }

    async _requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                this.wakeLockSentinel = await navigator.wakeLock.request('screen');
                if (this.dom.wakeLockBadge) this.dom.wakeLockBadge.classList.remove('hidden');
                this.wakeLockSentinel.addEventListener('release', () => {
                    if (!this.isTransmitting && this.dom.wakeLockBadge) {
                        this.dom.wakeLockBadge.classList.add('hidden');
                    }
                });
            } catch (err) {
                console.warn('Wake Lock request failed:', err);
                if (this.dom.wakeLockBadge) this.dom.wakeLockBadge.classList.add('hidden');
            }
        }
    }

    async _releaseWakeLock() {
        if (this.wakeLockSentinel) {
            try {
                await this.wakeLockSentinel.release();
            } catch (e) {
                // Ignore release errors
            }
            this.wakeLockSentinel = null;
        }
        if (this.dom.wakeLockBadge) this.dom.wakeLockBadge.classList.add('hidden');
    }

    _getOptions() {
        return {
            summerTime: this.dom.summerTimeToggle.checked,
            leapSecond: 0
        };
    }

    _getCurrentTime() {
        if (this.dom.customTimeToggle.checked && this.dom.customTimeInput.value) {
            return new Date(this.dom.customTimeInput.value);
        }
        return this.ntp.getNow();
    }

    async _startTransmission() {
        await this._requestWakeLock();
        this.audio.start(this.currentEncoder, () => this._getCurrentTime(), this._getOptions());
    }

    async _stopTransmission() {
        await this._releaseWakeLock();
        this.audio.stop();
        this._clearHighlight();
    }

    _initInspectorGrid() {
        this.dom.inspectorGrid.innerHTML = '';
        for (let i = 0; i < 60; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${i}`;
            cell.textContent = i < 10 ? `0${i}` : `${i}`;
            cell.setAttribute('tabindex', '0');
            cell.setAttribute('role', 'button');
            cell.setAttribute('aria-label', `Second ${i}`);

            // Interactive inspection on click or Enter key
            const inspect = () => this._inspectSpecificSecond(i);
            cell.addEventListener('click', inspect);
            cell.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    inspect();
                }
            });

            this.dom.inspectorGrid.appendChild(cell);
        }
        this._renderStaticFrame();
    }

    _inspectSpecificSecond(sec) {
        document.querySelectorAll('.cell.inspected').forEach(el => el.classList.remove('inspected'));
        const targetCell = document.getElementById(`cell-${sec}`);
        if (targetCell) targetCell.classList.add('inspected');

        const date = this._getCurrentTime();
        const frame = this.currentFrame || this.currentEncoder.encodeFrame(date, this._getOptions());
        const sym = frame[sec];
        if (sym) {
            this.dom.activeSecVal.textContent = sec < 10 ? `0${sec}` : `${sec}`;
            this.dom.activeSymbolVal.textContent = `${sym.symbol} (${Math.round(sym.toneDuration * 1000)}ms)`;
            this.dom.activeFieldVal.textContent = sym.label;
        }
    }

    _renderFrameCells(frame) {
        if (!frame) return;
        for (let i = 0; i < 60; i++) {
            const cell = document.getElementById(`cell-${i}`);
            if (!cell) continue;
            const sym = frame[i];
            cell.className = 'cell';
            if (sym.type === 'marker') {
                cell.classList.add(sym.toneDuration === 0 ? 'missing' : 'marker');
            } else if (sym.bitValue === 1) {
                cell.classList.add('bit1');
            } else {
                cell.classList.add('bit0');
            }
            cell.title = `Sec ${i}: ${sym.label} (${sym.symbol}, ${Math.round(sym.toneDuration * 1000)}ms)`;
        }
    }

    _renderStaticFrame() {
        const date = this._getCurrentTime();
        const frame = this.currentEncoder.encodeFrame(date, this._getOptions());
        this.currentFrame = frame;
        this._renderFrameCells(frame);
    }

    _highlightSecond(sec, symbolInfo) {
        document.querySelectorAll('.cell.current').forEach(el => el.classList.remove('current'));
        const cell = document.getElementById(`cell-${sec}`);
        if (cell) {
            cell.classList.add('current');
        }

        if (symbolInfo) {
            this.dom.activeSecVal.textContent = sec < 10 ? `0${sec}` : `${sec}`;
            this.dom.activeSymbolVal.textContent = `${symbolInfo.symbol} (${Math.round(symbolInfo.toneDuration * 1000)}ms)`;
            this.dom.activeFieldVal.textContent = symbolInfo.label;
        }
    }

    _clearHighlight() {
        document.querySelectorAll('.cell.current').forEach(el => el.classList.remove('current'));
        this.dom.activeSecVal.textContent = '--';
        this.dom.activeSymbolVal.textContent = '--';
        this.dom.activeFieldVal.textContent = '--';
    }

    _initClockLoop() {
        const update = () => {
            this._updateClockDisplay();
            requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    }

    _updateClockDisplay() {
        const now = this._getCurrentTime();
        const pad = (n) => (n < 10 ? '0' + n : n);
        const hours = pad(now.getHours());
        const minutes = pad(now.getMinutes());
        const seconds = pad(now.getSeconds());
        const ms = String(Math.floor(now.getMilliseconds() / 100));

        this.dom.clockDisplay.textContent = `${hours}:${minutes}:${seconds}.${ms}`;
        this.dom.clockTzInfo.textContent = `${now.toDateString()} (UTC${now.getTimezoneOffset() <= 0 ? '+' : ''}${-now.getTimezoneOffset() / 60})`;
    }

    _initVisualizer() {
        const canvas = this.dom.canvas;
        const ctx = canvas.getContext('2d');
        const wrapper = canvas.parentElement;

        // Resize canvas to match display resolution and pixel ratio
        const resizeCanvas = () => {
            if (!wrapper) return;
            const dpr = window.devicePixelRatio || 1;
            const rect = wrapper.getBoundingClientRect();
            const displayWidth = Math.floor(rect.width);
            const displayHeight = Math.max(70, Math.floor(rect.height || (rect.width * 0.09)));

            if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
                canvas.width = displayWidth * dpr;
                canvas.height = displayHeight * dpr;
            }
        };

        if (window.ResizeObserver) {
            const ro = new ResizeObserver(() => resizeCanvas());
            ro.observe(wrapper);
        } else {
            window.addEventListener('resize', resizeCanvas);
        }
        resizeCanvas();

        const draw = () => {
            requestAnimationFrame(draw);
            const w = canvas.width;
            const h = canvas.height;
            const dpr = window.devicePixelRatio || 1;

            ctx.fillStyle = '#05070a';
            ctx.fillRect(0, 0, w, h);

            if (!this.audio.analyser || !this.isTransmitting) {
                // Idle baseline
                ctx.strokeStyle = '#21262d';
                ctx.lineWidth = 2 * dpr;
                ctx.beginPath();
                ctx.moveTo(0, h / 2);
                ctx.lineTo(w, h / 2);
                ctx.stroke();
                return;
            }

            const bufferLength = this.audio.analyser.fftSize;
            const dataArray = new Uint8Array(bufferLength);
            this.audio.analyser.getByteTimeDomainData(dataArray);

            ctx.lineWidth = 2 * dpr;
            ctx.strokeStyle = '#58a6ff';
            ctx.beginPath();

            const sliceWidth = (w * 1.0) / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * h) / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.lineTo(w, h / 2);
            ctx.stroke();
        };

        draw();
    }
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((registration) => {
            registration.update();
            registration.addEventListener('updatefound', () => {
                const installingWorker = registration.installing;
                if (installingWorker) {
                    installingWorker.addEventListener('statechange', () => {
                        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('New WebTimeSignal version installed. Refreshing application...');
                            window.location.reload();
                        }
                    });
                }
            });
        }).catch(err => {
            console.warn('ServiceWorker registration failed:', err);
        });
    });
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

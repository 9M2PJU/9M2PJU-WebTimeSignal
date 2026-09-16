/**
 * 9M2PJU WebTimeSignal - Service Worker for Offline PWA Support
 */

const CACHE_NAME = 'web-time-signal-v2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/app.css',
    './js/app.js',
    './js/i18n.js',
    './js/ntp-sync.js',
    './js/audio-engine.js',
    './js/worker-timer.js',
    './js/encoders/base-encoder.js',
    './js/encoders/jjy.js',
    './js/encoders/wwvb.js',
    './js/encoders/dcf77.js',
    './js/encoders/msf.js',
    './js/encoders/bpc.js',
    './manifest.webmanifest',
    './icons/icon.svg'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    // For NTP trace/API requests, bypass cache
    if (e.request.url.includes('trace') || e.request.url.includes('worldtimeapi')) {
        return;
    }

    e.respondWith(
        caches.match(e.request).then((cached) => {
            return cached || fetch(e.request).then((res) => {
                return res;
            });
        }).catch(() => caches.match('./index.html'))
    );
});

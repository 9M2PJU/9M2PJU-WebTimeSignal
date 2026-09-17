/**
 * 9M2PJU WebTimeSignal - Unit Test Suite
 */

import { BaseEncoder } from '../js/encoders/base-encoder.js';
import { JJYEncoder } from '../js/encoders/jjy.js';
import { WWVBEncoder } from '../js/encoders/wwvb.js';
import { DCF77Encoder } from '../js/encoders/dcf77.js';
import { MSFEncoder } from '../js/encoders/msf.js';
import { BPCEncoder } from '../js/encoders/bpc.js';

export class TestRunner {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    addTest(name, fn) {
        this.tests.push({ name, fn });
    }

    async runAll() {
        this.results = [];
        let passed = 0;
        let failed = 0;

        for (const test of this.tests) {
            try {
                await test.fn();
                this.results.push({ name: test.name, status: 'PASS' });
                passed++;
            } catch (err) {
                this.results.push({ name: test.name, status: 'FAIL', error: err.message || String(err) });
                failed++;
            }
        }

        return { total: this.tests.length, passed, failed, results: this.results };
    }
}

export function registerAllTests(runner) {
    // ----------------------------------------------------
    // BaseEncoder Tests
    // ----------------------------------------------------
    runner.addTest('BaseEncoder.isLeapYear identifies leap years correctly', () => {
        if (!BaseEncoder.isLeapYear(2024)) throw new Error('2024 should be leap year');
        if (!BaseEncoder.isLeapYear(2000)) throw new Error('2000 should be leap year');
        if (BaseEncoder.isLeapYear(2023)) throw new Error('2023 should not be leap year');
        if (BaseEncoder.isLeapYear(1900)) throw new Error('1900 should not be leap year');
    });

    runner.addTest('BaseEncoder.getDayOfYear computes accurate 1-based day count', () => {
        const jan1 = new Date(Date.UTC(2024, 0, 1));
        if (BaseEncoder.getDayOfYear(jan1, true) !== 1) {
            throw new Error(`Expected Jan 1 to be day 1, got ${BaseEncoder.getDayOfYear(jan1, true)}`);
        }
        const dec31Leap = new Date(Date.UTC(2024, 11, 31));
        if (BaseEncoder.getDayOfYear(dec31Leap, true) !== 366) {
            throw new Error(`Expected Dec 31 2024 to be day 366, got ${BaseEncoder.getDayOfYear(dec31Leap, true)}`);
        }
        const dec31NonLeap = new Date(Date.UTC(2023, 11, 31));
        if (BaseEncoder.getDayOfYear(dec31NonLeap, true) !== 365) {
            throw new Error(`Expected Dec 31 2023 to be day 365, got ${BaseEncoder.getDayOfYear(dec31NonLeap, true)}`);
        }
    });

    runner.addTest('BaseEncoder.calcEvenParity & calcOddParity', () => {
        if (BaseEncoder.calcEvenParity([1, 0, 1]) !== 0) throw new Error('Even parity of [1,0,1] should be 0');
        if (BaseEncoder.calcEvenParity([1, 1, 1]) !== 1) throw new Error('Even parity of [1,1,1] should be 1');
        if (BaseEncoder.calcOddParity([1, 0, 1]) !== 1) throw new Error('Odd parity of [1,0,1] should be 1');
        if (BaseEncoder.calcOddParity([1, 1, 1]) !== 0) throw new Error('Odd parity of [1,1,1] should be 0');
    });

    runner.addTest('BaseEncoder.toBCDBits converts properly according to weights', () => {
        const bits = BaseEncoder.toBCDBits(35, [40, 20, 10, 8, 4, 2, 1]);
        // 35 = 20 + 10 + 4 + 1 -> [0, 1, 1, 0, 1, 0, 1]
        const expected = [0, 1, 1, 0, 1, 0, 1];
        if (JSON.stringify(bits) !== JSON.stringify(expected)) {
            throw new Error(`Expected ${expected}, got ${bits}`);
        }
    });

    // ----------------------------------------------------
    // JJYEncoder Tests
    // ----------------------------------------------------
    runner.addTest('JJYEncoder produces 60-element frame with exact markers at 0,9,19,29,39,49,59', () => {
        const encoder = new JJYEncoder(40);
        const testDate = new Date('2024-05-15T10:30:00Z');
        const frame = encoder.encodeFrame(testDate, { summerTime: false });

        if (frame.length !== 60) throw new Error(`Expected 60 elements, got ${frame.length}`);

        const markerIndices = [0, 9, 19, 29, 39, 49, 59];
        for (const idx of markerIndices) {
            if (frame[idx].type !== 'marker') {
                throw new Error(`Index ${idx} should be marker, got ${frame[idx].type}`);
            }
            if (frame[idx].toneDuration !== 0.2) {
                throw new Error(`Index ${idx} marker duration should be 0.2s, got ${frame[idx].toneDuration}`);
            }
        }
    });

    runner.addTest('JJYEncoder verifies parity bits PA1 and PA2 match bit sums', () => {
        const encoder = new JJYEncoder(40);
        const testDate = new Date('2024-05-15T14:47:00Z'); // Minute 47, Hour in JST
        const frame = encoder.encodeFrame(testDate);

        const pa1Bit = frame[36].bitValue;
        const pa2Bit = frame[37].bitValue;

        // Hour bits are s10..s18
        let hourSum = 0;
        for (let i = 10; i <= 18; i++) hourSum += frame[i].bitValue;
        if (hourSum % 2 !== pa1Bit) {
            throw new Error(`PA1 parity mismatch: sum=${hourSum}, pa1Bit=${pa1Bit}`);
        }

        // Minute bits are s01..s08
        let minSum = 0;
        for (let i = 1; i <= 8; i++) minSum += frame[i].bitValue;
        if (minSum % 2 !== pa2Bit) {
            throw new Error(`PA2 parity mismatch: sum=${minSum}, pa2Bit=${pa2Bit}`);
        }
    });

    runner.addTest('JJYEncoder toggles Summer Time bit SU2 at s40', () => {
        const encoder = new JJYEncoder(40);
        const testDate = new Date('2024-06-01T12:00:00Z');
        const frameOff = encoder.encodeFrame(testDate, { summerTime: false });
        const frameOn = encoder.encodeFrame(testDate, { summerTime: true });

        if (frameOff[40].bitValue !== 0) throw new Error('SU2 should be 0 when summerTime is false');
        if (frameOn[40].bitValue !== 1) throw new Error('SU2 should be 1 when summerTime is true');
    });

    // ----------------------------------------------------
    // WWVBEncoder Tests
    // ----------------------------------------------------
    runner.addTest('WWVBEncoder produces 60-element frame with marker at s00 and P0-P5', () => {
        const encoder = new WWVBEncoder();
        const testDate = new Date('2024-03-10T15:30:00Z');
        const frame = encoder.encodeFrame(testDate, { dst: 1 });

        if (frame.length !== 60) throw new Error(`Expected 60 elements, got ${frame.length}`);

        const markerIndices = [0, 9, 19, 29, 39, 49, 59];
        for (const idx of markerIndices) {
            if (frame[idx].type !== 'marker') throw new Error(`WWVB s${idx} should be marker`);
            if (frame[idx].toneDuration !== 0.8) throw new Error(`WWVB marker should have 0.8s tone`);
        }

        // Check DST bits at s57, s58
        if (frame[57].bitValue !== 1 || frame[58].bitValue !== 1) {
            throw new Error('WWVB DST bits should be 1 when dst=1');
        }
    });

    // ----------------------------------------------------
    // DCF77Encoder Tests
    // ----------------------------------------------------
    runner.addTest('DCF77Encoder encodes bit 20=1 and missing pulse at second 59', () => {
        const encoder = new DCF77Encoder();
        const testDate = new Date('2024-07-20T18:45:00Z');
        const frame = encoder.encodeFrame(testDate, { summerTime: true });

        if (frame.length !== 60) throw new Error(`Expected 60 elements, got ${frame.length}`);

        // s20 must be 1 (start of time)
        if (frame[20].bitValue !== 1) throw new Error('DCF77 s20 must be 1');

        // s59 must have 0 toneDuration (missing pulse for minute sync)
        if (frame[59].toneDuration !== 0.0) throw new Error('DCF77 s59 must have 0.0s tone duration (missing pulse)');

        // Check parity P1 at s28
        let minBits = [];
        for (let i = 21; i <= 27; i++) minBits.push(frame[i].bitValue);
        const expectedP1 = minBits.reduce((a, b) => a + b, 0) % 2;
        if (frame[28].bitValue !== expectedP1) {
            throw new Error(`DCF77 Minute parity P1 mismatch: expected ${expectedP1}, got ${frame[28].bitValue}`);
        }
    });

    // ----------------------------------------------------
    // MSF & BPC Encoder Tests
    // ----------------------------------------------------
    runner.addTest('MSFEncoder generates 500ms minute identifier at s00', () => {
        const encoder = new MSFEncoder();
        const testDate = new Date('2024-10-01T08:15:00Z');
        const frame = encoder.encodeFrame(testDate);

        if (frame[0].toneDuration !== 0.5) throw new Error('MSF s00 must have 0.5s tone');
        if (frame.length !== 60) throw new Error(`Expected 60 elements, got ${frame.length}`);
    });

    runner.addTest('BPCEncoder generates 3 20-second sub-frames', () => {
        const encoder = new BPCEncoder();
        const testDate = new Date('2024-11-12T06:22:00Z');
        const frame = encoder.encodeFrame(testDate);

        if (frame.length !== 60) throw new Error(`Expected 60 elements, got ${frame.length}`);
        if (frame[0].type !== 'marker' || frame[20].type !== 'marker' || frame[40].type !== 'marker') {
            throw new Error('BPC sub-frame starts at 0, 20, 40 must be markers');
        }
    });

    // ----------------------------------------------------
    // Internationalization (i18n) & PWA Keys Tests
    // ----------------------------------------------------
    runner.addTest('I18n translations complete across EN, MS, JA including PWA install keys', async () => {
        const { translations } = await import('../js/i18n.js');
        const enKeys = Object.keys(translations.en);
        const msKeys = Object.keys(translations.ms);
        const jaKeys = Object.keys(translations.ja);

        const requiredPWAKeys = ['installApp', 'installTitle', 'installDesc', 'installBtn', 'installLater', 'iosInstallTitle'];
        for (const k of requiredPWAKeys) {
            if (!enKeys.includes(k)) throw new Error(`Missing PWA key in EN: ${k}`);
            if (!msKeys.includes(k)) throw new Error(`Missing PWA key in MS: ${k}`);
            if (!jaKeys.includes(k)) throw new Error(`Missing PWA key in JA: ${k}`);
        }

        for (const k of enKeys) {
            if (!msKeys.includes(k)) throw new Error(`Missing MS translation for key: ${k}`);
            if (!jaKeys.includes(k)) throw new Error(`Missing JA translation for key: ${k}`);
        }
    });
}

/**
 * 9M2PJU WebTimeSignal - JJY Encoder (Japan Standard Time)
 * Supports JJY 40 kHz (Mount Otakadoya) and JJY 60 kHz (Mount Hagane)
 */

import { BaseEncoder } from './base-encoder.js';

export class JJYEncoder {
    constructor(frequencyKhz = 40) {
        this.name = frequencyKhz === 60 ? 'JJY 60 kHz (Hagane-yama)' : 'JJY 40 kHz (Otakadoya-yama)';
        this.code = frequencyKhz === 60 ? 'JJY60' : 'JJY40';
        this.targetRfKhz = frequencyKhz;
        // 40 kHz uses 3rd harmonic of 13.333 kHz
        // 60 kHz uses 3rd harmonic of 20.000 kHz (or 5th of 12 kHz)
        this.baseAudioFrequency = frequencyKhz === 60 ? 20000 : 13333.333;
        this.harmonicMultiplier = 3;
        this.timeZoneOffsetHours = 9; // JST is UTC+9
    }

    /**
     * Encode a complete 60-second JJY frame for a given target Date.
     * @param {Date} date Time for the minute frame being transmitted
     * @param {Object} options Configuration options (summerTime, leapSecond)
     * @returns {Array<Object>} 60 symbol objects { second, toneDuration, symbol, type, label, bitValue }
     */
    encodeFrame(date, options = {}) {
        const summerTime = !!options.summerTime;
        const leapSecond = options.leapSecond || 0; // 0: None, 1: +1s, -1: -1s

        // JJY transmits time in JST (UTC+9)
        const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
        const jstDate = new Date(utc + (3600000 * this.timeZoneOffsetHours));

        const minute = jstDate.getMinutes();
        const hour = jstDate.getHours();
        const fullYear = jstDate.getFullYear();
        const year = fullYear % 100;
        const weekDay = jstDate.getDay(); // 0 = Sunday .. 6 = Saturday
        const dayOfYear = BaseEncoder.getDayOfYear(jstDate, false);

        const frame = new Array(60);

        // Helper to place marker
        const setMarker = (sec, name) => {
            frame[sec] = {
                second: sec,
                toneDuration: 0.2,
                symbol: 'M',
                type: 'marker',
                label: name,
                bitValue: null
            };
        };

        // Helper to place data bit
        const setBit = (sec, bitVal, label) => {
            const b = bitVal ? 1 : 0;
            frame[sec] = {
                second: sec,
                toneDuration: b === 1 ? 0.5 : 0.8,
                symbol: b === 1 ? '1' : '0',
                type: 'data',
                label: label,
                bitValue: b
            };
            return b;
        };

        // s00: Marker (M)
        setMarker(0, 'M (Frame Marker)');

        // s01 - s08: Minute BCD
        const minBits = BaseEncoder.toBCDBits(minute, [40, 20, 10, 8, 4, 2, 1]);
        const minWeights = [40, 20, 10, 8, 4, 2, 1];
        let pa2Sum = 0;
        for (let i = 0; i < 7; i++) {
            const b = minBits[i];
            pa2Sum += b;
            setBit(i + 1, b, `Min ${minWeights[i]}`);
        }
        // second 8 is Min 1 (s01..s08 = 8 bits total: 40,20,10, 0(unused/padding), 8,4,2,1)
        // Note standard JJY: bit 1=40, bit 2=20, bit 3=10, bit 4=0 (unused), bit 5=8, bit 6=4, bit 7=2, bit 8=1
        // Let's accurately set bits 1..8:
        const minBitsStandard = [
            Math.floor(minute / 10) >= 4 ? 1 : 0,
            (Math.floor(minute / 10) % 4) >= 2 ? 1 : 0,
            Math.floor(minute / 10) % 2,
            0, // bit 4 fixed to 0
            (minute % 10) >= 8 ? 1 : 0,
            ((minute % 10) % 8) >= 4 ? 1 : 0,
            ((minute % 10) % 4) >= 2 ? 1 : 0,
            (minute % 10) % 2
        ];
        pa2Sum = minBitsStandard.reduce((acc, v) => acc + v, 0);
        const minLabels = ['Min 40', 'Min 20', 'Min 10', 'Min 0', 'Min 8', 'Min 4', 'Min 2', 'Min 1'];
        for (let i = 0; i < 8; i++) {
            setBit(i + 1, minBitsStandard[i], minLabels[i]);
        }

        // s09: Position Marker 1 (P1)
        setMarker(9, 'P1');

        // s10 - s18: Hour BCD
        const hourBitsStandard = [
            0, 0, // bits 10, 11 unused (0)
            Math.floor(hour / 10) >= 2 ? 1 : 0,
            Math.floor(hour / 10) % 2,
            0, // bit 14 unused (0)
            (hour % 10) >= 8 ? 1 : 0,
            ((hour % 10) % 8) >= 4 ? 1 : 0,
            ((hour % 10) % 4) >= 2 ? 1 : 0,
            (hour % 10) % 2
        ];
        // Standard JJY hour: s10=0(unused), s11=0(unused), s12=20, s13=10, s14=0, s15=8, s16=4, s17=2, s18=1
        // But original web-jjy encodes: s10=80(0), s11=40(0), s12=20, s13=10, s14=16(0), s15=8, s16=4, s17=2, s18=1
        const hourLabels = ['Hour 0', 'Hour 0', 'Hour 20', 'Hour 10', 'Hour 0', 'Hour 8', 'Hour 4', 'Hour 2', 'Hour 1'];
        let pa1Sum = 0;
        for (let i = 0; i < 9; i++) {
            pa1Sum += hourBitsStandard[i];
            setBit(i + 10, hourBitsStandard[i], hourLabels[i]);
        }

        // s19: Position Marker 2 (P2)
        setMarker(19, 'P2');

        // s20 - s28: Day of Year (High & Middle BCD)
        const doyHundreds = Math.floor(dayOfYear / 100);
        const doyTens = Math.floor((dayOfYear % 100) / 10);
        const doyUnits = dayOfYear % 10;

        const doyHighMidBits = [
            0, 0, // s20=0, s21=0
            doyHundreds >= 2 ? 1 : 0,
            doyHundreds % 2,
            0, // s24=0
            doyTens >= 8 ? 1 : 0,
            (doyTens % 8) >= 4 ? 1 : 0,
            (doyTens % 4) >= 2 ? 1 : 0,
            doyTens % 2
        ];
        const doyHighMidLabels = ['DOY 0', 'DOY 0', 'DOY 200', 'DOY 100', 'DOY 0', 'DOY 80', 'DOY 40', 'DOY 20', 'DOY 10'];
        for (let i = 0; i < 9; i++) {
            setBit(i + 20, doyHighMidBits[i], doyHighMidLabels[i]);
        }

        // s29: Position Marker 3 (P3)
        setMarker(29, 'P3');

        // s30 - s33: Day of Year (Units BCD: 8, 4, 2, 1)
        setBit(30, doyUnits >= 8 ? 1 : 0, 'DOY 8');
        setBit(31, (doyUnits % 8) >= 4 ? 1 : 0, 'DOY 4');
        setBit(32, (doyUnits % 4) >= 2 ? 1 : 0, 'DOY 2');
        setBit(33, doyUnits % 2, 'DOY 1');

        // s34 - s35: Reserved (00)
        setBit(34, 0, 'Reserved (0)');
        setBit(35, 0, 'Reserved (0)');

        // s36 - s37: Parity (PA1 = Hour parity, PA2 = Minute parity)
        const pa1 = pa1Sum % 2;
        const pa2 = pa2Sum % 2;
        setBit(36, pa1, `PA1 Hour Parity (${pa1})`);
        setBit(37, pa2, `PA2 Min Parity (${pa2})`);

        // s38: SU1 (Summer time notice)
        setBit(38, 0, 'SU1 (Summer Time Notice)');

        // s39: Position Marker 4 (P4)
        setMarker(39, 'P4');

        // s40: SU2 (Summer time state)
        setBit(40, summerTime ? 1 : 0, `SU2 (Summer Time: ${summerTime ? 'ON' : 'OFF'})`);

        // s41 - s48: Year BCD (tens: 80,40,20,10, units: 8,4,2,1)
        const yearTens = Math.floor(year / 10);
        const yearUnits = year % 10;
        setBit(41, yearTens >= 8 ? 1 : 0, 'Year 80');
        setBit(42, (yearTens % 8) >= 4 ? 1 : 0, 'Year 40');
        setBit(43, (yearTens % 4) >= 2 ? 1 : 0, 'Year 20');
        setBit(44, yearTens % 2, 'Year 10');
        setBit(45, yearUnits >= 8 ? 1 : 0, 'Year 8');
        setBit(46, (yearUnits % 8) >= 4 ? 1 : 0, 'Year 4');
        setBit(47, (yearUnits % 4) >= 2 ? 1 : 0, 'Year 2');
        setBit(48, yearUnits % 2, 'Year 1');

        // s49: Position Marker 5 (P5)
        setMarker(49, 'P5');

        // s50 - s52: Day of Week (0..6 in 3-bit binary: 4, 2, 1)
        setBit(50, weekDay >= 4 ? 1 : 0, 'DoW 4');
        setBit(51, (weekDay % 4) >= 2 ? 1 : 0, 'DoW 2');
        setBit(52, weekDay % 2, 'DoW 1');

        // s53 - s54: Leap Second (LS1, LS2)
        if (leapSecond === 0) {
            setBit(53, 0, 'LS1 (No Leap Sec)');
            setBit(54, 0, 'LS2 (No Leap Sec)');
        } else if (leapSecond > 0) {
            setBit(53, 1, 'LS1 (+1s Leap Sec)');
            setBit(54, 1, 'LS2 (+1s Leap Sec)');
        } else {
            setBit(53, 1, 'LS1 (-1s Leap Sec)');
            setBit(54, 0, 'LS2 (-1s Leap Sec)');
        }

        // s55 - s58: Reserved (0000)
        setBit(55, 0, 'Reserved (0)');
        setBit(56, 0, 'Reserved (0)');
        setBit(57, 0, 'Reserved (0)');
        setBit(58, 0, 'Reserved (0)');

        // s59: Position Marker 0 (P0)
        setMarker(59, 'P0 (End Frame Marker)');

        return frame;
    }
}

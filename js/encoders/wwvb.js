/**
 * 9M2PJU WebTimeSignal - WWVB Encoder (USA / NIST Fort Collins, CO)
 * Frequency: 60 kHz (3rd harmonic of 20.000 kHz or 5th harmonic of 12.000 kHz)
 */

import { BaseEncoder } from './base-encoder.js';

export class WWVBEncoder {
    constructor() {
        this.name = 'WWVB 60 kHz (USA - NIST)';
        this.code = 'WWVB';
        this.targetRfKhz = 60;
        this.baseAudioFrequency = 20000;
        this.harmonicMultiplier = 3;
        this.timeZoneOffsetHours = 0; // WWVB broadcasts in UTC
    }

    /**
     * Encode a 60-second WWVB frame.
     * In WWVB audio simulation:
     * - Marker (M/P0-P5): 800 ms tone
     * - Binary 1: 500 ms tone
     * - Binary 0: 200 ms tone
     * @param {Date} date 
     * @param {Object} options 
     * @returns {Array<Object>}
     */
    encodeFrame(date, options = {}) {
        const dst = options.dst !== undefined ? options.dst : 0; // 0=STD, 1=DST
        const leapYear = BaseEncoder.isLeapYear(date.getUTCFullYear()) ? 1 : 0;
        const leapSecond = options.leapSecond ? 1 : 0;

        const minute = date.getUTCMinutes();
        const hour = date.getUTCHours();
        const year = date.getUTCFullYear() % 100;
        const dayOfYear = BaseEncoder.getDayOfYear(date, true);

        const frame = new Array(60);

        const setMarker = (sec, name) => {
            frame[sec] = {
                second: sec,
                toneDuration: 0.8,
                symbol: 'M',
                type: 'marker',
                label: name,
                bitValue: null
            };
        };

        const setBit = (sec, bitVal, label) => {
            const b = bitVal ? 1 : 0;
            frame[sec] = {
                second: sec,
                toneDuration: b === 1 ? 0.5 : 0.2,
                symbol: b === 1 ? '1' : '0',
                type: 'data',
                label: label,
                bitValue: b
            };
            return b;
        };

        // s00: Frame Reference Marker
        setMarker(0, 'M (Frame Marker)');

        // s01 - s08: Minute BCD
        const minTens = Math.floor(minute / 10);
        const minUnits = minute % 10;
        setBit(1, minTens >= 4 ? 1 : 0, 'Min 40');
        setBit(2, (minTens % 4) >= 2 ? 1 : 0, 'Min 20');
        setBit(3, minTens % 2, 'Min 10');
        setBit(4, 0, 'Unassigned (0)');
        setBit(5, minUnits >= 8 ? 1 : 0, 'Min 8');
        setBit(6, (minUnits % 8) >= 4 ? 1 : 0, 'Min 4');
        setBit(7, (minUnits % 4) >= 2 ? 1 : 0, 'Min 2');
        setBit(8, minUnits % 2, 'Min 1');

        // s09: Position Marker 1
        setMarker(9, 'P1');

        // s10 - s18: Hour BCD
        const hourTens = Math.floor(hour / 10);
        const hourUnits = hour % 10;
        setBit(10, 0, 'Unassigned (0)');
        setBit(11, 0, 'Unassigned (0)');
        setBit(12, hourTens >= 2 ? 1 : 0, 'Hour 20');
        setBit(13, hourTens % 2, 'Hour 10');
        setBit(14, 0, 'Unassigned (0)');
        setBit(15, hourUnits >= 8 ? 1 : 0, 'Hour 8');
        setBit(16, (hourUnits % 8) >= 4 ? 1 : 0, 'Hour 4');
        setBit(17, (hourUnits % 4) >= 2 ? 1 : 0, 'Hour 2');
        setBit(18, hourUnits % 2, 'Hour 1');

        // s19: Position Marker 2
        setMarker(19, 'P2');

        // s20 - s28: Day of Year High/Mid
        const doyHundreds = Math.floor(dayOfYear / 100);
        const doyTens = Math.floor((dayOfYear % 100) / 10);
        const doyUnits = dayOfYear % 10;
        setBit(20, 0, 'Unassigned (0)');
        setBit(21, 0, 'Unassigned (0)');
        setBit(22, doyHundreds >= 2 ? 1 : 0, 'DOY 200');
        setBit(23, doyHundreds % 2, 'DOY 100');
        setBit(24, 0, 'Unassigned (0)');
        setBit(25, doyTens >= 8 ? 1 : 0, 'DOY 80');
        setBit(26, (doyTens % 8) >= 4 ? 1 : 0, 'DOY 40');
        setBit(27, (doyTens % 4) >= 2 ? 1 : 0, 'DOY 20');
        setBit(28, doyTens % 2, 'DOY 10');

        // s29: Position Marker 3
        setMarker(29, 'P3');

        // s30 - s33: Day of Year Units
        setBit(30, doyUnits >= 8 ? 1 : 0, 'DOY 8');
        setBit(31, (doyUnits % 8) >= 4 ? 1 : 0, 'DOY 4');
        setBit(32, (doyUnits % 4) >= 2 ? 1 : 0, 'DOY 2');
        setBit(33, doyUnits % 2, 'DOY 1');

        // s34 - s35: Unassigned
        setBit(34, 0, 'Unassigned (0)');
        setBit(35, 0, 'Unassigned (0)');

        // s36 - s38: DUT1 Sign
        setBit(36, 0, 'DUT1 +');
        setBit(37, 0, 'DUT1 Sign');
        setBit(38, 0, 'DUT1 -');

        // s39: Position Marker 4
        setMarker(39, 'P4');

        // s40 - s43: DUT1 Magnitude
        setBit(40, 0, 'DUT1 0.8');
        setBit(41, 0, 'DUT1 0.4');
        setBit(42, 0, 'DUT1 0.2');
        setBit(43, 0, 'DUT1 0.1');

        // s44: Unassigned
        setBit(44, 0, 'Unassigned (0)');

        // s45 - s48: Year Tens
        const yearTens = Math.floor(year / 10);
        const yearUnits = year % 10;
        setBit(45, yearTens >= 8 ? 1 : 0, 'Year 80');
        setBit(46, (yearTens % 8) >= 4 ? 1 : 0, 'Year 40');
        setBit(47, (yearTens % 4) >= 2 ? 1 : 0, 'Year 20');
        setBit(48, yearTens % 2, 'Year 10');

        // s49: Position Marker 5
        setMarker(49, 'P5');

        // s50 - s53: Year Units
        setBit(50, yearUnits >= 8 ? 1 : 0, 'Year 8');
        setBit(51, (yearUnits % 8) >= 4 ? 1 : 0, 'Year 4');
        setBit(52, (yearUnits % 4) >= 2 ? 1 : 0, 'Year 2');
        setBit(53, yearUnits % 2, 'Year 1');

        // s54: Unassigned
        setBit(54, 0, 'Unassigned (0)');

        // s55: Leap Year indicator
        setBit(55, leapYear, `Leap Year (${leapYear})`);

        // s56: Leap Second indicator
        setBit(56, leapSecond, `Leap Sec (${leapSecond})`);

        // s57 - s58: DST flags (11 = DST active, 00 = STD active)
        setBit(57, dst ? 1 : 0, `DST Bit 1 (${dst ? 1 : 0})`);
        setBit(58, dst ? 1 : 0, `DST Bit 2 (${dst ? 1 : 0})`);

        // s59: Position Marker 0
        setMarker(59, 'P0 (End Frame Marker)');

        return frame;
    }
}

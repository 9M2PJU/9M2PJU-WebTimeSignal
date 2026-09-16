/**
 * 9M2PJU WebTimeSignal - MSF Encoder (UK / NPL Anthorn)
 * Frequency: 60 kHz (3rd harmonic of 20.000 kHz)
 */

import { BaseEncoder } from './base-encoder.js';

export class MSFEncoder {
    constructor() {
        this.name = 'MSF 60 kHz (UK / Anthorn)';
        this.code = 'MSF';
        this.targetRfKhz = 60;
        this.baseAudioFrequency = 20000;
        this.harmonicMultiplier = 3;
        this.timeZoneOffsetHours = 0; // UTC (or BST UTC+1)
    }

    /**
     * Encode a 60-second MSF frame.
     * @param {Date} date 
     * @param {Object} options 
     * @returns {Array<Object>}
     */
    encodeFrame(date, options = {}) {
        const summerTime = !!options.summerTime; // BST (UTC+1) vs GMT/UTC
        const offsetHours = summerTime ? 1 : 0;

        const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
        const ukDate = new Date(utc + (3600000 * offsetHours));

        const minute = ukDate.getMinutes();
        const hour = ukDate.getHours();
        const dayOfMonth = ukDate.getDate();
        const month = ukDate.getMonth() + 1;
        const year = ukDate.getFullYear() % 100;
        const rawDayOfWeek = ukDate.getDay(); // 0=Sun..6=Sat
        const dayOfWeek = rawDayOfWeek; // 0=Sun..6=Sat

        const frame = new Array(60);

        const setSymbol = (sec, duration, symbol, type, label, bitVal = null) => {
            frame[sec] = {
                second: sec,
                toneDuration: duration,
                symbol: symbol,
                type: type,
                label: label,
                bitValue: bitVal
            };
        };

        // s00: Minute Marker (500 ms)
        setSymbol(0, 0.5, 'M', 'marker', 'M (Minute Identifier)');

        // s01 - s16: DUT1 & special codes (default 100 ms)
        for (let i = 1; i <= 16; i++) {
            setSymbol(i, 0.1, '0', 'data', `DUT1 Bit ${i}`, 0);
        }

        // s17 - s24: Year BCD (80, 40, 20, 10, 8, 4, 2, 1)
        const yearBits = BaseEncoder.toBCDBits(year, [80, 40, 20, 10, 8, 4, 2, 1]);
        const yearWeights = [80, 40, 20, 10, 8, 4, 2, 1];
        for (let i = 0; i < 8; i++) {
            const b = yearBits[i];
            setSymbol(17 + i, b ? 0.2 : 0.1, b ? '1' : '0', 'data', `Year ${yearWeights[i]}`, b);
        }

        // s25 - s29: Month BCD (10, 8, 4, 2, 1)
        const monthBits = BaseEncoder.toBCDBits(month, [10, 8, 4, 2, 1]);
        const monthWeights = [10, 8, 4, 2, 1];
        for (let i = 0; i < 5; i++) {
            const b = monthBits[i];
            setSymbol(25 + i, b ? 0.2 : 0.1, b ? '1' : '0', 'data', `Month ${monthWeights[i]}`, b);
        }

        // s30 - s35: Day of Month BCD (20, 10, 8, 4, 2, 1)
        const domBits = BaseEncoder.toBCDBits(dayOfMonth, [20, 10, 8, 4, 2, 1]);
        const domWeights = [20, 10, 8, 4, 2, 1];
        for (let i = 0; i < 6; i++) {
            const b = domBits[i];
            setSymbol(30 + i, b ? 0.2 : 0.1, b ? '1' : '0', 'data', `DOM ${domWeights[i]}`, b);
        }

        // s36 - s38: Day of Week BCD (4, 2, 1)
        const dowBits = BaseEncoder.toBCDBits(dayOfWeek, [4, 2, 1]);
        const dowWeights = [4, 2, 1];
        for (let i = 0; i < 3; i++) {
            const b = dowBits[i];
            setSymbol(36 + i, b ? 0.2 : 0.1, b ? '1' : '0', 'data', `DOW ${dowWeights[i]}`, b);
        }

        // s39 - s44: Hour BCD (20, 10, 8, 4, 2, 1)
        const hourBits = BaseEncoder.toBCDBits(hour, [20, 10, 8, 4, 2, 1]);
        const hourWeights = [20, 10, 8, 4, 2, 1];
        for (let i = 0; i < 6; i++) {
            const b = hourBits[i];
            setSymbol(39 + i, b ? 0.2 : 0.1, b ? '1' : '0', 'data', `Hour ${hourWeights[i]}`, b);
        }

        // s45 - s51: Minute BCD (40, 20, 10, 8, 4, 2, 1)
        const minBits = BaseEncoder.toBCDBits(minute, [40, 20, 10, 8, 4, 2, 1]);
        const minWeights = [40, 20, 10, 8, 4, 2, 1];
        for (let i = 0; i < 7; i++) {
            const b = minBits[i];
            setSymbol(45 + i, b ? 0.2 : 0.1, b ? '1' : '0', 'data', `Min ${minWeights[i]}`, b);
        }

        // Parity bits (s52 - s58)
        const pYear = BaseEncoder.calcOddParity(yearBits);
        const pDate = BaseEncoder.calcOddParity([...monthBits, ...domBits]);
        const pDow = BaseEncoder.calcOddParity(dowBits);
        const pTime = BaseEncoder.calcOddParity([...hourBits, ...minBits]);

        setSymbol(52, 0.1, '0', 'data', 'Parity Bit 1', 0);
        setSymbol(53, pYear ? 0.2 : 0.1, pYear ? '1' : '0', 'data', `Year Parity (${pYear})`, pYear);
        setSymbol(54, pDate ? 0.2 : 0.1, pDate ? '1' : '0', 'data', `Date Parity (${pDate})`, pDate);
        setSymbol(55, pDow ? 0.2 : 0.1, pDow ? '1' : '0', 'data', `DOW Parity (${pDow})`, pDow);
        setSymbol(56, pTime ? 0.2 : 0.1, pTime ? '1' : '0', 'data', `Time Parity (${pTime})`, pTime);
        setSymbol(57, summerTime ? 0.2 : 0.1, summerTime ? '1' : '0', 'data', `BST Notice (${summerTime ? '1' : '0'})`, summerTime ? 1 : 0);
        setSymbol(58, 0.1, '0', 'data', 'BST Active (0)', 0);

        // s59: Second marker
        setSymbol(59, 0.1, 'P', 'marker', 'P (Second Marker)');

        return frame;
    }
}

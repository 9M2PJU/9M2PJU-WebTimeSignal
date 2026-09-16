/**
 * 9M2PJU WebTimeSignal - DCF77 Encoder (Germany / PTB Mainflingen)
 * Frequency: 77.5 kHz (5th harmonic of 15.500 kHz)
 */

import { BaseEncoder } from './base-encoder.js';

export class DCF77Encoder {
    constructor() {
        this.name = 'DCF77 77.5 kHz (Germany / Europe)';
        this.code = 'DCF77';
        this.targetRfKhz = 77.5;
        this.baseAudioFrequency = 15500;
        this.harmonicMultiplier = 5;
        this.timeZoneOffsetHours = 1; // CET is UTC+1 (or UTC+2 in summer)
    }

    /**
     * Encode a 60-second DCF77 frame.
     * @param {Date} date 
     * @param {Object} options 
     * @returns {Array<Object>}
     */
    encodeFrame(date, options = {}) {
        const summerTime = !!options.summerTime;
        const offsetHours = summerTime ? 2 : 1; // CEST (UTC+2) or CET (UTC+1)

        const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
        const cetDate = new Date(utc + (3600000 * offsetHours));

        const minute = cetDate.getMinutes();
        const hour = cetDate.getHours();
        const dayOfMonth = cetDate.getDate();
        const rawDayOfWeek = cetDate.getDay(); // 0=Sun, 1=Mon...
        const dayOfWeek = rawDayOfWeek === 0 ? 7 : rawDayOfWeek; // DCF77: 1=Mon..7=Sun
        const month = cetDate.getMonth() + 1; // 1..12
        const year = cetDate.getFullYear() % 100;

        const frame = new Array(60);

        const setBit = (sec, bitVal, label, isSyncMarker = false) => {
            if (isSyncMarker) {
                frame[sec] = {
                    second: sec,
                    toneDuration: 0.0, // Missing pulse in DCF77 indicates minute boundary
                    symbol: 'SYNC',
                    type: 'marker',
                    label: label,
                    bitValue: null
                };
                return 0;
            }

            const b = bitVal ? 1 : 0;
            frame[sec] = {
                second: sec,
                toneDuration: b === 1 ? 0.2 : 0.1, // 200 ms for 1, 100 ms for 0
                symbol: b === 1 ? '1' : '0',
                type: 'data',
                label: label,
                bitValue: b
            };
            return b;
        };

        // s00: Start of minute
        setBit(0, 0, 'Minute Start (0)');

        // s01 - s14: Weather / Civil info (0)
        for (let i = 1; i <= 14; i++) {
            setBit(i, 0, `Civil Data Bit ${i}`);
        }

        // s15: Call bit (R)
        setBit(15, 0, 'Call Bit (0)');

        // s16: Time change announcement (A1)
        setBit(16, 0, 'Time Change Notice (0)');

        // s17: Summer Time (Z1)
        setBit(17, summerTime ? 1 : 0, `CEST Summer Time (${summerTime ? '1' : '0'})`);

        // s18: Standard Time (Z2)
        setBit(18, summerTime ? 0 : 1, `CET Standard Time (${summerTime ? '0' : '1'})`);

        // s19: Leap second announcement (A2)
        setBit(19, 0, 'Leap Sec Notice (0)');

        // s20: Start of time information (S - Always 1!)
        setBit(20, 1, 'Time Info Start (1)');

        // s21 - s27: Minute BCD (Little Endian: 1, 2, 4, 8, 10, 20, 40)
        const minUnits = minute % 10;
        const minTens = Math.floor(minute / 10);
        const minBits = [
            minUnits % 2,
            Math.floor(minUnits / 2) % 2,
            Math.floor(minUnits / 4) % 2,
            Math.floor(minUnits / 8) % 2,
            minTens % 2,
            Math.floor(minTens / 2) % 2,
            Math.floor(minTens / 4) % 2
        ];
        const minLabels = ['Min 1', 'Min 2', 'Min 4', 'Min 8', 'Min 10', 'Min 20', 'Min 40'];
        for (let i = 0; i < 7; i++) {
            setBit(i + 21, minBits[i], minLabels[i]);
        }

        // s28: Minute Parity P1 (even)
        const p1 = BaseEncoder.calcEvenParity(minBits);
        setBit(28, p1, `P1 Min Parity (${p1})`);

        // s29 - s34: Hour BCD (Little Endian: 1, 2, 4, 8, 10, 20)
        const hourUnits = hour % 10;
        const hourTens = Math.floor(hour / 10);
        const hourBits = [
            hourUnits % 2,
            Math.floor(hourUnits / 2) % 2,
            Math.floor(hourUnits / 4) % 2,
            Math.floor(hourUnits / 8) % 2,
            hourTens % 2,
            Math.floor(hourTens / 2) % 2
        ];
        const hourLabels = ['Hour 1', 'Hour 2', 'Hour 4', 'Hour 8', 'Hour 10', 'Hour 20'];
        for (let i = 0; i < 6; i++) {
            setBit(i + 29, hourBits[i], hourLabels[i]);
        }

        // s35: Hour Parity P2 (even)
        const p2 = BaseEncoder.calcEvenParity(hourBits);
        setBit(35, p2, `P2 Hour Parity (${p2})`);

        // s36 - s41: Day of Month (1, 2, 4, 8, 10, 20)
        const domUnits = dayOfMonth % 10;
        const domTens = Math.floor(dayOfMonth / 10);
        const domBits = [
            domUnits % 2,
            Math.floor(domUnits / 2) % 2,
            Math.floor(domUnits / 4) % 2,
            Math.floor(domUnits / 8) % 2,
            domTens % 2,
            Math.floor(domTens / 2) % 2
        ];
        const domLabels = ['DOM 1', 'DOM 2', 'DOM 4', 'DOM 8', 'DOM 10', 'DOM 20'];
        for (let i = 0; i < 6; i++) {
            setBit(i + 36, domBits[i], domLabels[i]);
        }

        // s42 - s44: Day of Week (1, 2, 4)
        const dowBits = [
            dayOfWeek % 2,
            Math.floor(dayOfWeek / 2) % 2,
            Math.floor(dayOfWeek / 4) % 2
        ];
        const dowLabels = ['DOW 1', 'DOW 2', 'DOW 4'];
        for (let i = 0; i < 3; i++) {
            setBit(i + 42, dowBits[i], dowLabels[i]);
        }

        // s45 - s49: Month (1, 2, 4, 8, 10)
        const monthUnits = month % 10;
        const monthTens = Math.floor(month / 10);
        const monthBits = [
            monthUnits % 2,
            Math.floor(monthUnits / 2) % 2,
            Math.floor(monthUnits / 4) % 2,
            Math.floor(monthUnits / 8) % 2,
            monthTens % 2
        ];
        const monthLabels = ['Month 1', 'Month 2', 'Month 4', 'Month 8', 'Month 10'];
        for (let i = 0; i < 5; i++) {
            setBit(i + 45, monthBits[i], monthLabels[i]);
        }

        // s50 - s57: Year within century (1, 2, 4, 8, 10, 20, 40, 80)
        const yearUnits = year % 10;
        const yearTens = Math.floor(year / 10);
        const yearBits = [
            yearUnits % 2,
            Math.floor(yearUnits / 2) % 2,
            Math.floor(yearUnits / 4) % 2,
            Math.floor(yearUnits / 8) % 2,
            yearTens % 2,
            Math.floor(yearTens / 2) % 2,
            Math.floor(yearTens / 4) % 2,
            Math.floor(yearTens / 8) % 2
        ];
        const yearLabels = ['Year 1', 'Year 2', 'Year 4', 'Year 8', 'Year 10', 'Year 20', 'Year 40', 'Year 80'];
        for (let i = 0; i < 8; i++) {
            setBit(i + 50, yearBits[i], yearLabels[i]);
        }

        // s58: Date Parity P3 (even over bits 36..57)
        const dateBits = [...domBits, ...dowBits, ...monthBits, ...yearBits];
        const p3 = BaseEncoder.calcEvenParity(dateBits);
        setBit(58, p3, `P3 Date Parity (${p3})`);

        // s59: Missing pulse (Minute Sync Marker)
        setBit(59, 0, 'Minute Sync (No Modulation)', true);

        return frame;
    }
}

/**
 * 9M2PJU WebTimeSignal - BPC Encoder (China / Shangqiu, Henan)
 * Frequency: 68.5 kHz (5th harmonic of 13.700 kHz)
 */

export class BPCEncoder {
    constructor() {
        this.name = 'BPC 68.5 kHz (China / Shangqiu)';
        this.code = 'BPC';
        this.targetRfKhz = 68.5;
        this.baseAudioFrequency = 13700;
        this.harmonicMultiplier = 5;
        this.timeZoneOffsetHours = 8; // CST is UTC+8
    }

    /**
     * Encode a 60-second BPC frame composed of three 20-second sub-frames.
     * @param {Date} date 
     * @param {Object} options 
     * @returns {Array<Object>}
     */
    encodeFrame(date, options = {}) {
        const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
        const cstDate = new Date(utc + (3600000 * this.timeZoneOffsetHours));

        const minute = cstDate.getMinutes();
        const hour = cstDate.getHours();
        const dayOfMonth = cstDate.getDate();
        const month = cstDate.getMonth() + 1;
        const year = cstDate.getFullYear() % 100;
        const rawDayOfWeek = cstDate.getDay();
        const dayOfWeek = rawDayOfWeek === 0 ? 7 : rawDayOfWeek;

        const frame = new Array(60);

        // BPC 4-state pulse width coding:
        // 00 -> 0.1s, 01 -> 0.2s, 10 -> 0.3s, 11 -> 0.4s
        const getPulseFor2Bits = (val) => {
            switch (val & 0x03) {
                case 0: return 0.1;
                case 1: return 0.2;
                case 2: return 0.3;
                case 3: return 0.4;
                default: return 0.1;
            }
        };

        // Construct 20-second sub-frame
        const buildSubFrame = (startSec, subFrameIndex) => {
            frame[startSec] = {
                second: startSec,
                toneDuration: 0.1,
                symbol: 'S',
                type: 'marker',
                label: `Frame ${subFrameIndex + 1} Start`,
                bitValue: null
            };

            // Second marker (00s, 20s, 40s)
            frame[startSec + 1] = {
                second: startSec + 1,
                toneDuration: getPulseFor2Bits(subFrameIndex),
                symbol: `${subFrameIndex}`,
                type: 'data',
                label: `Subframe Marker (${subFrameIndex * 20}s)`,
                bitValue: subFrameIndex
            };

            // Hour
            frame[startSec + 2] = {
                second: startSec + 2,
                toneDuration: getPulseFor2Bits(Math.floor(hour / 4)),
                symbol: 'H1',
                type: 'data',
                label: `Hour High (${hour})`,
                bitValue: Math.floor(hour / 4)
            };
            frame[startSec + 3] = {
                second: startSec + 3,
                toneDuration: getPulseFor2Bits(hour % 4),
                symbol: 'H0',
                type: 'data',
                label: `Hour Low (${hour})`,
                bitValue: hour % 4
            };

            // Minute
            frame[startSec + 4] = {
                second: startSec + 4,
                toneDuration: getPulseFor2Bits(Math.floor(minute / 16)),
                symbol: 'M2',
                type: 'data',
                label: `Min High (${minute})`,
                bitValue: Math.floor(minute / 16)
            };
            frame[startSec + 5] = {
                second: startSec + 5,
                toneDuration: getPulseFor2Bits(Math.floor((minute % 16) / 4)),
                symbol: 'M1',
                type: 'data',
                label: `Min Mid (${minute})`,
                bitValue: Math.floor((minute % 16) / 4)
            };
            frame[startSec + 6] = {
                second: startSec + 6,
                toneDuration: getPulseFor2Bits(minute % 4),
                symbol: 'M0',
                type: 'data',
                label: `Min Low (${minute})`,
                bitValue: minute % 4
            };

            // Day of Week
            frame[startSec + 7] = {
                second: startSec + 7,
                toneDuration: getPulseFor2Bits(dayOfWeek),
                symbol: 'DOW',
                type: 'data',
                label: `DOW (${dayOfWeek})`,
                bitValue: dayOfWeek
            };

            // Day of Month
            frame[startSec + 8] = {
                second: startSec + 8,
                toneDuration: getPulseFor2Bits(Math.floor(dayOfMonth / 4)),
                symbol: 'DOM1',
                type: 'data',
                label: `DOM High (${dayOfMonth})`,
                bitValue: Math.floor(dayOfMonth / 4)
            };
            frame[startSec + 9] = {
                second: startSec + 9,
                toneDuration: getPulseFor2Bits(dayOfMonth % 4),
                symbol: 'DOM0',
                type: 'data',
                label: `DOM Low (${dayOfMonth})`,
                bitValue: dayOfMonth % 4
            };

            // Month
            frame[startSec + 10] = {
                second: startSec + 10,
                toneDuration: getPulseFor2Bits(Math.floor(month / 4)),
                symbol: 'MO1',
                type: 'data',
                label: `Month High (${month})`,
                bitValue: Math.floor(month / 4)
            };
            frame[startSec + 11] = {
                second: startSec + 11,
                toneDuration: getPulseFor2Bits(month % 4),
                symbol: 'MO0',
                type: 'data',
                label: `Month Low (${month})`,
                bitValue: month % 4
            };

            // Year
            frame[startSec + 12] = {
                second: startSec + 12,
                toneDuration: getPulseFor2Bits(Math.floor(year / 16)),
                symbol: 'Y2',
                type: 'data',
                label: `Year High (${year})`,
                bitValue: Math.floor(year / 16)
            };
            frame[startSec + 13] = {
                second: startSec + 13,
                toneDuration: getPulseFor2Bits(Math.floor((year % 16) / 4)),
                symbol: 'Y1',
                type: 'data',
                label: `Year Mid (${year})`,
                bitValue: Math.floor((year % 16) / 4)
            };
            frame[startSec + 14] = {
                second: startSec + 14,
                toneDuration: getPulseFor2Bits(year % 4),
                symbol: 'Y0',
                type: 'data',
                label: `Year Low (${year})`,
                bitValue: year % 4
            };

            // Parity & Reserved
            for (let i = 15; i <= 18; i++) {
                frame[startSec + i] = {
                    second: startSec + i,
                    toneDuration: 0.1,
                    symbol: 'P',
                    type: 'data',
                    label: `Parity/Reserve ${i}`,
                    bitValue: 0
                };
            }

            // End Marker
            frame[startSec + 19] = {
                second: startSec + 19,
                toneDuration: 0.1,
                symbol: 'E',
                type: 'marker',
                label: `Subframe End`,
                bitValue: null
            };
        };

        buildSubFrame(0, 0);
        buildSubFrame(20, 1);
        buildSubFrame(40, 2);

        return frame;
    }
}

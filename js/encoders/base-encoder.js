/**
 * 9M2PJU WebTimeSignal - Base Encoder Utilities
 * Common time conversion, BCD encoding, and parity functions.
 */

export class BaseEncoder {
    /**
     * Check if a given year is a leap year.
     * @param {number} year 
     * @returns {boolean}
     */
    static isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    }

    /**
     * Get 1-based Day of Year (1..366) safely in UTC/local timezone.
     * @param {Date} date 
     * @param {boolean} [useUTC=false]
     * @returns {number} 1-based day of year (Jan 1 = 1)
     */
    static getDayOfYear(date, useUTC = false) {
        const year = useUTC ? date.getUTCFullYear() : date.getFullYear();
        const month = useUTC ? date.getUTCMonth() : date.getMonth();
        const day = useUTC ? date.getUTCDate() : date.getDate();

        const start = Date.UTC(year, 0, 1);
        const current = Date.UTC(year, month, day);
        return Math.floor((current - start) / (86400 * 1000)) + 1;
    }

    /**
     * Calculate even parity across an array of binary bits (0 or 1).
     * Returns 0 if count of 1s is even, 1 if odd (so total 1s including parity is even).
     * @param {number[]} bits 
     * @returns {number}
     */
    static calcEvenParity(bits) {
        const ones = bits.reduce((sum, b) => sum + (b ? 1 : 0), 0);
        return ones % 2;
    }

    /**
     * Calculate odd parity across an array of binary bits (0 or 1).
     * @param {number[]} bits 
     * @returns {number}
     */
    static calcOddParity(bits) {
        return this.calcEvenParity(bits) === 0 ? 1 : 0;
    }

    /**
     * Convert an integer to weighted BCD bits according to the provided weight array.
     * @param {number} value Integer value to convert
     * @param {number[]} weights Array of descending bit weights (e.g. [40, 20, 10, 8, 4, 2, 1])
     * @returns {number[]} Array of 0s and 1s matching the weights length
     */
    static toBCDBits(value, weights) {
        let remainder = value;
        const bits = [];
        for (const w of weights) {
            if (remainder >= w) {
                bits.push(1);
                remainder -= w;
            } else {
                bits.push(0);
            }
        }
        return bits;
    }
}

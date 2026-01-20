import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getUserTimezone,
  DEFAULT_TIMEZONE,
  normalizeYMD,
  formatYMD,
  toYMD,
  getTodayYMD,
  parseLocalDate,
  formatShortDate,
  formatInTimezone
} from '../timezone';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Timezone Utilities', () => {
  beforeEach(() => {
    // Clear localStorage mock before each test
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('DEFAULT_TIMEZONE', () => {
    it('should be America/Toronto', () => {
      expect(DEFAULT_TIMEZONE).toBe('America/Toronto');
    });
  });

  describe('getUserTimezone', () => {
    it('returns America/Toronto by default when no timezone is set', () => {
      expect(getUserTimezone()).toBe('America/Toronto');
    });

    it('returns the user-set timezone from localStorage', () => {
      localStorage.setItem('user_timezone', 'America/New_York');
      expect(getUserTimezone()).toBe('America/New_York');
    });

    it('returns America/Toronto when localStorage value is empty', () => {
      localStorage.setItem('user_timezone', '');
      expect(getUserTimezone()).toBe('America/Toronto');
    });
  });

  describe('normalizeYMD', () => {
    it('extracts YYYY-MM-DD from ISO string with time', () => {
      expect(normalizeYMD('2025-12-29T00:00:00.000Z')).toBe('2025-12-29');
    });

    it('returns YYYY-MM-DD as-is', () => {
      expect(normalizeYMD('2025-12-29')).toBe('2025-12-29');
    });

    it('returns empty string for null', () => {
      expect(normalizeYMD(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(normalizeYMD(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(normalizeYMD('')).toBe('');
    });

    it('handles Date object input', () => {
      const date = new Date(2025, 11, 29); // Dec 29, 2025
      const result = normalizeYMD(date);
      expect(result).toBe('2025-12-29');
    });

    it('returns empty string for invalid string input', () => {
      expect(normalizeYMD('not-a-date')).toBe('');
    });
  });

  describe('formatYMD', () => {
    it('formats YYYY-MM-DD to MMM dd, yyyy by default', () => {
      expect(formatYMD('2025-12-29')).toBe('Dec 29, 2025');
    });

    it('correctly formats Dec 29 as Dec 29 (not Dec 28 due to timezone bug)', () => {
      // This is the key test - ensuring we don't get the off-by-one bug
      expect(formatYMD('2025-12-29')).toBe('Dec 29, 2025');
    });

    it('correctly formats Jan 11 as Jan 11 (not Jan 10)', () => {
      expect(formatYMD('2026-01-11')).toBe('Jan 11, 2026');
    });

    it('accepts custom format string', () => {
      expect(formatYMD('2025-12-29', 'yyyy-MM-dd')).toBe('2025-12-29');
    });

    it('returns empty string for null', () => {
      expect(formatYMD(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(formatYMD(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(formatYMD('')).toBe('');
    });

    it('returns empty string for invalid date string', () => {
      expect(formatYMD('invalid')).toBe('');
    });

    it('handles dates with ISO suffix correctly', () => {
      // Even if somehow a full ISO string is passed, extract YYYY-MM-DD part
      const result = formatYMD('2025-12-29T00:00:00.000Z');
      expect(result).toBe('Dec 29, 2025');
    });
  });

  describe('toYMD', () => {
    it('converts a Date object to YYYY-MM-DD string', () => {
      const date = new Date(2025, 11, 29, 12, 0, 0); // Dec 29, 2025 at noon
      expect(toYMD(date)).toBe('2025-12-29');
    });

    it('returns empty string for null', () => {
      expect(toYMD(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(toYMD(undefined)).toBe('');
    });

    it('returns empty string for invalid Date', () => {
      expect(toYMD(new Date('invalid'))).toBe('');
    });

    it('handles non-Date objects', () => {
      expect(toYMD('not a date')).toBe('');
    });

    it('correctly formats Dec 29 as 2025-12-29 (not 2025-12-28)', () => {
      // Create a date at 11 PM local time - should still be Dec 29
      const date = new Date(2025, 11, 29, 23, 0, 0);
      expect(toYMD(date)).toBe('2025-12-29');
    });

    it('correctly formats dates at midnight', () => {
      const date = new Date(2025, 11, 29, 0, 0, 0);
      expect(toYMD(date)).toBe('2025-12-29');
    });
  });

  describe('getTodayYMD', () => {
    it('returns today\'s date as YYYY-MM-DD', () => {
      const result = getTodayYMD();
      // Should match the format YYYY-MM-DD
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // Should be today's date
      const today = new Date();
      const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      expect(result).toBe(expected);
    });
  });

  describe('parseLocalDate', () => {
    it('parses YYYY-MM-DD string correctly', () => {
      const result = parseLocalDate('2025-12-29');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(11); // December is month 11
      expect(result.getDate()).toBe(29);
    });

    it('parses MM/DD/YYYY string correctly', () => {
      const result = parseLocalDate('12/29/2025');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(11);
      expect(result.getDate()).toBe(29);
    });

    it('returns null for null input', () => {
      expect(parseLocalDate(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(parseLocalDate(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseLocalDate('')).toBeNull();
    });

    it('handles Date object input', () => {
      const inputDate = new Date(2025, 11, 29, 15, 30, 0); // Dec 29, 2025 3:30 PM
      const result = parseLocalDate(inputDate);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(11);
      expect(result.getDate()).toBe(29);
      // Time should be midnight (stripped)
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    it('does not shift dates due to UTC interpretation', () => {
      // This is crucial - "2025-12-29" should become Dec 29, not Dec 28
      const result = parseLocalDate('2025-12-29');
      expect(result.getDate()).toBe(29);
      expect(result.getMonth()).toBe(11);
    });
  });

  describe('formatShortDate', () => {
    it('formats Date object to MMM dd, yyyy', () => {
      const date = new Date(2025, 11, 29);
      expect(formatShortDate(date)).toBe('Dec 29, 2025');
    });

    it('formats YYYY-MM-DD string correctly', () => {
      expect(formatShortDate('2025-12-29')).toBe('Dec 29, 2025');
    });

    it('returns empty string for null', () => {
      expect(formatShortDate(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(formatShortDate(undefined)).toBe('');
    });
  });

  describe('Round-trip stability', () => {
    it('YYYY-MM-DD -> parseLocalDate -> toYMD remains stable', () => {
      const original = '2025-12-29';
      const parsed = parseLocalDate(original);
      const result = toYMD(parsed);
      expect(result).toBe(original);
    });

    it('Date -> toYMD -> parseLocalDate -> toYMD remains stable', () => {
      const original = new Date(2025, 11, 29, 14, 30, 0);
      const ymd1 = toYMD(original);
      const parsed = parseLocalDate(ymd1);
      const ymd2 = toYMD(parsed);
      expect(ymd2).toBe(ymd1);
    });

    it('formatYMD and normalizeYMD are consistent', () => {
      const isoString = '2025-12-29T00:00:00.000Z';
      const normalized = normalizeYMD(isoString);
      expect(normalized).toBe('2025-12-29');
      expect(formatYMD(normalized)).toBe('Dec 29, 2025');
    });
  });

  describe('Edge cases', () => {
    it('handles leap year date Feb 29', () => {
      const result = formatYMD('2024-02-29');
      expect(result).toBe('Feb 29, 2024');
    });

    it('handles end of month dates correctly', () => {
      expect(formatYMD('2025-01-31')).toBe('Jan 31, 2025');
      expect(formatYMD('2025-03-31')).toBe('Mar 31, 2025');
    });

    it('handles year boundaries correctly', () => {
      expect(formatYMD('2025-12-31')).toBe('Dec 31, 2025');
      expect(formatYMD('2026-01-01')).toBe('Jan 01, 2026');
    });
  });
});

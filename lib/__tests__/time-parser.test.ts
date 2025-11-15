import { describe, it, expect } from 'vitest'
import { parseTimeToSeconds, formatSecondsToTime } from '../utils/time-parser'

describe('Time Parser Utilities', () => {
  describe('parseTimeToSeconds', () => {
    it('should parse HH:MM:SS format', () => {
      expect(parseTimeToSeconds('01:30:45')).toBe(5445) // 1*3600 + 30*60 + 45
      expect(parseTimeToSeconds('00:00:00')).toBe(0)
      expect(parseTimeToSeconds('02:15:30')).toBe(8130)
    })

    it('should parse MM:SS format', () => {
      expect(parseTimeToSeconds('05:30')).toBe(330) // 5*60 + 30
      expect(parseTimeToSeconds('00:00')).toBe(0)
      expect(parseTimeToSeconds('59:59')).toBe(3599)
    })

    it('should parse SS format', () => {
      expect(parseTimeToSeconds('45')).toBe(45)
      expect(parseTimeToSeconds('0')).toBe(0)
      expect(parseTimeToSeconds('120')).toBe(120)
    })

    it('should handle empty string', () => {
      expect(parseTimeToSeconds('')).toBe(0)
    })

    it('should handle invalid formats', () => {
      const result = parseTimeToSeconds('invalid')
      // Function returns NaN for invalid input, which is expected behavior
      expect(isNaN(result) || result === 0).toBe(true)
    })

    it('should handle typical poker stream timestamps', () => {
      expect(parseTimeToSeconds('00:26:37')).toBe(1597) // 26*60 + 37
      expect(parseTimeToSeconds('1:15:30')).toBe(4530) // 1*3600 + 15*60 + 30
      expect(parseTimeToSeconds('2:30:00')).toBe(9000) // 2*3600 + 30*60
    })
  })

  describe('formatSecondsToTime', () => {
    it('should format to HH:MM:SS when hours > 0', () => {
      expect(formatSecondsToTime(3661)).toBe('01:01:01')
      expect(formatSecondsToTime(7200)).toBe('02:00:00')
      expect(formatSecondsToTime(5445)).toBe('01:30:45')
    })

    it('should format to MM:SS when hours = 0', () => {
      expect(formatSecondsToTime(330)).toBe('05:30')
      expect(formatSecondsToTime(0)).toBe('00:00')
      expect(formatSecondsToTime(3599)).toBe('59:59')
    })

    it('should pad with zeros', () => {
      expect(formatSecondsToTime(5)).toBe('00:05')
      expect(formatSecondsToTime(65)).toBe('01:05')
      expect(formatSecondsToTime(3605)).toBe('01:00:05')
    })

    it('should handle large values', () => {
      expect(formatSecondsToTime(86400)).toBe('24:00:00') // 24 hours
      expect(formatSecondsToTime(359999)).toBe('99:59:59')
    })

    it('should be reversible with parseTimeToSeconds', () => {
      const testCases = [0, 30, 330, 3661, 7200, 12345]

      testCases.forEach((seconds) => {
        const timeString = formatSecondsToTime(seconds)
        const parsed = parseTimeToSeconds(timeString)
        expect(parsed).toBe(seconds)
      })
    })
  })

  describe('Round-trip conversion', () => {
    it('should maintain consistency in round-trip conversions', () => {
      const timeStrings = [
        '00:00:00',
        '00:10:30',
        '01:00:00',
        '02:15:45',
        '10:30',
        '59:59',
      ]

      timeStrings.forEach((timeString) => {
        const seconds = parseTimeToSeconds(timeString)
        const formatted = formatSecondsToTime(seconds)
        const reParsed = parseTimeToSeconds(formatted)
        expect(reParsed).toBe(seconds)
      })
    })
  })
})

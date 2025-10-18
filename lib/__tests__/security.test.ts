import { describe, it, expect } from 'vitest'
import {
  detectSQLInjection,
  escapeLikePattern,
  sanitizeSearchQuery,
  isValidUUID,
  isValidDateFormat,
  isValidInteger,
} from '../security/sql-sanitizer'
import {
  escapeHtml,
  detectDangerousHtml,
  isSafeUrl,
  sanitizeText,
  sanitizeFilename,
} from '../security/xss-sanitizer'

describe('SQL Security Utilities', () => {
  describe('detectSQLInjection', () => {
    it('should detect SQL injection attempts', () => {
      expect(detectSQLInjection('DROP TABLE users')).toBe(true)
      expect(detectSQLInjection('UNION SELECT password')).toBe(true)
      expect(detectSQLInjection("'; DELETE FROM users--")).toBe(true)
      expect(detectSQLInjection('UPDATE users SET password')).toBe(true)
    })

    it('should allow safe queries', () => {
      expect(detectSQLInjection('normal search query')).toBe(false)
      expect(detectSQLInjection('user@example.com')).toBe(false)
      expect(detectSQLInjection('John Doe')).toBe(false)
    })
  })

  describe('escapeLikePattern', () => {
    it('should escape LIKE special characters', () => {
      expect(escapeLikePattern('test%')).toBe('test\\%')
      expect(escapeLikePattern('test_value')).toBe('test\\_value')
      expect(escapeLikePattern('test\\escape')).toBe('test\\\\escape')
    })

    it('should not modify safe strings', () => {
      expect(escapeLikePattern('safe string')).toBe('safe string')
      expect(escapeLikePattern('hello123')).toBe('hello123')
    })
  })

  describe('sanitizeSearchQuery', () => {
    it('should sanitize safe queries', () => {
      const result = sanitizeSearchQuery('poker hand')
      expect(result.safe).toBe(true)
      expect(result.sanitized).toBe('poker hand')
      expect(result.warnings).toHaveLength(0)
    })

    it('should reject SQL injection attempts', () => {
      const result = sanitizeSearchQuery('DROP TABLE users')
      expect(result.safe).toBe(false)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should trim whitespace', () => {
      const result = sanitizeSearchQuery('  test  ')
      expect(result.sanitized).toBe('test')
    })

    it('should limit length to 200 characters', () => {
      const longQuery = 'a'.repeat(300)
      const result = sanitizeSearchQuery(longQuery)
      expect(result.sanitized.length).toBeLessThanOrEqual(200)
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      expect(isValidUUID('123e4567-e89b-42d3-a456-426614174000')).toBe(true)
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    })

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false)
      expect(isValidUUID('12345')).toBe(false)
      expect(isValidUUID('')).toBe(false)
    })
  })

  describe('isValidDateFormat', () => {
    it('should validate correct dates', () => {
      expect(isValidDateFormat('2024-01-15')).toBe(true)
      expect(isValidDateFormat('2025-12-31')).toBe(true)
    })

    it('should reject invalid dates', () => {
      expect(isValidDateFormat('2024-13-01')).toBe(false)
      expect(isValidDateFormat('2024-01-32')).toBe(false)
      expect(isValidDateFormat('not-a-date')).toBe(false)
      expect(isValidDateFormat('01/15/2024')).toBe(false)
    })
  })

  describe('isValidInteger', () => {
    it('should validate integers', () => {
      expect(isValidInteger(42, 0, 100)).toBe(true)
      expect(isValidInteger(0)).toBe(true)
      expect(isValidInteger(-5, -10, 0)).toBe(true)
    })

    it('should reject non-integers', () => {
      expect(isValidInteger(3.14)).toBe(false)
      expect(isValidInteger('42')).toBe(false)
      expect(isValidInteger(null)).toBe(false)
    })

    it('should validate range', () => {
      expect(isValidInteger(150, 0, 100)).toBe(false)
      expect(isValidInteger(-5, 0, 100)).toBe(false)
    })
  })
})

describe('XSS Security Utilities', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      )
      expect(escapeHtml('A & B')).toBe('A &amp; B')
      expect(escapeHtml("It's dangerous")).toBe('It&#039;s dangerous')
    })

    it('should not modify safe text', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World')
      expect(escapeHtml('123 456')).toBe('123 456')
    })
  })

  describe('detectDangerousHtml', () => {
    it('should detect dangerous HTML tags', () => {
      expect(detectDangerousHtml('<script>alert(1)</script>')).toBe(true)
      expect(detectDangerousHtml('<iframe src="evil.com"></iframe>')).toBe(true)
      expect(detectDangerousHtml('<img onerror="alert(1)">')).toBe(true)
      expect(detectDangerousHtml('javascript:alert(1)')).toBe(true)
    })

    it('should allow safe HTML', () => {
      expect(detectDangerousHtml('<p>Hello</p>')).toBe(false)
      expect(detectDangerousHtml('<div>Content</div>')).toBe(false)
      expect(detectDangerousHtml('Plain text')).toBe(false)
    })
  })

  describe('isSafeUrl', () => {
    it('should allow safe URLs', () => {
      expect(isSafeUrl('https://example.com')).toBe(true)
      expect(isSafeUrl('http://example.com/path')).toBe(true)
    })

    it('should reject dangerous URLs', () => {
      expect(isSafeUrl('javascript:alert(1)')).toBe(false)
      expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
      expect(isSafeUrl('file:///etc/passwd')).toBe(false)
    })

    it('should reject invalid URLs', () => {
      expect(isSafeUrl('not a url')).toBe(false)
      expect(isSafeUrl('')).toBe(false)
    })
  })

  describe('sanitizeText', () => {
    it('should escape and trim text', () => {
      const result = sanitizeText('  <b>Hello</b>  ')
      expect(result).toBe('&lt;b&gt;Hello&lt;/b&gt;')
    })

    it('should limit length', () => {
      const longText = 'a'.repeat(2000)
      const result = sanitizeText(longText, 100)
      expect(result.length).toBeLessThanOrEqual(100)
    })

    it('should normalize whitespace', () => {
      const result = sanitizeText('Hello    World')
      expect(result).toBe('Hello World')
    })
  })

  describe('sanitizeFilename', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeFilename('../../../etc/passwd')).not.toContain('..')
      expect(sanitizeFilename('file<>:"|?*name')).not.toContain('<')
      expect(sanitizeFilename('test/file.txt')).not.toContain('/')
    })

    it('should limit length to 255 characters', () => {
      const longName = 'a'.repeat(300) + '.txt'
      const result = sanitizeFilename(longName)
      expect(result.length).toBeLessThanOrEqual(255)
    })

    it('should preserve safe filenames', () => {
      expect(sanitizeFilename('document.pdf')).toBe('document.pdf')
      expect(sanitizeFilename('my-file_123.txt')).toBe('my-file_123.txt')
    })
  })
})

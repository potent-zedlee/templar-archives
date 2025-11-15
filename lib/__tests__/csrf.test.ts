import { describe, it, expect, vi } from 'vitest'
import {
  generateCSRFToken,
  hashCSRFToken,
  verifyCSRF,
  generateDoubleSubmitToken,
  verifyDoubleSubmitToken,
  SECURE_COOKIE_OPTIONS,
} from '../security/csrf'
import { NextRequest } from 'next/server'

describe('CSRF Security', () => {
  describe('generateCSRFToken', () => {
    it('should generate a 64-character hex token', () => {
      const token = generateCSRFToken()
      expect(token).toHaveLength(64)
      expect(/^[0-9a-f]{64}$/.test(token)).toBe(true)
    })

    it('should generate unique tokens', () => {
      const token1 = generateCSRFToken()
      const token2 = generateCSRFToken()
      expect(token1).not.toBe(token2)
    })
  })

  describe('hashCSRFToken', () => {
    it('should generate a consistent hash', () => {
      const token = 'test-token'
      const hash1 = hashCSRFToken(token)
      const hash2 = hashCSRFToken(token)
      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different tokens', () => {
      const hash1 = hashCSRFToken('token1')
      const hash2 = hashCSRFToken('token2')
      expect(hash1).not.toBe(hash2)
    })

    it('should generate a 64-character hex hash', () => {
      const hash = hashCSRFToken('test')
      expect(hash).toHaveLength(64)
      expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true)
    })
  })

  describe('generateDoubleSubmitToken', () => {
    it('should generate token and cookieValue', () => {
      const { token, cookieValue } = generateDoubleSubmitToken()
      expect(token).toBeDefined()
      expect(cookieValue).toBeDefined()
      expect(token).toHaveLength(64)
      expect(cookieValue).toHaveLength(64)
    })

    it('should generate hashed cookieValue', () => {
      const { token, cookieValue } = generateDoubleSubmitToken()
      const expectedHash = hashCSRFToken(token)
      expect(cookieValue).toBe(expectedHash)
    })
  })

  describe('verifyDoubleSubmitToken', () => {
    it('should verify matching tokens', () => {
      const { token, cookieValue } = generateDoubleSubmitToken()
      expect(verifyDoubleSubmitToken(token, cookieValue)).toBe(true)
    })

    it('should reject mismatched tokens', () => {
      const { token } = generateDoubleSubmitToken()
      const wrongCookieValue = hashCSRFToken('different-token')
      expect(verifyDoubleSubmitToken(token, wrongCookieValue)).toBe(false)
    })

    it('should reject null headerToken', () => {
      expect(verifyDoubleSubmitToken(null, 'cookie')).toBe(false)
    })

    it('should reject null cookieToken', () => {
      expect(verifyDoubleSubmitToken('token', null)).toBe(false)
    })

    it('should reject both null', () => {
      expect(verifyDoubleSubmitToken(null, null)).toBe(false)
    })
  })

  describe('verifyCSRF', () => {
    it('should allow GET requests without CSRF token', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'GET',
      })

      const result = await verifyCSRF(request)
      expect(result).toBeNull()
    })

    it('should allow HEAD requests without CSRF token', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'HEAD',
      })

      const result = await verifyCSRF(request)
      expect(result).toBeNull()
    })

    it('should allow OPTIONS requests without CSRF token', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'OPTIONS',
      })

      const result = await verifyCSRF(request)
      expect(result).toBeNull()
    })

    it('should verify origin matches host for POST requests', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          origin: 'https://example.com',
          host: 'example.com',
        },
      })

      const result = await verifyCSRF(request)
      // In development, should pass without token
      expect(result).toBeNull()
    })

    it('should reject POST with mismatched origin', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          origin: 'https://evil.com',
          host: 'example.com',
        },
      })

      const result = await verifyCSRF(request)
      expect(result).not.toBeNull()
      expect(result?.status).toBe(403)
    })

    it('should verify referer when origin is not present', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          referer: 'https://example.com/page',
          host: 'example.com',
        },
      })

      const result = await verifyCSRF(request)
      // In development, should pass without token
      expect(result).toBeNull()
    })

    it('should reject POST with mismatched referer', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          referer: 'https://evil.com/page',
          host: 'example.com',
        },
      })

      const result = await verifyCSRF(request)
      expect(result).not.toBeNull()
      expect(result?.status).toBe(403)
    })

    it('should warn in development mode when no token provided', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          origin: 'https://example.com',
          host: 'example.com',
        },
      })

      const result = await verifyCSRF(request)
      expect(result).toBeNull()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No token provided (development mode)')
      )

      process.env.NODE_ENV = originalEnv
      consoleWarnSpy.mockRestore()
    })
  })

  describe('SECURE_COOKIE_OPTIONS', () => {
    it('should have httpOnly set to true', () => {
      expect(SECURE_COOKIE_OPTIONS.httpOnly).toBe(true)
    })

    it('should have sameSite set to lax', () => {
      expect(SECURE_COOKIE_OPTIONS.sameSite).toBe('lax')
    })

    it('should have path set to /', () => {
      expect(SECURE_COOKIE_OPTIONS.path).toBe('/')
    })

    it('should set secure based on environment', () => {
      // Note: This test depends on current NODE_ENV
      expect(typeof SECURE_COOKIE_OPTIONS.secure).toBe('boolean')
    })
  })
})

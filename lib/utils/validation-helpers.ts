/**
 * Common Validation Helpers
 *
 * Reusable validation functions to reduce code duplication
 */

import { z } from 'zod'

/**
 * Standard validation result
 */
export interface ValidationResult<T = unknown> {
  success: boolean
  data?: T
  errors?: string[]
}

/**
 * Validate data against Zod schema
 *
 * @example
 * const result = validateWithSchema(userSchema, userData)
 * if (!result.success) {
 *   return { error: result.errors[0] }
 * }
 */
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (err) {
    if (err instanceof z.ZodError) {
      const errors = err.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      return { success: false, errors }
    }

    return {
      success: false,
      errors: ['Validation failed: Unknown error']
    }
  }
}

/**
 * Validate UUID format
 *
 * @example
 * if (!isValidUUID(playerId)) {
 *   return { error: 'Invalid player ID' }
 * }
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate date string (ISO 8601)
 */
export function isValidDate(date: string): boolean {
  const d = new Date(date)
  return !isNaN(d.getTime())
}

/**
 * Validate positive integer
 */
export function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

/**
 * Validate string length
 */
export function isValidLength(
  str: string,
  min: number,
  max: number
): ValidationResult<string> {
  if (str.length < min) {
    return {
      success: false,
      errors: [`String must be at least ${min} characters`]
    }
  }

  if (str.length > max) {
    return {
      success: false,
      errors: [`String must be at most ${max} characters`]
    }
  }

  return { success: true, data: str }
}

/**
 * Validate required fields
 *
 * @example
 * const result = validateRequired({ name, email }, ['name', 'email'])
 * if (!result.success) {
 *   return { error: result.errors[0] }
 * }
 */
export function validateRequired(
  data: Record<string, unknown>,
  fields: string[]
): ValidationResult {
  const missing: string[] = []

  fields.forEach(field => {
    const value = data[field]
    if (value === undefined || value === null || value === '') {
      missing.push(field)
    }
  })

  if (missing.length > 0) {
    return {
      success: false,
      errors: [`Missing required fields: ${missing.join(', ')}`]
    }
  }

  return { success: true }
}

/**
 * Common Zod schemas
 */
export const commonSchemas = {
  /**
   * UUID schema
   */
  uuid: z.string().uuid('Invalid UUID format'),

  /**
   * Email schema
   */
  email: z.string().email('Invalid email format'),

  /**
   * URL schema
   */
  url: z.string().url('Invalid URL format'),

  /**
   * Non-empty string
   */
  nonEmptyString: z.string().min(1, 'String cannot be empty'),

  /**
   * Positive integer
   */
  positiveInt: z.number().int().positive('Must be a positive integer'),

  /**
   * Date string
   */
  dateString: z.string().refine(isValidDate, 'Invalid date format'),

  /**
   * Pagination params
   */
  pagination: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(20),
  }),

  /**
   * Sort params
   */
  sort: z.object({
    field: z.string(),
    order: z.enum(['asc', 'desc']).default('asc'),
  }),
}

/**
 * Create custom validator
 *
 * @example
 * const isAdult = createValidator(
 *   (age: number) => age >= 18,
 *   'Must be 18 or older'
 * )
 */
export function createValidator<T>(
  predicate: (value: T) => boolean,
  errorMessage: string
): (value: T) => ValidationResult<T> {
  return (value: T) => {
    if (predicate(value)) {
      return { success: true, data: value }
    }
    return { success: false, errors: [errorMessage] }
  }
}

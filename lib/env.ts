/**
 * Environment Variables Central Management
 *
 * 환경 변수 중앙 관리 및 런타임 검증
 * - 타입 안전성
 * - 누락된 환경 변수 조기 감지
 * - 환경별 설정 분리
 */

// ==================== Required Environment Variables ====================

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

const REQUIRED_SERVER_ENV_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'CLAUDE_API_KEY',
] as const

// ==================== Validation ====================

/**
 * 환경 변수 검증
 *
 * 필수 환경 변수가 설정되어 있는지 확인
 */
export function validateEnv() {
  const missing: string[] = []

  // Public 환경 변수 검증
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  // Server-only 환경 변수 검증 (서버 사이드에서만)
  if (typeof window === 'undefined') {
    for (const key of REQUIRED_SERVER_ENV_VARS) {
      if (!process.env[key]) {
        missing.push(key)
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(key => `  - ${key}`).join('\n')}\n\n` +
      `Please add these variables to your .env.local file.`
    )
  }
}

// ==================== Environment Variable Getters ====================

/**
 * 환경 변수 가져오기 (타입 안전)
 */
function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key]
  if (!value) {
    if (fallback !== undefined) {
      return fallback
    }
    throw new Error(`Environment variable ${key} is not set`)
  }
  return value
}

// ==================== Exported Environment Variables ====================

/**
 * Supabase 환경 변수
 */
export const supabaseEnv = {
  url: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  anonKey: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  serviceRoleKey: typeof window === 'undefined'
    ? getEnvVar('SUPABASE_SERVICE_ROLE_KEY')
    : '',
} as const

/**
 * Claude API 환경 변수
 */
export const claudeEnv = {
  apiKey: typeof window === 'undefined'
    ? getEnvVar('CLAUDE_API_KEY')
    : '',
} as const

/**
 * YouTube API 환경 변수
 */
export const youtubeEnv = {
  apiKey: getEnvVar('NEXT_PUBLIC_YOUTUBE_API_KEY', ''),
} as const

/**
 * Upstash Redis 환경 변수
 */
export const redisEnv = {
  url: getEnvVar('UPSTASH_REDIS_REST_URL', ''),
  token: getEnvVar('UPSTASH_REDIS_REST_TOKEN', ''),
} as const

/**
 * 환경 정보
 */
export const appEnv = {
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const

// ==================== Auto-validation (런타임 시 자동 검증) ====================

// 앱 시작 시 환경 변수 검증 (프로덕션에서만)
if (appEnv.isProduction && typeof window === 'undefined') {
  try {
    validateEnv()
    console.log('✅ Environment variables validated successfully')
  } catch (error) {
    console.error('❌ Environment validation failed:', error)
    // 프로덕션에서는 에러를 던지지 않고 로그만 출력 (서버가 시작되지 않는 것을 방지)
  }
}

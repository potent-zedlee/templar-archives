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

/**
 * 환경 변수 가져오기 (안전 모드 - 빌드 타임에도 안전)
 * 빌드 타임에 환경 변수가 없어도 에러를 던지지 않음
 */
function getEnvVarSafe(key: string, fallback: string = ''): string {
  const value = process.env[key]
  return value || fallback
}

// ==================== Exported Environment Variables ====================

/**
 * Supabase 환경 변수 (Lazy Evaluation)
 *
 * 사용법:
 * - url: supabaseEnv.url (빌드 타임에 안전)
 * - serviceRoleKey: supabaseEnv.getServiceRoleKey() (런타임에만 호출)
 */
export const supabaseEnv = {
  get url() {
    return getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  },
  get anonKey() {
    return getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  },
  // Server-only: 런타임에 호출해야 함
  getServiceRoleKey(): string {
    if (typeof window !== 'undefined') {
      return '' // 클라이언트에서는 빈 문자열
    }
    return getEnvVarSafe('SUPABASE_SERVICE_ROLE_KEY')
  },
}

/**
 * Claude API 환경 변수 (Lazy Evaluation)
 */
export const claudeEnv = {
  // Server-only: 런타임에 호출해야 함
  getApiKey(): string {
    if (typeof window !== 'undefined') {
      return '' // 클라이언트에서는 빈 문자열
    }
    return getEnvVarSafe('CLAUDE_API_KEY')
  },
}

/**
 * YouTube API 환경 변수 (Lazy Evaluation)
 */
export const youtubeEnv = {
  get apiKey() {
    return getEnvVarSafe('NEXT_PUBLIC_YOUTUBE_API_KEY', '')
  },
}

/**
 * Upstash Redis 환경 변수 (Lazy Evaluation)
 */
export const redisEnv = {
  get url() {
    return getEnvVarSafe('UPSTASH_REDIS_REST_URL', '')
  },
  get token() {
    return getEnvVarSafe('UPSTASH_REDIS_REST_TOKEN', '')
  },
}

/**
 * 환경 정보
 */
export const appEnv = {
  get nodeEnv() {
    return getEnvVarSafe('NODE_ENV', 'development')
  },
  get isDevelopment() {
    return process.env.NODE_ENV === 'development'
  },
  get isProduction() {
    return process.env.NODE_ENV === 'production'
  },
  get isTest() {
    return process.env.NODE_ENV === 'test'
  },
}

// ==================== Auto-validation (런타임 시 자동 검증) ====================

// Note: 자동 검증은 제거되었습니다 (빌드 타임 에러 방지)
// 필요한 경우 애플리케이션 시작 시 수동으로 validateEnv() 호출

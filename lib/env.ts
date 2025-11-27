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
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
] as const

const REQUIRED_SERVER_ENV_VARS = [
  'FIREBASE_SERVICE_ACCOUNT_KEY',
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
 * Firebase 환경 변수 (Lazy Evaluation)
 */
export const firebaseEnv = {
  get apiKey() {
    return getEnvVarSafe('NEXT_PUBLIC_FIREBASE_API_KEY', '')
  },
  get projectId() {
    return getEnvVarSafe('NEXT_PUBLIC_FIREBASE_PROJECT_ID', '')
  },
  get authDomain() {
    return getEnvVarSafe('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', '')
  },
  get storageBucket() {
    return getEnvVarSafe('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', '')
  },
  // Server-only: 런타임에 호출해야 함
  getServiceAccountKey(): string {
    if (typeof window !== 'undefined') {
      return '' // 클라이언트에서는 빈 문자열
    }
    return getEnvVarSafe('FIREBASE_SERVICE_ACCOUNT_KEY')
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

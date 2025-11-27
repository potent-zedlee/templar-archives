/**
 * Supabase to Firestore Migration - Configuration
 *
 * 환경 설정 및 클라이언트 초기화
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { initializeApp, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore'
import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// ==================== Supabase Client ====================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// ==================== Firebase Admin ====================
let firebaseApp: App | null = null
let firestoreInstance: Firestore | null = null

function initFirebase(): Firestore {
  if (firestoreInstance) return firestoreInstance

  const serviceAccountKey = process.env.FIREBASE_ADMIN_SDK_KEY

  if (!serviceAccountKey) {
    throw new Error('Missing FIREBASE_ADMIN_SDK_KEY environment variable')
  }

  try {
    const credential = JSON.parse(serviceAccountKey)
    firebaseApp = initializeApp({
      credential: cert(credential),
    })
    firestoreInstance = getFirestore(firebaseApp)

    // Firestore 설정
    firestoreInstance.settings({
      ignoreUndefinedProperties: true,
    })

    return firestoreInstance
  } catch (error) {
    throw new Error(`Failed to initialize Firebase: ${error}`)
  }
}

export const firestore = initFirebase()

// ==================== Migration Options ====================
export interface MigrationOptions {
  /** Dry run mode - 실제 쓰기 없이 로깅만 */
  dryRun: boolean
  /** 배치 크기 (Firestore 제한: 500) */
  batchSize: number
  /** 에러 발생 시 계속 진행 */
  continueOnError: boolean
  /** ID 매핑 저장 여부 */
  saveIdMapping: boolean
  /** 상세 로깅 */
  verbose: boolean
}

export const defaultOptions: MigrationOptions = {
  dryRun: false,
  batchSize: 400, // 안전 마진
  continueOnError: true,
  saveIdMapping: true,
  verbose: true,
}

// ==================== ID Mapping ====================
export interface IdMapping {
  supabaseId: string
  firestoreId: string
  collection: string
  createdAt: string
}

const idMappings: Map<string, IdMapping> = new Map()

export function addIdMapping(supabaseId: string, firestoreId: string, collection: string): void {
  idMappings.set(`${collection}:${supabaseId}`, {
    supabaseId,
    firestoreId,
    collection,
    createdAt: new Date().toISOString(),
  })
}

export function getFirestoreId(collection: string, supabaseId: string): string | undefined {
  return idMappings.get(`${collection}:${supabaseId}`)?.firestoreId
}

export function getAllMappings(): IdMapping[] {
  return Array.from(idMappings.values())
}

export function clearMappings(): void {
  idMappings.clear()
}

// ==================== Utility Functions ====================

/**
 * ISO 문자열을 Firestore Timestamp로 변환
 */
export function toTimestamp(isoString: string | null | undefined): Timestamp | null {
  if (!isoString) return null
  try {
    return Timestamp.fromDate(new Date(isoString))
  } catch {
    return null
  }
}

/**
 * 현재 타임스탬프 생성
 */
export function now(): Timestamp {
  return Timestamp.now()
}

/**
 * 진행률 로깅
 */
export function logProgress(
  current: number,
  total: number,
  label: string,
  options: MigrationOptions
): void {
  if (!options.verbose) return
  const percentage = Math.round((current / total) * 100)
  const bar = '='.repeat(Math.floor(percentage / 2)) + ' '.repeat(50 - Math.floor(percentage / 2))
  process.stdout.write(`\r[${bar}] ${percentage}% | ${current}/${total} ${label}`)
  if (current === total) console.log()
}

/**
 * 에러 로깅
 */
export function logError(context: string, error: unknown, options: MigrationOptions): void {
  console.error(`\n[ERROR] ${context}:`, error instanceof Error ? error.message : error)
  if (options.verbose && error instanceof Error && error.stack) {
    console.error(error.stack)
  }
}

/**
 * 성공 로깅
 */
export function logSuccess(message: string): void {
  console.log(`[SUCCESS] ${message}`)
}

/**
 * 정보 로깅
 */
export function logInfo(message: string): void {
  console.log(`[INFO] ${message}`)
}

/**
 * 경고 로깅
 */
export function logWarning(message: string): void {
  console.warn(`[WARNING] ${message}`)
}

/**
 * CLI 옵션 파싱
 */
export function parseCliOptions(args: string[]): MigrationOptions {
  const options = { ...defaultOptions }

  for (const arg of args) {
    if (arg === '--dry-run') options.dryRun = true
    if (arg === '--no-continue-on-error') options.continueOnError = false
    if (arg === '--no-id-mapping') options.saveIdMapping = false
    if (arg === '--quiet') options.verbose = false
    if (arg.startsWith('--batch-size=')) {
      const size = parseInt(arg.split('=')[1], 10)
      if (!isNaN(size) && size > 0 && size <= 500) {
        options.batchSize = size
      }
    }
  }

  return options
}

/**
 * 마이그레이션 결과
 */
export interface MigrationResult {
  collection: string
  success: number
  failed: number
  skipped: number
  errors: string[]
  duration: number
}

/**
 * 마이그레이션 결과 출력
 */
export function printMigrationResult(result: MigrationResult): void {
  console.log('\n' + '='.repeat(60))
  console.log(`Migration Result: ${result.collection}`)
  console.log('='.repeat(60))
  console.log(`  Success: ${result.success}`)
  console.log(`  Failed:  ${result.failed}`)
  console.log(`  Skipped: ${result.skipped}`)
  console.log(`  Duration: ${(result.duration / 1000).toFixed(2)}s`)

  if (result.errors.length > 0) {
    console.log(`\n  Errors (${result.errors.length}):`)
    result.errors.slice(0, 10).forEach((err, i) => {
      console.log(`    ${i + 1}. ${err}`)
    })
    if (result.errors.length > 10) {
      console.log(`    ... and ${result.errors.length - 10} more`)
    }
  }
  console.log('='.repeat(60) + '\n')
}

// ==================== Export ====================
export { Timestamp }

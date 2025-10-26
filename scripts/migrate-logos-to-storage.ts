/**
 * Migrate Logo Files to Supabase Storage
 *
 * public/logos/ 폴더의 모든 로고 파일을 Supabase Storage로 일괄 업로드
 *
 * Usage:
 *   npx tsx scripts/migrate-logos-to-storage.ts
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY)
  process.exit(1)
}

// Supabase Admin Client (서비스 역할 키 사용)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const LOGOS_DIR = path.join(__dirname, '../public/logos')
const STORAGE_BUCKET = 'tournament-logos'
const ALLOWED_EXTENSIONS = ['.svg', '.png', '.jpg', '.jpeg', '.webp']

interface UploadResult {
  fileName: string
  categoryId: string
  publicUrl: string
  success: boolean
  error?: string
}

/**
 * 로고 파일 목록 가져오기
 */
function getLogoFiles(): string[] {
  if (!fs.existsSync(LOGOS_DIR)) {
    console.error(`❌ Error: Logos directory not found: ${LOGOS_DIR}`)
    process.exit(1)
  }

  const files = fs.readdirSync(LOGOS_DIR)

  return files.filter((file) => {
    const ext = path.extname(file).toLowerCase()
    const isAllowed = ALLOWED_EXTENSIONS.includes(ext)
    const isNotSubDir = !fs.statSync(path.join(LOGOS_DIR, file)).isDirectory()
    const isNotReadme = !file.includes('README') && !file.includes('GUIDE')

    return isAllowed && isNotSubDir && isNotReadme
  })
}

/**
 * 단일 파일 업로드
 */
async function uploadFile(fileName: string): Promise<UploadResult> {
  const filePath = path.join(LOGOS_DIR, fileName)
  const fileBuffer = fs.readFileSync(filePath)

  // 카테고리 ID 추출 (파일명에서 확장자 제거)
  const categoryId = path.basename(fileName, path.extname(fileName))

  // MIME 타입 결정
  const ext = path.extname(fileName).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  }
  const contentType = mimeTypes[ext] || 'application/octet-stream'

  try {
    // 기존 파일 확인
    const { data: existingFiles } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list('', {
        search: categoryId,
      })

    // 기존 파일이 있으면 삭제 (같은 categoryId의 다른 확장자 파일)
    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles
        .filter((f) => f.name.startsWith(categoryId))
        .map((f) => f.name)

      if (filesToDelete.length > 0) {
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(filesToDelete)

        console.log(`  🗑️  Removed old files: ${filesToDelete.join(', ')}`)
      }
    }

    // 새 파일 업로드
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, fileBuffer, {
        contentType,
        cacheControl: '604800', // 7일 (로고는 자주 변경되지 않음)
        upsert: true,
      })

    if (uploadError) {
      return {
        fileName,
        categoryId,
        publicUrl: '',
        success: false,
        error: uploadError.message,
      }
    }

    // Public URL 가져오기
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName)

    return {
      fileName,
      categoryId,
      publicUrl,
      success: true,
    }
  } catch (error) {
    return {
      fileName,
      categoryId,
      publicUrl: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('🚀 Starting logo migration to Supabase Storage...\n')

  // 1. Storage 버킷 확인
  console.log('📦 Checking storage bucket...')
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

  if (bucketsError) {
    console.error('❌ Error listing buckets:', bucketsError.message)
    process.exit(1)
  }

  const bucketExists = buckets?.some((b) => b.name === STORAGE_BUCKET)

  if (!bucketExists) {
    console.error(`❌ Error: Storage bucket "${STORAGE_BUCKET}" not found`)
    console.error('   Please create it in Supabase Dashboard first')
    process.exit(1)
  }

  console.log(`✅ Bucket "${STORAGE_BUCKET}" found\n`)

  // 2. 로고 파일 목록 가져오기
  console.log('📁 Scanning logos directory...')
  const logoFiles = getLogoFiles()
  console.log(`✅ Found ${logoFiles.length} logo files\n`)

  if (logoFiles.length === 0) {
    console.log('ℹ️  No logo files to migrate')
    return
  }

  // 3. 파일 업로드
  console.log('📤 Uploading logos...\n')
  const results: UploadResult[] = []

  for (let i = 0; i < logoFiles.length; i++) {
    const file = logoFiles[i]
    const progress = `[${i + 1}/${logoFiles.length}]`

    console.log(`${progress} Uploading: ${file}`)
    const result = await uploadFile(file)
    results.push(result)

    if (result.success) {
      console.log(`  ✅ Success: ${result.publicUrl}`)
    } else {
      console.log(`  ❌ Failed: ${result.error}`)
    }

    console.log('')
  }

  // 4. 결과 요약
  const successful = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 Migration Summary')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Successful: ${successful.length}`)
  console.log(`❌ Failed: ${failed.length}`)
  console.log(`📁 Total: ${results.length}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (failed.length > 0) {
    console.log('❌ Failed uploads:')
    failed.forEach((r) => {
      console.log(`   - ${r.fileName}: ${r.error}`)
    })
    console.log('')
  }

  // 5. URL 매핑 파일 생성 (다음 스크립트에서 사용)
  const urlMapping: Record<string, string> = {}
  successful.forEach((r) => {
    urlMapping[r.categoryId] = r.publicUrl
  })

  const mappingPath = path.join(__dirname, 'logo-url-mapping.json')
  fs.writeFileSync(mappingPath, JSON.stringify(urlMapping, null, 2))
  console.log(`📝 URL mapping saved to: ${mappingPath}\n`)

  console.log('✅ Migration completed!')

  if (failed.length > 0) {
    process.exit(1)
  }
}

// 실행
main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
/**
 * Unified Logo Management CLI
 *
 * 토너먼트 로고 관리 통합 CLI 도구
 *
 * Usage:
 *   npm run logo:fetch <categoryId> <imageUrl>
 *   npm run logo:upload <categoryId> <filePath>
 *   npm run logo:delete <categoryId>
 *   npm run logo:validate
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
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

// Supabase Admin Client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const STORAGE_BUCKET = 'tournament-logos'
const ALLOWED_EXTENSIONS = ['.svg', '.png', '.jpg', '.jpeg', '.webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * 파일 다운로드 (HTTP/HTTPS)
 */
function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http

    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
        return
      }

      const chunks: Buffer[] = []

      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => resolve(Buffer.concat(chunks)))
      response.on('error', reject)
    }).on('error', reject)
  })
}

/**
 * MIME 타입 결정
 */
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  }
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream'
}

/**
 * 카테고리 존재 확인
 */
async function categoryExists(categoryId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('tournament_categories')
    .select('id')
    .eq('id', categoryId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to check category: ${error.message}`)
  }

  return !!data
}

/**
 * 로고 업로드 (공통 함수)
 */
async function uploadLogo(
  categoryId: string,
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  // 파일 크기 확인
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }

  // 확장자 확인
  const ext = path.extname(fileName).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`File extension ${ext} not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`)
  }

  // MIME 타입
  const contentType = getMimeType(ext)

  // 기존 로고 삭제
  const { data: existingFiles } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list('', { search: categoryId })

  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles
      .filter((f) => f.name.startsWith(categoryId))
      .map((f) => f.name)

    if (filesToDelete.length > 0) {
      await supabase.storage.from(STORAGE_BUCKET).remove(filesToDelete)
      console.log(`  🗑️  Removed old logos: ${filesToDelete.join(', ')}`)
    }
  }

  // 새 파일명 생성
  const newFileName = `${categoryId}${ext}`

  // 업로드
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(newFileName, fileBuffer, {
      contentType,
      cacheControl: '604800', // 7일 (로고는 자주 변경되지 않음)
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  // Public URL 가져오기
  const { data: { publicUrl } } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(newFileName)

  // 카테고리 업데이트
  const { error: updateError } = await supabase
    .from('tournament_categories')
    .update({ logo_url: publicUrl })
    .eq('id', categoryId)

  if (updateError) {
    throw new Error(`Failed to update category: ${updateError.message}`)
  }

  return publicUrl
}

/**
 * Command: fetch
 */
async function cmdFetch(categoryId: string, imageUrl: string) {
  console.log(`🌐 Fetching logo from: ${imageUrl}`)

  // 1. 카테고리 확인
  if (!(await categoryExists(categoryId))) {
    throw new Error(`Category not found: ${categoryId}`)
  }

  // 2. 파일 다운로드
  console.log('📥 Downloading...')
  const fileBuffer = await downloadFile(imageUrl)
  console.log(`✅ Downloaded: ${fileBuffer.length} bytes`)

  // 3. 확장자 추출 (URL에서)
  const urlPath = new URL(imageUrl).pathname
  let ext = path.extname(urlPath).toLowerCase()

  // 확장자가 없거나 허용되지 않으면 .png 기본값
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    ext = '.png'
    console.log(`⚠️  Using default extension: ${ext}`)
  }

  // 4. 업로드
  console.log('📤 Uploading to Supabase Storage...')
  const fileName = `${categoryId}${ext}`
  const publicUrl = await uploadLogo(categoryId, fileBuffer, fileName)

  console.log('✅ Logo uploaded successfully!')
  console.log(`   URL: ${publicUrl}`)
}

/**
 * Command: upload
 */
async function cmdUpload(categoryId: string, filePath: string) {
  console.log(`📁 Uploading logo from: ${filePath}`)

  // 1. 카테고리 확인
  if (!(await categoryExists(categoryId))) {
    throw new Error(`Category not found: ${categoryId}`)
  }

  // 2. 파일 확인
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  // 3. 파일 읽기
  const fileBuffer = fs.readFileSync(filePath)
  const fileName = path.basename(filePath)

  console.log(`✅ File loaded: ${fileBuffer.length} bytes`)

  // 4. 업로드
  console.log('📤 Uploading to Supabase Storage...')
  const publicUrl = await uploadLogo(categoryId, fileBuffer, fileName)

  console.log('✅ Logo uploaded successfully!')
  console.log(`   URL: ${publicUrl}`)
}

/**
 * Command: delete
 */
async function cmdDelete(categoryId: string) {
  console.log(`🗑️  Deleting logo for: ${categoryId}`)

  // 1. 카테고리 확인
  if (!(await categoryExists(categoryId))) {
    throw new Error(`Category not found: ${categoryId}`)
  }

  // 2. 기존 로고 파일 찾기
  const { data: files } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list('', { search: categoryId })

  if (!files || files.length === 0) {
    console.log('ℹ️  No logo files found')
    return
  }

  const filesToDelete = files
    .filter((f) => f.name.startsWith(categoryId))
    .map((f) => f.name)

  if (filesToDelete.length === 0) {
    console.log('ℹ️  No logo files found')
    return
  }

  // 3. Storage에서 삭제
  const { error: deleteError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove(filesToDelete)

  if (deleteError) {
    throw new Error(`Failed to delete files: ${deleteError.message}`)
  }

  console.log(`✅ Deleted files: ${filesToDelete.join(', ')}`)

  // 4. 카테고리 logo_url NULL로 설정
  const { error: updateError } = await supabase
    .from('tournament_categories')
    .update({ logo_url: null })
    .eq('id', categoryId)

  if (updateError) {
    throw new Error(`Failed to update category: ${updateError.message}`)
  }

  console.log('✅ Logo deleted successfully!')
}

/**
 * Command: validate
 */
async function cmdValidate() {
  console.log('🔍 Validating all category logos...\n')

  // 1. 모든 카테고리 조회
  const { data: categories, error: fetchError } = await supabase
    .from('tournament_categories')
    .select('id, display_name, logo_url')
    .eq('is_active', true)
    .order('priority')

  if (fetchError) {
    throw new Error(`Failed to fetch categories: ${fetchError.message}`)
  }

  if (!categories || categories.length === 0) {
    console.log('ℹ️  No categories found')
    return
  }

  // 2. 검증
  const missing: string[] = []
  const valid: string[] = []
  const invalid: string[] = []

  for (const cat of categories) {
    if (!cat.logo_url) {
      missing.push(cat.id)
    } else if (cat.logo_url.includes(STORAGE_BUCKET)) {
      valid.push(cat.id)
    } else {
      invalid.push(cat.id)
    }
  }

  // 3. 결과 출력
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 Validation Summary')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Valid (Supabase Storage): ${valid.length}`)
  console.log(`⚠️  Invalid (static/external URL): ${invalid.length}`)
  console.log(`❌ Missing: ${missing.length}`)
  console.log(`📁 Total: ${categories.length}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (missing.length > 0) {
    console.log('❌ Categories with missing logos:')
    missing.forEach((id) => console.log(`   - ${id}`))
    console.log('')
  }

  if (invalid.length > 0) {
    console.log('⚠️  Categories with non-Storage logos:')
    invalid.forEach((id) => {
      const cat = categories.find((c) => c.id === id)
      console.log(`   - ${id}: ${cat?.logo_url}`)
    })
    console.log('')
  }

  console.log('✅ Validation completed!')
}

/**
 * CLI 메인 함수
 */
async function main() {
  const [command, ...args] = process.argv.slice(2)

  if (!command) {
    console.log('Usage:')
    console.log('  npm run logo:fetch <categoryId> <imageUrl>')
    console.log('  npm run logo:upload <categoryId> <filePath>')
    console.log('  npm run logo:delete <categoryId>')
    console.log('  npm run logo:validate')
    process.exit(1)
  }

  try {
    switch (command) {
      case 'fetch': {
        if (args.length !== 2) {
          throw new Error('Usage: npm run logo:fetch <categoryId> <imageUrl>')
        }
        await cmdFetch(args[0], args[1])
        break
      }

      case 'upload': {
        if (args.length !== 2) {
          throw new Error('Usage: npm run logo:upload <categoryId> <filePath>')
        }
        await cmdUpload(args[0], args[1])
        break
      }

      case 'delete': {
        if (args.length !== 1) {
          throw new Error('Usage: npm run logo:delete <categoryId>')
        }
        await cmdDelete(args[0])
        break
      }

      case 'validate': {
        await cmdValidate()
        break
      }

      default:
        throw new Error(`Unknown command: ${command}`)
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// 실행
main()
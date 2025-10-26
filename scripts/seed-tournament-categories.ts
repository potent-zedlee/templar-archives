/**
 * Seed Tournament Categories to Database
 *
 * tournament-categories.ts 정적 데이터를 tournament_categories 테이블에 시드
 *
 * Usage:
 *   npx tsx scripts/seed-tournament-categories.ts
 */

import { createClient } from '@supabase/supabase-js'
import { TOURNAMENT_CATEGORIES } from '../lib/tournament-categories-static.js'
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

// Supabase Admin Client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface SeedResult {
  categoryId: string
  action: 'created' | 'updated' | 'skipped' | 'failed'
  error?: string
}

/**
 * URL 매핑 로드 (migrate-logos-to-storage.ts에서 생성)
 */
function loadUrlMapping(): Record<string, string> {
  const mappingPath = path.join(__dirname, 'logo-url-mapping.json')

  if (fs.existsSync(mappingPath)) {
    const content = fs.readFileSync(mappingPath, 'utf-8')
    return JSON.parse(content)
  }

  console.warn('⚠️  Warning: logo-url-mapping.json not found')
  console.warn('   Make sure to run migrate-logos-to-storage.ts first')
  return {}
}

/**
 * 단일 카테고리 시드
 */
async function seedCategory(
  category: typeof TOURNAMENT_CATEGORIES[0],
  urlMapping: Record<string, string>
): Promise<SeedResult> {
  try {
    // 기존 카테고리 확인
    const { data: existing, error: fetchError } = await supabase
      .from('tournament_categories')
      .select('id, logo_url')
      .eq('id', category.id)
      .maybeSingle()

    if (fetchError) {
      return {
        categoryId: category.id,
        action: 'failed',
        error: fetchError.message,
      }
    }

    // Logo URL 결정
    let logoUrl = category.logoUrl

    // URL 매핑에 있으면 Supabase Storage URL 사용
    if (urlMapping[category.id]) {
      logoUrl = urlMapping[category.id]
    }

    // 데이터 준비
    const categoryData = {
      id: category.id,
      name: category.name,
      display_name: category.displayName,
      short_name: category.shortName || null,
      aliases: category.aliases,
      logo_url: logoUrl,
      region: category.region,
      priority: category.priority,
      website: category.website || null,
      is_active: category.isActive,
      game_type: 'both' as const, // 기본값
      parent_id: null,
      theme_gradient: category.theme?.gradient || null,
      theme_text: category.theme?.text || null,
      theme_shadow: category.theme?.shadow || null,
    }

    if (existing) {
      // 업데이트
      const { error: updateError } = await supabase
        .from('tournament_categories')
        .update(categoryData)
        .eq('id', category.id)

      if (updateError) {
        return {
          categoryId: category.id,
          action: 'failed',
          error: updateError.message,
        }
      }

      return {
        categoryId: category.id,
        action: 'updated',
      }
    } else {
      // 생성
      const { error: insertError } = await supabase
        .from('tournament_categories')
        .insert(categoryData)

      if (insertError) {
        return {
          categoryId: category.id,
          action: 'failed',
          error: insertError.message,
        }
      }

      return {
        categoryId: category.id,
        action: 'created',
      }
    }
  } catch (error) {
    return {
      categoryId: category.id,
      action: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('🌱 Starting tournament categories seed...\n')

  // 1. URL 매핑 로드
  console.log('📝 Loading logo URL mapping...')
  const urlMapping = loadUrlMapping()
  console.log(`✅ Loaded ${Object.keys(urlMapping).length} URL mappings\n`)

  // 2. 테이블 존재 확인
  console.log('📦 Checking tournament_categories table...')
  const { error: tableError } = await supabase
    .from('tournament_categories')
    .select('id')
    .limit(1)

  if (tableError) {
    console.error('❌ Error: tournament_categories table not accessible')
    console.error('   ', tableError.message)
    process.exit(1)
  }

  console.log('✅ Table accessible\n')

  // 3. 카테고리 시드
  console.log(`📤 Seeding ${TOURNAMENT_CATEGORIES.length} categories...\n`)
  const results: SeedResult[] = []

  for (let i = 0; i < TOURNAMENT_CATEGORIES.length; i++) {
    const category = TOURNAMENT_CATEGORIES[i]
    const progress = `[${i + 1}/${TOURNAMENT_CATEGORIES.length}]`

    console.log(`${progress} Processing: ${category.id} (${category.displayName})`)
    const result = await seedCategory(category, urlMapping)
    results.push(result)

    const icon = result.action === 'created' ? '✨' : result.action === 'updated' ? '🔄' : result.action === 'failed' ? '❌' : 'ℹ️'
    console.log(`  ${icon} ${result.action.toUpperCase()}${result.error ? `: ${result.error}` : ''}`)

    console.log('')
  }

  // 4. 결과 요약
  const created = results.filter((r) => r.action === 'created')
  const updated = results.filter((r) => r.action === 'updated')
  const skipped = results.filter((r) => r.action === 'skipped')
  const failed = results.filter((r) => r.action === 'failed')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 Seed Summary')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✨ Created: ${created.length}`)
  console.log(`🔄 Updated: ${updated.length}`)
  console.log(`ℹ️  Skipped: ${skipped.length}`)
  console.log(`❌ Failed: ${failed.length}`)
  console.log(`📁 Total: ${results.length}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (failed.length > 0) {
    console.log('❌ Failed seeds:')
    failed.forEach((r) => {
      console.log(`   - ${r.categoryId}: ${r.error}`)
    })
    console.log('')
  }

  // 5. 로고 URL 통계
  const withStorageUrl = results.filter((r) => {
    const cat = TOURNAMENT_CATEGORIES.find((c) => c.id === r.categoryId)
    return cat && urlMapping[r.categoryId]
  })

  console.log('📊 Logo URL Statistics:')
  console.log(`   Supabase Storage: ${withStorageUrl.length}`)
  console.log(`   Static Files: ${results.length - withStorageUrl.length}`)
  console.log('')

  console.log('✅ Seed completed!')

  if (failed.length > 0) {
    process.exit(1)
  }
}

// 실행
main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
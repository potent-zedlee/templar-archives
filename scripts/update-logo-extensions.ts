/**
 * 로고 파일 확장자 자동 업데이트 스크립트
 *
 * public/logos/ 폴더의 실제 파일을 스캔하여
 * tournament-categories.ts의 logoUrl을 자동으로 업데이트합니다.
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const LOGOS_DIR = path.join(__dirname, '../public/logos')
const CATEGORIES_FILE = path.join(__dirname, '../lib/tournament-categories.ts')

/**
 * 로고 파일 스캔
 */
function scanLogoFiles(): Map<string, string> {
  const logoMap = new Map<string, string>()

  if (!fs.existsSync(LOGOS_DIR)) {
    console.error('❌ 로고 디렉토리가 없습니다:', LOGOS_DIR)
    return logoMap
  }

  const files = fs.readdirSync(LOGOS_DIR)

  for (const file of files) {
    // .svg 또는 .png 파일만 처리
    const ext = path.extname(file)
    if (ext !== '.svg' && ext !== '.png') continue

    const basename = path.basename(file, ext)
    const filePath = path.join(LOGOS_DIR, file)
    const stats = fs.statSync(filePath)

    // 이미 매핑된 파일이 있으면 더 큰 파일 사용 (실제 로고일 가능성 높음)
    if (logoMap.has(basename)) {
      const existingExt = logoMap.get(basename)!
      const existingPath = path.join(LOGOS_DIR, `${basename}${existingExt}`)
      const existingStats = fs.statSync(existingPath)

      // 더 큰 파일을 선택 (플레이스홀더는 작은 파일)
      if (stats.size > existingStats.size) {
        logoMap.set(basename, ext)
        console.log(`  ✓ ${basename}: ${existingExt} → ${ext} (${stats.size} bytes)`)
      }
    } else {
      logoMap.set(basename, ext)
    }
  }

  return logoMap
}

/**
 * tournament-categories.ts 업데이트
 */
function updateCategoriesFile(logoMap: Map<string, string>) {
  let content = fs.readFileSync(CATEGORIES_FILE, 'utf-8')
  let updateCount = 0

  // logoUrl 패턴 찾기: logoUrl: '/logos/ID.EXT',
  const logoUrlPattern = /logoUrl:\s*['"]\/logos\/([^'"]+)['"]/g

  content = content.replace(logoUrlPattern, (match, fullPath) => {
    // ID와 확장자 분리
    const ext = path.extname(fullPath)
    const id = path.basename(fullPath, ext)

    // 실제 파일이 있는지 확인
    if (logoMap.has(id)) {
      const actualExt = logoMap.get(id)!
      const newPath = `/logos/${id}${actualExt}`
      const oldPath = `/logos/${fullPath}`

      if (newPath !== oldPath) {
        console.log(`  📝 ${id}: ${ext || '(확장자 없음)'} → ${actualExt}`)
        updateCount++
        return `logoUrl: '${newPath}'`
      }
    }

    return match
  })

  if (updateCount > 0) {
    fs.writeFileSync(CATEGORIES_FILE, content, 'utf-8')
    console.log(`\n✅ ${updateCount}개 logoUrl 업데이트 완료!`)
  } else {
    console.log('\n✓ 업데이트 필요 없음 (모든 경로가 이미 정확함)')
  }

  return updateCount
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('🔍 로고 파일 스캔 시작...\n')

  const logoMap = scanLogoFiles()

  console.log(`\n📊 발견된 로고 파일: ${logoMap.size}개`)
  console.log('─'.repeat(50))

  // 파일 목록 출력
  const sortedLogos = Array.from(logoMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  for (const [id, ext] of sortedLogos) {
    const filePath = path.join(LOGOS_DIR, `${id}${ext}`)
    const stats = fs.statSync(filePath)
    const sizeKB = (stats.size / 1024).toFixed(1)
    console.log(`  ${id}${ext} (${sizeKB} KB)`)
  }

  console.log('\n' + '─'.repeat(50))
  console.log('📝 tournament-categories.ts 업데이트 중...\n')

  const updateCount = updateCategoriesFile(logoMap)

  console.log('\n' + '='.repeat(50))
  console.log('✨ 완료!')
  console.log('='.repeat(50))
}

main().catch(console.error)

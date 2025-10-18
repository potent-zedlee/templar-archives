/**
 * pokernews.com에서 실제 투어 로고 다운로드
 */

import fs from 'fs'
import path from 'path'
import https from 'https'
import { TOURNAMENT_CATEGORIES } from '../lib/tournament-categories'

// pokernews.com 투어 데이터
const POKERNEWS_TOURS = [
  { name: 'World Series of Poker', url: 'https://pnimg.net/w/reporting-tour/0/649/4751abd12c.svg' },
  { name: 'World Poker Tour', url: 'https://pnimg.net/w/reporting-tour/0/649/438d754d1d.svg' },
  { name: 'European Poker Tour', url: 'https://pnimg.net/w/reporting-tour/0/64a/be3d9a73ce.svg' },
  { name: 'PokerStars Open', url: 'https://pnimg.net/w/reporting-tour/1/676/3e5d7cf38e.png' },
  { name: 'Global Poker', url: 'https://pnimg.net/w/reporting-tour/0/649/44aa1a9d28.svg' },
  { name: '888poker', url: 'https://pnimg.net/w/reporting-tour/0/649/43f5d09cc3.svg' },
  { name: '888poker LIVE', url: 'https://pnimg.net/w/reporting-tour/0/649/43aed5cc70.svg' },
  { name: 'RunGood Poker Series', url: 'https://pnimg.net/w/reporting-tour/0/649/43bcef356f.svg' },
  { name: 'Merit Poker', url: 'https://pnimg.net/w/reporting-tour/0/64e/731f69dc7f.svg' },
  { name: 'Triton', url: 'https://pnimg.net/w/reporting-tour/1/68c/01e693da55.png' },
  { name: 'Hustler Casino Live', url: 'https://pnimg.net/w/reporting-tour/1/677/1af2ba91e1.png' },
  { name: 'GGPoker', url: 'https://pnimg.net/w/reporting-tour/0/649/44a46fd654.svg' },
  { name: 'Unibet Open', url: 'https://pnimg.net/w/reporting-tour/0/649/43db24c087.svg' },
  { name: 'Aussie Millions', url: 'https://pnimg.net/w/reporting-tour/0/649/43aeae7ef9.svg' },
  { name: 'Asian Poker Tour', url: 'https://pnimg.net/w/reporting-tour/0/649/43a8fa9de3.svg' },
  { name: 'partypoker LIVE', url: 'https://pnimg.net/w/reporting-tour/0/649/43c6a3e6a0.svg' },
  { name: 'WSOP Circuit', url: 'https://pnimg.net/w/reporting-tour/0/649/475d7adee1.svg' },
  { name: 'PokerGO Tour', url: 'https://pnimg.net/w/reporting-tour/1/66e/cd91f0c27a.png' },
  { name: 'Irish Poker Tour', url: 'https://pnimg.net/w/reporting-tour/0/649/43b5b81fd8.svg' },
]

/**
 * 투어 이름 매칭 (유사도 기반)
 */
function findMatchingCategory(pokerNewsName: string) {
  const normalized = pokerNewsName.toLowerCase()

  return TOURNAMENT_CATEGORIES.find(cat => {
    const catNameLower = cat.name.toLowerCase()
    const catDisplayLower = cat.displayName.toLowerCase()

    // 정확한 매칭
    if (catNameLower === normalized || catDisplayLower === normalized) {
      return true
    }

    // 별칭 매칭
    if (cat.aliases.some(alias => alias.toLowerCase() === normalized)) {
      return true
    }

    // 부분 매칭 (짧은 이름이 긴 이름에 포함)
    if (normalized.includes(catNameLower) || catNameLower.includes(normalized)) {
      return true
    }

    if (normalized.includes(catDisplayLower) || catDisplayLower.includes(normalized)) {
      return true
    }

    return false
  })
}

/**
 * 파일 다운로드
 */
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`))
        return
      }

      response.pipe(file)

      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      fs.unlink(dest, () => {}) // 실패 시 파일 삭제
      reject(err)
    })
  })
}

/**
 * 메인 실행
 */
async function main() {
  const logosDir = path.join(process.cwd(), 'public', 'logos')

  if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true })
  }

  console.log('🔍 투어 매칭 및 로고 다운로드 시작...\n')

  let downloadCount = 0
  let skipCount = 0
  const matched: string[] = []
  const notMatched: string[] = []

  for (const tour of POKERNEWS_TOURS) {
    const category = findMatchingCategory(tour.name)

    if (!category) {
      notMatched.push(tour.name)
      console.log(`⚠️  매칭 실패: ${tour.name}`)
      continue
    }

    matched.push(`${category.displayName} (${tour.name})`)

    // 파일 확장자 결정
    const ext = tour.url.endsWith('.png') ? 'png' : 'svg'
    const filename = `${category.id}.${ext}`
    const filepath = path.join(logosDir, filename)

    try {
      console.log(`⬇️  다운로드: ${category.displayName} → ${filename}`)
      await downloadFile(tour.url, filepath)
      downloadCount++
      console.log(`✅ 완료: ${filename}`)
    } catch (error) {
      console.error(`❌ 실패: ${filename}`, error)
      skipCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 다운로드 결과')
  console.log('='.repeat(60))
  console.log(`✅ 성공: ${downloadCount}개`)
  console.log(`❌ 실패: ${skipCount}개`)
  console.log(`⚠️  매칭 안됨: ${notMatched.length}개`)
  console.log('\n매칭된 투어:')
  matched.forEach(m => console.log(`  - ${m}`))

  if (notMatched.length > 0) {
    console.log('\n매칭 안된 투어:')
    notMatched.forEach(m => console.log(`  - ${m}`))
  }

  console.log('\n' + '='.repeat(60))
  console.log(`\n총 ${downloadCount}개의 실제 로고가 다운로드되었습니다!`)
  console.log(`public/logos/ 폴더를 확인하세요.\n`)
}

main().catch(console.error)

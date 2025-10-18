/**
 * PokerNews Tours 로고 다운로드 스크립트
 *
 * pokernews.com/tours에서 실제 투어 로고 다운로드
 */

import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 로고 저장 경로
const LOGOS_DIR = path.join(__dirname, '../public/logos')

// PokerNews 로고 URL 매핑 (우리 ID → PokerNews 로고 URL)
const POKERNEWS_LOGOS: Record<string, { url: string; ext: string }> = {
  'wsop': {
    url: 'https://pnimg.net/w/reporting-tour/0/649/4751abd12c.svg',
    ext: 'svg'
  },
  'wpt': {
    url: 'https://pnimg.net/w/reporting-tour/0/649/438d754d1d.svg',
    ext: 'svg'
  },
  'ept': {
    url: 'https://pnimg.net/w/reporting-tour/0/64a/be3d9a73ce.svg',
    ext: 'svg'
  },
  'triton': {
    url: 'https://pnimg.net/w/reporting-tour/1/68c/01e693da55.png',
    ext: 'png'
  },
  'pokerstars-open': {
    url: 'https://pnimg.net/w/reporting-tour/1/676/3e5d7cf38e.png',
    ext: 'png'
  },
  'global-poker': {
    url: 'https://pnimg.net/w/reporting-tour/0/649/44aa1a9d28.svg',
    ext: 'svg'
  },
  '888poker': {
    url: 'https://pnimg.net/w/reporting-tour/0/649/43f5d09cc3.svg',
    ext: 'svg'
  },
  '888poker-live': {
    url: 'https://pnimg.net/w/reporting-tour/0/649/43aed5cc70.svg',
    ext: 'svg'
  },
  'rungood': {
    url: 'https://pnimg.net/w/reporting-tour/0/649/43bcef356f.svg',
    ext: 'svg'
  },
  'merit-poker': {
    url: 'https://pnimg.net/w/reporting-tour/0/64e/731f69dc7f.svg',
    ext: 'svg'
  },
  'ggpoker-uk': {
    url: 'https://pnimg.net/w/reporting-tour/1/63a/ae554f1f9b.png',
    ext: 'png'
  },
  'hendon-mob': {
    url: 'https://pnimg.net/w/reporting-tour/0/64c/b94ac1f6c6.svg',
    ext: 'svg'
  },
}

/**
 * HTTPS로 파일 다운로드
 */
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        fs.unlinkSync(dest)
        reject(new Error(`Failed to download: ${response.statusCode}`))
        return
      }

      response.pipe(file)

      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      fs.unlinkSync(dest)
      reject(err)
    })
  })
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('🔍 PokerNews 투어 로고 다운로드 시작...\n')

  // 로고 디렉토리가 없으면 생성
  if (!fs.existsSync(LOGOS_DIR)) {
    fs.mkdirSync(LOGOS_DIR, { recursive: true })
  }

  let successCount = 0
  let failCount = 0
  const downloaded: string[] = []
  const failed: string[] = []

  // 각 로고 다운로드
  for (const [tourId, { url, ext }] of Object.entries(POKERNEWS_LOGOS)) {
    const filename = `${tourId}.${ext}`
    const filepath = path.join(LOGOS_DIR, filename)

    try {
      console.log(`⬇️  다운로드: ${tourId} → ${filename}`)
      await downloadFile(url, filepath)
      console.log(`✅ 완료: ${filename}`)
      successCount++
      downloaded.push(tourId)
    } catch (error) {
      console.error(`❌ 실패: ${filename}`, error)
      failCount++
      failed.push(tourId)
    }
  }

  // 결과 출력
  console.log('\n============================================================')
  console.log('📊 다운로드 결과')
  console.log('============================================================')
  console.log(`✅ 성공: ${successCount}개`)
  console.log(`❌ 실패: ${failCount}개`)

  if (downloaded.length > 0) {
    console.log('\n다운로드 성공:')
    downloaded.forEach(id => console.log(`  - ${id}`))
  }

  if (failed.length > 0) {
    console.log('\n다운로드 실패:')
    failed.forEach(id => console.log(`  - ${id}`))
  }

  console.log('\n============================================================')
  console.log(`\n총 ${successCount}개의 실제 로고가 다운로드되었습니다!`)
  console.log('public/logos/ 폴더를 확인하세요.')
}

main().catch(console.error)

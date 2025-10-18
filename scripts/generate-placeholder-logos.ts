/**
 * 플레이스홀더 SVG 로고 생성 스크립트
 *
 * 각 투어의 플레이스홀더 SVG 로고를 자동 생성합니다.
 * 실제 로고는 각 투어의 공식 사이트에서 다운로드하여 교체하세요.
 *
 * 실행: npx tsx scripts/generate-placeholder-logos.ts
 */

import fs from 'fs'
import path from 'path'
import { TOURNAMENT_CATEGORIES } from '../lib/tournament-categories'

const LOGOS_DIR = path.join(process.cwd(), 'public', 'logos')

/**
 * SVG 플레이스홀더 템플릿 생성
 */
function generatePlaceholderSVG(
  displayName: string,
  shortName?: string
): string {
  const text = shortName || displayName
  const fontSize = text.length > 8 ? 16 : text.length > 5 ? 20 : 24

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40">
  <!-- Placeholder logo for ${displayName} -->
  <!-- Replace with actual logo from ${displayName}'s official website -->
  <defs>
    <linearGradient id="grad-${text.toLowerCase().replace(/\s+/g, '-')}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:currentColor;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:currentColor;stop-opacity:0.4" />
    </linearGradient>
  </defs>
  <rect width="120" height="40" rx="4" fill="url(#grad-${text.toLowerCase().replace(/\s+/g, '-')})" opacity="0.1"/>
  <text
    x="60"
    y="25"
    font-size="${fontSize}"
    font-weight="bold"
    fill="currentColor"
    text-anchor="middle"
    font-family="Arial, sans-serif"
  >${text}</text>
</svg>`
}

/**
 * 로고 디렉토리 확인 및 생성
 */
function ensureLogosDirectory() {
  if (!fs.existsSync(LOGOS_DIR)) {
    fs.mkdirSync(LOGOS_DIR, { recursive: true })
    console.log(`✓ Created directory: ${LOGOS_DIR}`)
  }
}

/**
 * 모든 투어의 플레이스홀더 로고 생성
 */
function generateAllLogos() {
  console.log('🎨 Generating placeholder SVG logos...\n')

  let generated = 0
  let skipped = 0

  for (const category of TOURNAMENT_CATEGORIES) {
    const filename = `${category.id}.svg`
    const filepath = path.join(LOGOS_DIR, filename)

    // 이미 로고가 존재하면 건너뛰기
    if (fs.existsSync(filepath)) {
      console.log(`⏭️  Skipped: ${filename} (already exists)`)
      skipped++
      continue
    }

    const svg = generatePlaceholderSVG(category.displayName, category.shortName)
    fs.writeFileSync(filepath, svg, 'utf-8')
    console.log(`✓ Generated: ${filename}`)
    generated++
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Generated: ${generated} logos`)
  console.log(`   Skipped: ${skipped} logos (already exist)`)
  console.log(`   Total: ${TOURNAMENT_CATEGORIES.length} tours`)
}

/**
 * README 파일 업데이트
 */
function updateReadme() {
  const readmePath = path.join(LOGOS_DIR, 'README.md')

  // 투어별 로고 파일 목록 생성
  const logoList = TOURNAMENT_CATEGORIES
    .map((cat) => {
      const region = cat.region.charAt(0).toUpperCase() + cat.region.slice(1)
      return `- \`${cat.id}.svg\` - **${cat.name}** (${region})`
    })
    .join('\n')

  const readmeContent = `# Tournament & Channel Logos

이 디렉토리에는 각 포커 투어 및 YouTube 채널의 로고 파일을 보관합니다.

## 📦 현재 상태

현재 **플레이스홀더 로고**가 생성되어 있습니다.
실제 로고는 각 투어의 공식 웹사이트에서 다운로드하여 교체하세요.

## 🎨 로고 파일 목록 (${TOURNAMENT_CATEGORIES.length}개)

${logoList}

## 🔧 로고 교체 방법

### 1. 공식 로고 다운로드

각 투어의 공식 웹사이트에서 로고를 다운로드하세요:

${TOURNAMENT_CATEGORIES.slice(0, 10)
    .map(
      (cat) =>
        `- **${cat.name}**: ${cat.website || '공식 웹사이트에서 검색'}`
    )
    .join('\n')}

### 2. SVG 형식으로 변환

- PNG/JPG 로고는 [Vectorizer.ai](https://vectorizer.ai/) 또는 [Convertio](https://convertio.co/png-svg/)에서 SVG로 변환
- 또는 Figma, Adobe Illustrator에서 직접 추출

### 3. 다크/라이트 모드 호환성 확보

SVG 파일 내부의 색상을 \`currentColor\`로 변경:

\`\`\`svg
<!-- 변경 전 -->
<path fill="#000000" d="M..."/>

<!-- 변경 후 -->
<path fill="currentColor" d="M..."/>
\`\`\`

### 4. 파일 교체

플레이스홀더를 실제 로고로 교체:

\`\`\`bash
# 예: WSOP 로고 교체
mv wsop-logo.svg public/logos/wsop.svg
\`\`\`

## 📐 권장 사양

- **포맷**: SVG (벡터 형식)
- **크기**: 최소 100x40px (비율 자유)
- **색상**: \`currentColor\` 사용 (테마 자동 적응)
- **파일 크기**: 50KB 미만 권장
- **투명 배경**: 권장

## 🔍 로고 소스 찾기

### 공식 웹사이트
각 투어의 공식 사이트 Press Kit/Media 섹션 확인

### 오픈 소스 로고
- [Wikimedia Commons](https://commons.wikimedia.org/)
- [Brands of the World](https://www.brandsoftheworld.com/)

### 저작권 주의
- 로고 사용 전 라이선스 확인
- 상업적 사용 시 허가 필요 여부 체크

## 🎯 로고 사용 위치

로고는 다음 세 곳에 자동으로 표시됩니다:

1. **Archive 카테고리 필터 버튼** (16x16px)
2. **Tournament/Event 카드** (24x24px)
3. **Folder 리스트** (24x24px)

## 🤖 자동 생성 스크립트

플레이스홀더 재생성:

\`\`\`bash
npx tsx scripts/generate-placeholder-logos.ts
\`\`\`

## 📝 참고

- 로고 파일명은 \`tournament-categories.ts\`의 \`id\` 필드와 일치해야 합니다
- 새 투어 추가 시 해당 ID로 SVG 파일 생성
- 플레이스홀더는 자동으로 건너뛰어짐 (기존 파일 보존)
`

  fs.writeFileSync(readmePath, readmeContent, 'utf-8')
  console.log(`\n✓ Updated: ${readmePath}`)
}

/**
 * 메인 실행
 */
function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Tournament Logo Generator')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  ensureLogosDirectory()
  generateAllLogos()
  updateReadme()

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  ✅ Done!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n📌 Next steps:')
  console.log('   1. Check: public/logos/README.md')
  console.log('   2. Replace placeholder logos with real ones')
  console.log('   3. Ensure logos use "currentColor" for dark/light mode\n')
}

// 스크립트 실행
main()

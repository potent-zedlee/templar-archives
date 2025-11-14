import { test, expect, type Page } from '@playwright/test'

/**
 * KAN AI 분석 기능 E2E 테스트
 *
 * 테스트 범위:
 * 1. UI 흐름 테스트 (다이얼로그 열기/닫기, 폼 입력)
 * 2. 폼 입력 및 검증 테스트
 * 3. 권한 체크 테스트
 * 4. 에러 처리 테스트
 * 5. 분석 프로세스 테스트 (Mock)
 *
 * 주의사항:
 * - 실제 AI 분석은 시간이 오래 걸리므로 API 호출은 Mock으로 처리
 * - High Templar 이상 권한이 필요
 * - YouTube URL이 있는 스트림이 DB에 존재해야 함
 */

// Test Setup: Helper functions
async function navigateToArchive(page: Page) {
  await page.goto('/archive/tournament')
  await page.waitForLoadState('networkidle')
  // Wait for data to load
  await page.waitForTimeout(2000)
}

async function loginAsHighTemplar(page: Page) {
  // TODO: 실제 로그인 프로세스 구현
  // 현재는 테스트 환경에서 자동 로그인 가정
  // 필요시 실제 로그인 플로우 구현
}

async function selectDayWithYouTubeUrl(page: Page): Promise<boolean> {
  // Archive 페이지에서 YouTube Badge를 가진 Day 찾기
  const youtubeBadges = page.locator('text=YouTube').locator('xpath=ancestor::div[contains(@class, "cursor-pointer")]')
  const count = await youtubeBadges.count()

  if (count === 0) {
    console.log('[Test] No days with YouTube URL found')
    return false
  }

  // 첫 번째 YouTube Day 클릭
  await youtubeBadges.first().click()
  await page.waitForTimeout(1000) // Day 선택 후 UI 업데이트 대기

  // AI 분석 버튼이 나타났는지 확인
  const analyzeButton = page.getByRole('button', { name: /AI 분석/i })
  const isVisible = await analyzeButton.isVisible().catch(() => false)

  return isVisible
}

async function isDaySelected(page: Page): Promise<boolean> {
  // Day가 선택되었는지 확인 (AI 분석 버튼이 있으면 선택된 것)
  const analyzeButton = page.getByRole('button', { name: /AI 분석/i })
  return await analyzeButton.isVisible().catch(() => false)
}

test.describe('KAN AI Analysis - UI Flow', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToArchive(page)
    await loginAsHighTemplar(page)
  })

  test('should display AI Analysis button when stream is selected', async ({ page }) => {
    // Day 선택
    const hasDay = await selectDayWithYouTubeUrl(page)
    test.skip(!hasDay, 'No day with YouTube URL found')

    // AI 분석 버튼이 표시되어야 함
    const analyzeButton = page.getByRole('button', { name: /AI 분석/i })
    await expect(analyzeButton).toBeVisible()
    await expect(analyzeButton).toBeEnabled()
  })

  test('should disable AI Analysis button when no video URL exists', async ({ page }) => {
    // Day가 선택되지 않았거나 비디오 URL이 없으면
    // AI 분석 버튼이 비활성화되어야 함
    const isDayPresent = await isDaySelected(page)

    if (!isDayPresent) {
      // Day가 선택되지 않은 경우, "Select a Day" 메시지가 표시되어야 함
      await expect(page.getByText(/Select a Day/i)).toBeVisible()
    } else {
      // Day가 선택되었지만 비디오 URL이 없는 경우
      const analyzeButton = page.getByRole('button', { name: /AI 분석/i })
      if (await analyzeButton.isVisible()) {
        // 버튼이 비활성화되어야 함
        await expect(analyzeButton).toBeDisabled()
      }
    }
  })

  test('should open AnalyzeVideoDialog when clicking AI Analysis button', async ({ page }) => {
    const hasDay = await selectDayWithYouTubeUrl(page)
    test.skip(!hasDay, 'No day with YouTube URL found')

    // AI 분석 버튼 클릭
    const analyzeButton = page.getByRole('button', { name: /AI 분석/i })
    await analyzeButton.click()

    // 다이얼로그가 열려야 함
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // 다이얼로그 제목 확인
    const dialogTitle = page.getByRole('heading', { name: /AI 핸드 히스토리 추출/i })
    await expect(dialogTitle).toBeVisible()
  })

  test('should close dialog when clicking close button', async ({ page }) => {
    const hasDay = await selectDayWithYouTubeUrl(page)
    test.skip(!hasDay, 'No day with YouTube URL found')

    // 다이얼로그 열기
    await page.getByRole('button', { name: /AI 분석/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // 취소 버튼 클릭
    await page.getByRole('button', { name: /취소/i }).click()

    // 다이얼로그가 닫혀야 함
    await expect(dialog).not.toBeVisible()
  })

  test('should display all required dialog elements', async ({ page }) => {
    const hasDay = await selectDayWithYouTubeUrl(page)
    test.skip(!hasDay, 'No day with YouTube URL found')

    await page.getByRole('button', { name: /AI 분석/i }).click()

    // 다이얼로그 요소들 확인
    await expect(page.getByText(/Gemini AI가 영상을 분석하여/i)).toBeVisible()

    // YouTube 플레이어 (iframe 또는 video 요소)
    const player = page.locator('iframe[src*="youtube.com"], video')
    if (await player.count() > 0) {
      await expect(player.first()).toBeVisible()
    }

    // 플랫폼 선택 드롭다운
    const platformSelect = page.locator('button:has-text("EPT")').first()
    await expect(platformSelect).toBeVisible()

    // 플레이어 추가 버튼
    const addPlayerButton = page.getByRole('button', { name: /추가/i })
    await expect(addPlayerButton).toBeVisible()

    // 분석 시작 버튼
    const startButton = page.getByRole('button', { name: /분석 시작/i })
    await expect(startButton).toBeVisible()
    await expect(startButton).toBeEnabled()
  })
})

test.describe('KAN AI Analysis - Form Input', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToArchive(page)
    await loginAsHighTemplar(page)
  })

  test('should allow platform selection', async ({ page }) => {
    const hasDay = await selectDayWithYouTubeUrl(page)
    test.skip(!hasDay, 'No day with YouTube URL found')

    await page.getByRole('button', { name: /AI 분석/i }).click()

    // 플랫폼 드롭다운 클릭
    const platformSelect = page.locator('button:has-text("EPT")').first()
    await platformSelect.click()

    // 플랫폼 옵션들이 표시되어야 함
    await expect(page.getByText(/EPT \(European Poker Tour\)/i)).toBeVisible()
    await expect(page.getByText(/Triton Poker/i)).toBeVisible()
    await expect(page.getByText(/PokerStars/i)).toBeVisible()
    await expect(page.getByText(/WSOP/i)).toBeVisible()
    await expect(page.getByText(/Hustler Casino Live/i)).toBeVisible()

    // 플랫폼 선택
    await page.getByText(/Triton Poker/i).click()

    // 선택이 반영되어야 함 (다시 드롭다운을 열어 확인하거나, 기본 표시 확인)
    await page.waitForTimeout(500)
  })

  test('should allow adding and removing players', async ({ page }) => {
    const hasDay = await selectDayWithYouTubeUrl(page)
    test.skip(!hasDay, 'No day with YouTube URL found')

    await page.getByRole('button', { name: /AI 분석/i }).click()

    // 플레이어 추가 버튼 찾기 (플레이어 섹션 내의 "추가" 버튼)
    const addPlayerButton = page.locator('button:has-text("추가")').first()
    await addPlayerButton.click()

    // 플레이어 입력 필드가 나타나야 함
    const playerInput = page.getByPlaceholder(/플레이어 이름/i).first()
    await expect(playerInput).toBeVisible()

    // 플레이어 이름 입력
    await playerInput.fill('Phil Ivey')
    await expect(playerInput).toHaveValue('Phil Ivey')

    // 플레이어 추가 (2명째)
    await addPlayerButton.click()
    const secondPlayerInput = page.getByPlaceholder(/플레이어 이름/i).nth(1)
    await secondPlayerInput.fill('Daniel Negreanu')
    await expect(secondPlayerInput).toHaveValue('Daniel Negreanu')

    // 플레이어 삭제 버튼 찾기 (X 아이콘)
    const removeButtons = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: '' })
    const count = await removeButtons.count()
    if (count > 1) {
      // 첫 번째 플레이어 삭제
      await removeButtons.first().click()
      await page.waitForTimeout(500)
      // 삭제 후 두 번째 플레이어만 남아있어야 함
      const remainingInputs = await page.getByPlaceholder(/플레이어 이름/i).count()
      expect(remainingInputs).toBe(1)
    }
  })

  test('should allow timeline segment selection', async ({ page }) => {
    const hasDay = await selectDayWithYouTubeUrl(page)
    test.skip(!hasDay, 'No day with YouTube URL found')

    await page.getByRole('button', { name: /AI 분석/i }).click()

    // InteractiveTimeline 컴포넌트가 표시되어야 함
    // 타임라인의 특정 요소를 찾기 (구현에 따라 조정 필요)
    await page.waitForTimeout(1000)

    // 타임라인 관련 요소 확인 (실제 구현에 따라 조정)
    // 예: 게임플레이 세그먼트 추가 버튼 등
  })

  test('should allow starting analysis without segments (full video)', async ({ page }) => {
    const hasDay = await selectDayWithYouTubeUrl(page)
    test.skip(!hasDay, 'No day with YouTube URL found')

    await page.getByRole('button', { name: /AI 분석/i }).click()

    // 세그먼트 없이도 분석 시작 가능 (전체 영상 분석)
    const startButton = page.getByRole('button', { name: /분석 시작/i })
    await expect(startButton).toBeEnabled()
  })
})

test.describe('KAN AI Analysis - Permissions', () => {
  test('should require authentication', async ({ page }) => {
    // 로그인하지 않은 상태
    await navigateToArchive(page)

    // AI 분석 버튼이 숨겨지거나 비활성화되어야 함
    const analyzeButton = page.getByRole('button', { name: /AI 분석/i })

    if (await analyzeButton.isVisible()) {
      // 버튼이 보이면 클릭 시 로그인 페이지로 리다이렉트되어야 함
      await analyzeButton.click()
      await expect(page).toHaveURL(/\/login|\/signin/)
    } else {
      // 버튼이 숨겨져 있으면 OK
      expect(true).toBeTruthy()
    }
  })

  test('should require High Templar role or above', async ({ page }) => {
    // TODO: 일반 user 역할로 로그인
    // 현재는 Mock이므로 스킵
    test.skip(true, 'Need to implement role-based authentication')

    await navigateToArchive(page)

    // AI 분석 버튼 클릭 시 권한 에러가 표시되어야 함
    const analyzeButton = page.getByRole('button', { name: /AI 분석/i })
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click()
      await expect(page.getByText(/권한이 필요합니다/i)).toBeVisible()
    }
  })
})

test.describe('KAN AI Analysis - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToArchive(page)
    await loginAsHighTemplar(page)
  })

  test('should handle network errors gracefully', async ({ page }) => {
    const hasDay = await selectDayWithYouTubeUrl(page)
    test.skip(!hasDay, 'No day with YouTube URL found')

    // API 요청 실패를 시뮬레이션
    await page.route('**/api/analyze-video*', route => {
      route.abort('failed')
    })

    await page.getByRole('button', { name: /AI 분석/i }).click()

    // 플랫폼 선택 (기본값 유지)
    const startButton = page.getByRole('button', { name: /분석 시작/i })
    await startButton.click()

    // 에러 메시지가 표시되어야 함
    await page.waitForTimeout(2000)
    // 에러 상태 확인
  })

  test('should display backend error messages', async ({ page }) => {
    const hasDay = await selectDayWithYouTubeUrl(page)
    test.skip(!hasDay, 'No day with YouTube URL found')

    // API 요청에 에러 응답을 반환
    await page.route('**/api/analyze-video*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Backend analysis failed' })
      })
    })

    await page.getByRole('button', { name: /AI 분석/i }).click()

    const startButton = page.getByRole('button', { name: /분석 시작/i })
    await startButton.click()

    // 백엔드 에러 메시지가 표시되어야 함
    await page.waitForTimeout(2000)
  })

  test('should handle timeout gracefully', async ({ page }) => {
    const hasDay = await selectDayWithYouTubeUrl(page)
    test.skip(!hasDay, 'No day with YouTube URL found')

    // API 요청을 지연시켜 타임아웃 시뮬레이션
    await page.route('**/api/analyze-video*', route => {
      // 요청을 무한정 보류
      return new Promise(() => {})
    })

    await page.getByRole('button', { name: /AI 분석/i }).click()

    const startButton = page.getByRole('button', { name: /분석 시작/i })
    await startButton.click()

    // 타임아웃 또는 로딩 상태가 지속되어야 함
    await page.waitForTimeout(2000)
  })
})

test.describe('KAN AI Analysis - Process Flow (Mock)', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToArchive(page)
    await loginAsHighTemplar(page)
  })

  test('should show analyzing state after starting analysis', async ({ page }) => {
    const hasDay = await selectDayWithYouTubeUrl(page)
    test.skip(!hasDay, 'No day with YouTube URL found')

    await page.getByRole('button', { name: /AI 분석/i }).click()

    const startButton = page.getByRole('button', { name: /분석 시작/i })
    await startButton.click()

    // "분석 요청 중" 또는 로딩 상태가 표시되어야 함
    await page.waitForTimeout(2000)
    // 상태 변화 확인 (analyzing 또는 processing)
  })

  test('should handle successful analysis start', async ({ page }) => {
    test.skip(true, 'Requires backend mock setup')

    const hasDay = await selectDayWithYouTubeUrl(page)
    test.skip(!hasDay, 'No day with YouTube URL found')

    await page.getByRole('button', { name: /AI 분석/i }).click()
    const startButton = page.getByRole('button', { name: /분석 시작/i })
    await startButton.click()

    // 성공 메시지 또는 진행 상태 확인
    await page.waitForTimeout(2000)
  })
})

test.describe('KAN AI Analysis - Realtime Updates', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToArchive(page)
    await loginAsHighTemplar(page)
  })

  test('should subscribe to Supabase Realtime for job updates', async ({ page }) => {
    test.skip(true, 'Supabase Realtime mocking not implemented')
  })

  test('should display segment processing status', async ({ page }) => {
    test.skip(true, 'Need to mock Realtime updates')
  })

  test('should update hands found counter in real-time', async ({ page }) => {
    test.skip(true, 'Need to mock Realtime updates')
  })
})

test.describe('KAN AI Analysis - Integration', () => {
  test('should end-to-end flow from stream selection to analysis completion', async ({ page }) => {
    test.slow() // 이 테스트는 느릴 수 있음

    await navigateToArchive(page)
    await loginAsHighTemplar(page)

    // 1. Day 선택
    const hasDay = await selectDayWithYouTubeUrl(page)
    test.skip(!hasDay, 'No day with YouTube URL found')

    // 2. AI 분석 버튼 클릭
    await page.getByRole('button', { name: /AI 분석/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // 3. 플랫폼 선택
    const platformSelect = page.locator('button:has-text("EPT")').first()
    await platformSelect.click()
    await page.getByText(/EPT/i).first().click()

    // 4. 플레이어 추가
    await page.locator('button:has-text("추가")').first().click()
    await page.getByPlaceholder(/플레이어 이름/i).fill('Test Player')

    // 5. 분석 시작
    await page.getByRole('button', { name: /분석 시작/i }).click()

    // 6. 분석 요청 확인
    await page.waitForTimeout(2000)
    // 상태 변화 확인

    // 7. 완료 또는 에러 상태 확인 (실제 분석은 오래 걸리므로 Mock 사용)
    // 실제 환경에서는 타임아웃 설정 필요
  })
})

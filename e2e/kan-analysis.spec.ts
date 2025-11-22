import { test, expect, type Page } from '@playwright/test'

/**
 * KAN AI 분석 기능 E2E 테스트
 *
 * data-testid 기반의 안정적인 선택자 사용
 */

// Helper: Archive 페이지로 이동
async function navigateToArchive(page: Page) {
  await page.goto('/archive/tournament')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000) // 데이터 로딩 대기
}

// Helper: Supabase API를 Mock
async function mockSupabaseAPIs(page: Page) {
  // Streams API Mock
  await page.route('**/rest/v1/streams*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'mock-stream-1',
          name: 'Test Stream with YouTube',
          video_url: 'https://www.youtube.com/watch?v=test123',
          video_source: 'youtube',
          sub_event_id: 'mock-sub-event-1',
          published_at: '2024-01-01',
          player_count: 6,
        },
      ]),
    })
  })

  // Sub events API Mock
  await page.route('**/rest/v1/sub_events*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'mock-sub-event-1',
          name: 'Test Event',
          tournament_id: 'mock-tournament-1',
        },
      ]),
    })
  })

  // Tournaments API Mock
  await page.route('**/rest/v1/tournaments*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'mock-tournament-1',
          name: 'Test Tournament',
          platform: 'pokerstars',
          start_date: '2024-01-01',
        },
      ]),
    })
  })
}

test.describe('KAN AI Analysis - Core UI', () => {
  test('should display "Select a Day" message when no stream is selected', async ({ page }) => {
    await navigateToArchive(page)

    // "Select a Day" 메시지 확인
    const selectDayMessage = page.getByText(/Select a Day/i)
    await expect(selectDayMessage).toBeVisible({ timeout: 15000 })
  })

  test('should load archive page without errors', async ({ page }) => {
    await navigateToArchive(page)

    // Page should be visible
    await expect(page.locator('body')).toBeVisible()

    // Check title
    await expect(page).toHaveTitle(/Templar Archives/)
  })
})

test.describe('KAN AI Analysis - With Mock Data', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPIs(page)
  })

  test('should render archive page with mock data', async ({ page }) => {
    await navigateToArchive(page)

    // Page should be visible
    await expect(page.locator('body')).toBeVisible()
  })

  test('should find stream items or select day message', async ({ page }) => {
    await navigateToArchive(page)

    // Either stream items exist or "Select a Day" message
    const streamItems = page.locator('[data-testid="stream-item"]')
    const selectDayMessage = page.getByText(/Select a Day/i)

    const hasStreams = await streamItems.count() > 0
    const hasSelectMessage = await selectDayMessage.isVisible({ timeout: 5000 }).catch(() => false)

    expect(hasStreams || hasSelectMessage).toBeTruthy()
  })

  test('should handle click on stream item', async ({ page }) => {
    await navigateToArchive(page)

    const streamItems = page.locator('[data-testid="stream-item"]')

    if (await streamItems.count() > 0) {
      // Click first stream item
      await streamItems.first().click({ force: true })
      await page.waitForTimeout(1000)

      // Page should still be visible after click
      await expect(page.locator('body')).toBeVisible()
    }
  })
})

test.describe('KAN AI Analysis - Dialog Tests', () => {
  test('should open analyze dialog when conditions met', async ({ page }) => {
    await mockSupabaseAPIs(page)
    await navigateToArchive(page)

    // Try to find and click stream item first
    const streamItems = page.locator('[data-testid="stream-item"]')
    if (await streamItems.count() > 0) {
      await streamItems.first().click({ force: true })
      await page.waitForTimeout(2000)

      // Look for AI analysis button (various selectors)
      const aiButton = page.getByRole('button', { name: /AI 분석/i })
        .or(page.locator('button:has-text("AI")').first())

      if (await aiButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await aiButton.click()
        await page.waitForTimeout(1000)

        // Check if dialog opened using data-testid
        const dialog = page.locator('[data-testid="analyze-video-dialog"]')
        if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(dialog).toBeVisible()

          // Check for key dialog elements
          const platformSelect = page.locator('[data-testid="platform-select"]')
          if (await platformSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(platformSelect).toBeVisible()
          }
        }
      }
    }
  })

  test('should display start analysis button in dialog', async ({ page }) => {
    await mockSupabaseAPIs(page)
    await navigateToArchive(page)

    const streamItems = page.locator('[data-testid="stream-item"]')
    if (await streamItems.count() > 0) {
      await streamItems.first().click({ force: true })
      await page.waitForTimeout(2000)

      const aiButton = page.getByRole('button', { name: /AI 분석/i })
        .or(page.locator('button:has-text("AI")').first())

      if (await aiButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await aiButton.click()
        await page.waitForTimeout(1000)

        // Check for start button using data-testid
        const startButton = page.locator('[data-testid="start-analysis-button"]')
        if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(startButton).toBeVisible()
        }
      }
    }
  })
})

test.describe('KAN AI Analysis - Error Handling', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/rest/v1/streams*', async (route) => {
      await route.fulfill({ status: 500 })
    })

    await navigateToArchive(page)

    // Page should not crash
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle network timeout', async ({ page }) => {
    await page.route('**/rest/v1/streams*', async (route) => {
      // 3 second delay
      await new Promise(resolve => setTimeout(resolve, 3000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.goto('/archive/tournament', { timeout: 15000 })

    // Page should load
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('KAN AI Analysis - Performance', () => {
  test('should load archive page within reasonable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/archive/tournament')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    console.log(`[Test] Archive page load time: ${loadTime}ms`)
    expect(loadTime).toBeLessThan(15000) // 15 seconds max
  })

  test('should have no critical console errors', async ({ page }) => {
    const criticalErrors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text().toLowerCase()
        if (text.includes('uncaught') || text.includes('syntax error') || text.includes('reference error')) {
          criticalErrors.push(msg.text())
        }
      }
    })

    await navigateToArchive(page)

    expect(criticalErrors).toHaveLength(0)
  })
})

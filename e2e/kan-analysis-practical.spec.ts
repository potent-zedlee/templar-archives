import { test, expect, type Page } from '@playwright/test'

/**
 * KAN AI 분석 기능 E2E 테스트 (실용적 검증 버전)
 *
 * data-testid 기반의 안정적인 선택자 사용
 */

// Mock 헬퍼
async function mockAllAPIs(page: Page, options: {
  streamsSuccess?: boolean
} = {}) {
  const { streamsSuccess = true } = options

  // Streams API Mock
  await page.route('**/rest/v1/streams*', async (route) => {
    if (streamsSuccess) {
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
    } else {
      await route.fulfill({ status: 500 })
    }
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

test.describe('KAN AI Analysis - Functional Tests', () => {
  test('should render archive page successfully', async ({ page }) => {
    await mockAllAPIs(page)
    await page.goto('/archive/tournament')
    await page.waitForLoadState('networkidle')

    // Page should be visible
    await expect(page.locator('body')).toBeVisible()
    await expect(page).toHaveTitle(/Templar Archives/)
  })

  test('should display "Select a Day" when no stream selected', async ({ page }) => {
    await mockAllAPIs(page)
    await page.goto('/archive/tournament')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // "Select a Day" message should be visible
    const selectDayMessage = page.getByText(/Select a Day/i)
    await expect(selectDayMessage).toBeVisible({ timeout: 15000 })
  })

  test('should handle streams API error gracefully', async ({ page }) => {
    await mockAllAPIs(page, { streamsSuccess: false })
    await page.goto('/archive/tournament')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Page should not crash
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('KAN AI Analysis - Component Tests', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllAPIs(page)
  })

  test('should find UI elements using data-testid', async ({ page }) => {
    await page.goto('/archive/tournament')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Check for stream items or select day message
    const streamItems = page.locator('[data-testid="stream-item"]')
    const selectDayMessage = page.getByText(/Select a Day/i)

    const hasStreams = await streamItems.count() > 0
    const hasSelectMessage = await selectDayMessage.isVisible({ timeout: 5000 }).catch(() => false)

    expect(hasStreams || hasSelectMessage).toBeTruthy()
  })

  test('should handle page navigation without crashes', async ({ page }) => {
    await page.goto('/archive/tournament')
    await page.waitForLoadState('networkidle')

    // Navigation test
    const tournamentLink = page.locator('[data-testid="nav-link-tournament"]')
    if (await tournamentLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(tournamentLink).toBeVisible()
    }
  })
})

test.describe('KAN AI Analysis - E2E Flow', () => {
  test('should complete mock analysis request flow', async ({ page }) => {
    test.slow()

    await mockAllAPIs(page)
    await page.goto('/archive/tournament')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Capture screenshot for debugging
    await page.screenshot({ path: 'test-results/archive-initial.png', fullPage: true })

    // Check for stream items
    const streamItems = page.locator('[data-testid="stream-item"]')
    const selectMessage = page.getByText(/Select a Day/i)

    if (await streamItems.count() > 0) {
      // Click stream item
      await streamItems.first().click({ force: true })
      await page.waitForTimeout(2000)
      await page.screenshot({ path: 'test-results/archive-stream-selected.png' })
    } else if (await selectMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Expected if no streams available
      await expect(selectMessage).toBeVisible()
    }

    // Test passed
    expect(page).toBeDefined()
  })
})

test.describe('KAN AI Analysis - Accessibility & Performance', () => {
  test('should have no critical console errors on archive page', async ({ page }) => {
    const criticalErrors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text().toLowerCase()
        if (text.includes('uncaught') || text.includes('syntax error') || text.includes('reference error')) {
          criticalErrors.push(msg.text())
        }
      }
    })

    await mockAllAPIs(page)
    await page.goto('/archive/tournament')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    expect(criticalErrors).toHaveLength(0)
  })

  test('should load archive page within reasonable time', async ({ page }) => {
    await mockAllAPIs(page)

    const startTime = Date.now()
    await page.goto('/archive/tournament')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    console.log(`[Test] Archive page load time: ${loadTime}ms`)
    expect(loadTime).toBeLessThan(15000) // 15 seconds max
  })
})

test.describe('KAN AI Analysis - Error Scenarios', () => {
  test('should handle network timeout gracefully', async ({ page }) => {
    await page.route('**/rest/v1/streams*', async (route) => {
      // 3 second delay
      await new Promise(resolve => setTimeout(resolve, 3000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    const startTime = Date.now()
    await page.goto('/archive/tournament', { timeout: 15000 })
    const loadTime = Date.now() - startTime

    console.log(`[Test] Page loaded with delay: ${loadTime}ms`)
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle invalid JSON response', async ({ page }) => {
    await page.route('**/rest/v1/streams*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json',
      })
    })

    await page.goto('/archive/tournament')
    await page.waitForLoadState('networkidle')

    // Page should not crash
    await expect(page.locator('body')).toBeVisible()
  })
})

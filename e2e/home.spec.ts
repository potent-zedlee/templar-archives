import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/about')

    // Check page title
    await expect(page).toHaveTitle(/Templar Archives/)

    // Check for main navigation (exact matches)
    await expect(page.getByRole('link', { name: 'ABOUT', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'NEWS', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'PLAYERS', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'FORUM', exact: true })).toBeVisible()
  })

  test('should navigate to Archive page', async ({ page }) => {
    await page.goto('/about')
    await page.waitForLoadState('networkidle')

    // ARCHIVE 드롭다운 영역에 마우스 호버
    const archiveNav = page.locator('nav').getByText('ARCHIVE')
    await archiveNav.hover()

    // 서브메뉴가 나타날 때까지 대기 (WebKit은 느림)
    await page.waitForTimeout(2000)

    // Tournament 링크가 보이는지 확인
    const tournamentLink = page.getByRole('link', { name: 'Tournament', exact: true })
    await expect(tournamentLink).toBeVisible({ timeout: 10000 })

    // WebKit-specific: 클릭 가능 상태까지 대기
    await page.waitForTimeout(1000)

    // Tournament 링크 클릭 (WebKit을 위한 force 옵션)
    await tournamentLink.click({ force: true, timeout: 15000 })

    // Wait for navigation (WebKit은 네비게이션이 느림)
    await page.waitForURL('/archive/tournament', { timeout: 30000 })
    await page.waitForLoadState('networkidle')

    // Verify we're on the archive page
    await expect(page).toHaveURL('/archive/tournament')
  })

  test('should navigate to Community page', async ({ page }) => {
    await page.goto('/about')
    await page.waitForLoadState('networkidle')

    // Click Forum link (exact match)
    const forumLink = page.getByRole('link', { name: 'FORUM', exact: true })
    await expect(forumLink).toBeVisible({ timeout: 10000 })

    // WebKit-specific: 클릭 가능 상태까지 대기
    await page.waitForTimeout(1000)

    // WebKit을 위한 force 클릭
    await forumLink.click({ force: true, timeout: 15000 })

    // Wait for navigation (WebKit은 네비게이션이 느림)
    await page.waitForURL('/community', { timeout: 30000 })
    await page.waitForLoadState('networkidle')

    // Verify we're on the community page
    await expect(page).toHaveURL('/community')
  })

  test('should have responsive layout', async ({ page }) => {
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/about')
    await expect(page.getByRole('link', { name: 'ABOUT', exact: true })).toBeVisible()

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/about')
    // Page should load without errors
    await expect(page.locator('body')).toBeVisible()
  })
})

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

    // ARCHIVE 드롭다운 영역에 마우스 호버
    const archiveNav = page.locator('nav').getByText('ARCHIVE')
    await archiveNav.hover()

    // 서브메뉴가 나타날 때까지 대기
    await page.waitForTimeout(500)

    // Tournament 링크 클릭
    await page.getByRole('link', { name: 'Tournament', exact: true }).click()

    // Wait for navigation
    await page.waitForURL('/archive/tournament')

    // Verify we're on the archive page
    await expect(page).toHaveURL('/archive/tournament')
  })

  test('should navigate to Community page', async ({ page }) => {
    await page.goto('/about')

    // Click Forum link (exact match)
    await page.getByRole('link', { name: 'FORUM', exact: true }).click()

    // Wait for navigation
    await page.waitForURL('/community')

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

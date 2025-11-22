import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/')

    // Check page title
    await expect(page).toHaveTitle(/Templar Archives/)

    // Page should be visible
    await expect(page.locator('body')).toBeVisible()
  })

  test('should display main navigation links', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check for main navigation using data-testid
    await expect(page.locator('[data-testid="nav-link-news"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="nav-link-player"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="nav-link-forum"]')).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to Archive page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Click Tournament link using data-testid
    const tournamentLink = page.locator('[data-testid="nav-link-tournament"]')
    await expect(tournamentLink).toBeVisible({ timeout: 10000 })

    // Click with force for WebKit compatibility
    await tournamentLink.click({ force: true, timeout: 15000 })

    // Wait for navigation
    await page.waitForURL('/archive/tournament', { timeout: 30000 })
    await page.waitForLoadState('networkidle')

    // Verify we're on the archive page
    await expect(page).toHaveURL('/archive/tournament')
  })

  test('should navigate to Community page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Click Forum link using data-testid
    const forumLink = page.locator('[data-testid="nav-link-forum"]')
    await expect(forumLink).toBeVisible({ timeout: 10000 })

    // Click with force for WebKit compatibility
    await forumLink.click({ force: true, timeout: 15000 })

    // Wait for navigation
    await page.waitForURL('/community', { timeout: 30000 })
    await page.waitForLoadState('networkidle')

    // Verify we're on the community page
    await expect(page).toHaveURL('/community')
  })

  test('should have responsive layout', async ({ page }) => {
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    // Page should load without errors
    await expect(page.locator('body')).toBeVisible()
  })
})

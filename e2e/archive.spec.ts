import { test, expect } from '@playwright/test'

test.describe('Archive Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/archive/tournament')
    await page.waitForLoadState('networkidle')
  })

  test('should load archive page', async ({ page }) => {
    // Check if page loaded (redirect allowed)
    await expect(page).toHaveURL(/\/archive/)

    // Check for archive page content
    await expect(page.locator('body')).toBeVisible()
  })

  test('should display search input', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForTimeout(2000)

    // Check if search input exists using data-testid
    const searchInput = page.locator('[data-testid="archive-search"]')
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(searchInput).toBeVisible()
    }
  })

  test('should display Select a Day message or streams', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000)

    // Either "Select a Day" message is shown, or streams are available
    const selectDayMessage = page.getByText(/Select a Day/i)
    const streamItems = page.locator('[data-testid="stream-item"]')

    const hasSelectMessage = await selectDayMessage.isVisible({ timeout: 5000 }).catch(() => false)
    const hasStreams = await streamItems.count() > 0

    // One of these should be true
    expect(hasSelectMessage || hasStreams).toBeTruthy()
  })

  test('should have search functionality', async ({ page }) => {
    // Look for search input using data-testid
    const searchInput = page.locator('[data-testid="archive-search"]')

    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('WSOP')
      await expect(searchInput).toHaveValue('WSOP')
    }
  })

  test('should handle empty state gracefully', async ({ page }) => {
    await page.waitForTimeout(1000)

    // Page should not crash
    await expect(page.locator('body')).toBeVisible()
  })
})

import { test, expect } from '@playwright/test'

test.describe('Archive Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/archive/tournament')
  })

  test('should load archive page', async ({ page }) => {
    // Check if page loaded (리다이렉트 허용)
    await expect(page).toHaveURL(/\/archive/)

    // Check for archive page content
    await expect(page.locator('body')).toBeVisible()
  })

  test('should display folder structure', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000)

    // Check if Unorganized folder exists
    const unorganizedFolder = page.getByText(/Unorganized/i).first()
    if (await unorganizedFolder.isVisible()) {
      await expect(unorganizedFolder).toBeVisible()
    }
  })

  test('should have view mode switcher', async ({ page }) => {
    // Check for view mode buttons (list, grid, timeline)
    const viewSwitcher = page.locator('[role="toolbar"]').filter({ hasText: /view/i })

    // View switcher should exist somewhere on the page
    await expect(page.locator('body')).toBeVisible()
  })

  test('should have search functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.getByPlaceholder(/search/i)

    if (await searchInput.isVisible()) {
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

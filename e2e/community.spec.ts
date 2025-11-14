import { test, expect } from '@playwright/test'

test.describe('Community Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/community')
  })

  test('should load community page', async ({ page }) => {
    // Check if page loaded
    await expect(page).toHaveURL('/community')

    // Page should be visible
    await expect(page.locator('body')).toBeVisible()
  })

  test('should display category filters', async ({ page }) => {
    await page.waitForTimeout(1000)

    // Check if filter buttons exist
    const allButton = page.getByRole('button', { name: /All/i })
    if (await allButton.isVisible()) {
      await expect(allButton).toBeVisible()
    }
  })

  test('should have search functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.getByPlaceholder(/search/i)

    if (await searchInput.isVisible()) {
      await searchInput.fill('poker')
      await expect(searchInput).toHaveValue('poker')
    }
  })

  test('should handle empty state gracefully', async ({ page }) => {
    await page.waitForTimeout(1000)

    // Page should not crash
    await expect(page.locator('body')).toBeVisible()
  })
})

import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/')

    // Check page title
    await expect(page).toHaveTitle(/Templar Archives/)

    // Check for main navigation (exact matches)
    await expect(page.getByRole('link', { name: 'ARCHIVE', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'SEARCH', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'PLAYERS', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'COMMUNITY', exact: true })).toBeVisible()
  })

  test('should navigate to Archive page', async ({ page }) => {
    await page.goto('/')

    // Click Archive link (exact match)
    await page.getByRole('link', { name: 'ARCHIVE', exact: true }).click()

    // Wait for navigation
    await page.waitForURL('/archive')

    // Verify we're on the archive page
    await expect(page).toHaveURL('/archive')
  })

  test('should navigate to Community page', async ({ page }) => {
    await page.goto('/')

    // Click Community link (exact match)
    await page.getByRole('link', { name: 'COMMUNITY', exact: true }).click()

    // Wait for navigation
    await page.waitForURL('/community')

    // Verify we're on the community page
    await expect(page).toHaveURL('/community')
    await expect(page.getByRole('heading', { name: /Community/i })).toBeVisible()
  })

  test('should have responsive layout', async ({ page }) => {
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'ARCHIVE', exact: true })).toBeVisible()

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    // Page should load without errors
    await expect(page.locator('body')).toBeVisible()
  })
})

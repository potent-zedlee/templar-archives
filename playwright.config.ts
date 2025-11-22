import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 설정
 * E2E 테스트 실행 환경 설정
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    // WebKit은 CI에서 React 하이드레이션 이슈로 인해 불안정하므로 로컬 테스트에만 사용
    // 사파리 테스트가 필요한 경우: npx playwright test --project=webkit
    ...(process.env.CI
      ? []
      : [
          {
            name: 'webkit',
            use: {
              ...devices['Desktop Safari'],
              navigationTimeout: 60000,
              actionTimeout: 30000,
              launchOptions: {
                slowMo: 100,
              },
            },
          },
        ]),
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2분
  },
})

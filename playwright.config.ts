import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.{ts,js}',
	globalSetup: './e2e/global-setup.ts',
	workers: 1,
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: 0,
	timeout: 60_000,
	expect: { timeout: 10_000 },
	reporter: 'list',
	use: {
		baseURL: 'http://localhost:4173',
		viewport: { width: 1280, height: 800 },
		trace: 'retain-on-failure'
	},
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
	webServer: {
		command: 'npm run build && npm run preview -- --port 4173',
		port: 4173,
		reuseExistingServer: false,
		env: {
			APP_PASSWORD: 'e2e-password-1',
			DATABASE_PATH: 'data/e2e.sqlite',
			APP_TIME_ZONE: 'Europe/Rome'
		}
	}
});

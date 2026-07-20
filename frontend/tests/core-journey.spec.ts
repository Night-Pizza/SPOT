import { expect, test, type Page } from '@playwright/test';

const baseUrl = 'http://127.0.0.1:5173';

async function mockCoreApi(page: Page) {
  await page.addInitScript(() => {
    document.cookie = 'XSRF-TOKEN=test-token; path=/';
  });

  await page.route('**/api/user/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Not authenticated',
      }),
    });
  });

  await page.route('**/api/user/login', async (route) => {
    const payload = route.request().postDataJSON() as { email: string };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        email: payload.email,
        faceRegistered: true,
      }),
    });
  });

  await page.route('**/api/session/create', async (route) => {
    const payload = route.request().postDataJSON() as { title: string; password?: string };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 42,
        title: payload.title,
        createdAt: '2026-07-01T12:00:00.000Z',
      }),
    });
  });

  await page.route('**/api/session/42', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/session/42/details', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 42,
        title: 'Integration Testing 101',
        password: 'spot-1234',
        validationTypes: ['PASSWORD', 'GPS'],
        latitude: 55.75,
        longitude: 37.61,
        allowedRadius: 100.0,
        createdAt: '2026-07-01T12:00:00.000Z',
        isActive: true,
      }),
    });
  });
}

test('redirects anonymous users to the login page', async ({ page }) => {
  await mockCoreApi(page);

  await page.goto(`${baseUrl}/sessions`);

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
});

test('logs in and creates a basic code session', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 55.75, longitude: 37.61 });
  await mockCoreApi(page);

  await page.goto(`${baseUrl}/login`);

  await page.getByPlaceholder('name@example.com').fill('prof@example.com');
  await page.getByPlaceholder('password').fill('12345');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /Hello/i })).toContainText('prof@example.com');

  await page.getByRole('button', { name: /Create Session/i }).click();

  await expect(page).toHaveURL(/\/sessions\/create$/);
  await page.locator('.session-mode-choice .ant-radio-button-wrapper').filter({ hasText: 'Code Word session' }).click();
  await page.locator('.session-switch-row').first().getByRole('switch').click();
  await page.getByRole('button', { name: 'Get Location' }).click();
  await page.getByLabel('Session Code').fill('spot-1234');
  await page.getByRole('button', { name: 'Create Session' }).click();

  await expect(page).toHaveURL(/\/sessions\/42$/);
  await page.getByText('Click to name the session').click();
  await page.getByRole('textbox').fill('Integration Testing 101');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Integration Testing 101' })).toBeVisible();
  await expect(page.getByText('Session ID: 42')).toBeVisible();
  await expect(page.getByText('spot-1234')).toBeVisible();
});
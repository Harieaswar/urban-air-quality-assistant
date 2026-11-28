import { test, expect } from '@playwright/test';

const MOCK_GEOCODE = {
  results: [
    {
      id: 1,
      name: 'Salem',
      admin1: 'Tamil Nadu',
      country: 'India',
      latitude: 11.664,
      longitude: 78.146,
    },
  ],
};

const MOCK_AQ = {
  hourly: {
    time: Array.from({ length: 24 }, (_, h) => `2026-11-26T${String(h).padStart(2, '0')}:00`),
    pm2_5: Array.from({ length: 24 }, (_, h) => (h >= 13 && h <= 15 ? 42 : 96)),
    pm10: Array.from({ length: 24 }, () => 110),
  },
};

const MOCK_WEATHER = {
  current: { temperature_2m: 28.4, relative_humidity_2m: 64, wind_speed_10m: 9.2 },
};

test('SmogGuard smoke flow: landing demo -> 4-step wizard -> 10-section report -> print stub', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__printed = false;
    window.print = () => {
      window.__printed = true;
    };
  });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /SmogGuard/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /24-Hour PM2\.5 Forecast/i })).toBeVisible();

  await page.getByRole('button', { name: /Older adults/i }).click();
  await page.getByRole('button', { name: /Sample severe-smog demo/i }).click();

  await page.getByRole('button', { name: /Start 4-Step Wizard|Edit 4-Step Wizard/i }).click();
  await expect(page.getByRole('heading', { name: /1\. Location & Home Setup/i })).toBeVisible();
  await page.getByRole('button', { name: /Next Step/i }).click();

  await expect(page.getByRole('heading', { name: /2\. Family & Priorities/i })).toBeVisible();
  await page.getByRole('button', { name: /Next Step/i }).click();

  await expect(
    page.getByRole('heading', { name: /3\. Rooms, Kitchen & Indoor Sources/i })
  ).toBeVisible();
  await page.getByRole('button', { name: /Next Step/i }).click();

  await expect(
    page.getByRole('heading', { name: /4\. Daily Routine, Energy & Commute/i })
  ).toBeVisible();
  await page.getByRole('button', { name: /Generate Smog & Air Quality Report/i }).click();

  await expect(page.getByRole('heading', { name: /Smog and Air Quality Report/i })).toBeVisible();
  await expect(page.getByText(/10\. Assumptions, Data Sources & Limitations/i)).toBeVisible();
  await expect(page.getByText(/Designated Clean Room/i)).toBeVisible();

  await page.getByRole('button', { name: /Print \/ Save as PDF/i }).click();
  expect(await page.evaluate(() => window.__printed)).toBe(true);
});

test('SmogGuard smoke flow: place search (0.1 deg rounding), offline fallback, JSON import/export & delete data', async ({
  page,
}) => {
  await page.route('https://geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({ json: MOCK_GEOCODE })
  );
  await page.route('https://air-quality-api.open-meteo.com/**', (route) =>
    route.fulfill({ json: MOCK_AQ })
  );
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({ json: MOCK_WEATHER })
  );

  await page.goto('/');
  const combobox = page.getByRole('combobox');
  await combobox.fill('Salem');
  await page.getByRole('option', { name: /Salem/i }).click();
  await expect(page.getByText(/Rounded coords: 11\.7°, 78\.1°/i)).toBeVisible();

  // Offline / failed network fallback verification
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await page.route('https://geocoding-api.open-meteo.com/**', (route) => route.abort());
  await combobox.fill('OfflinePlace');
  await expect(
    page.getByRole('listbox').getByText(/Search unavailable, enter coordinates manually/i)
  ).toBeVisible();

  // Settings JSON Export -> Import -> Delete all data
  await page.goto('/settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export JSON/i }).click(),
  ]);
  expect(download.suggestedFilename()).toContain('smogguard-profile-');

  await page.getByLabel(/Import JSON profile file/i).setInputFiles({
    name: 'imported.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        location: {
          name: 'Tambaram, Tamil Nadu',
          lat: 12.9,
          lon: 80.1,
          homeType: 'apartment',
          cooling: 'ac',
          rentalLimits: true,
        },
      })
    ),
  });
  await expect(page.getByText(/Profile imported/i)).toBeVisible();

  await page.getByRole('button', { name: /Delete all my data/i }).click();
  await page.getByRole('button', { name: /Yes, Delete All My Data/i }).click();
  await expect(page.getByRole('heading', { name: /Household Air Protection/i })).toBeVisible();
});

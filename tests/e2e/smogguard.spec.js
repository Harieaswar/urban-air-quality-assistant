import { test, expect } from '@playwright/test';

test('SmogGuard static flow: landing -> sample demo -> 4-step wizard -> 10-section report', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /SmogGuard/i })).toBeVisible();
  await expect(page.getByText(/24-Hour PM2\.5 Forecast/i)).toBeVisible();

  // Tailor for family member & run sample severe-smog demo
  await page.getByRole('button', { name: /Older adults/i }).click();
  await page.getByRole('button', { name: /Sample severe-smog demo/i }).click();

  // Walk through 4-step wizard
  await page.getByRole('button', { name: /Start 4-Step Wizard|Edit 4-Step Wizard/i }).click();
  await expect(page.getByRole('heading', { name: /1\. Location & Home Setup/i })).toBeVisible();
  await page.getByRole('button', { name: /Next Step/i }).click();

  await expect(page.getByRole('heading', { name: /2\. Family & Priorities/i })).toBeVisible();
  await page.getByRole('button', { name: /Next Step/i }).click();

  await expect(page.getByRole('heading', { name: /3\. Rooms, Kitchen & Indoor Sources/i })).toBeVisible();
  await page.getByRole('button', { name: /Next Step/i }).click();

  await expect(page.getByRole('heading', { name: /4\. Daily Routine, Energy & Commute/i })).toBeVisible();
  await page.getByRole('button', { name: /Generate Smog & Air Quality Report/i }).click();

  await expect(page.getByRole('heading', { name: /Smog and Air Quality Report/i })).toBeVisible();
  await expect(page.getByText(/10\. Assumptions, Data Sources & Limitations/i)).toBeVisible();
  await expect(page.getByText(/Designated Clean Room/i)).toBeVisible();
});

import { test, expect } from '@playwright/test';

test.describe('Plaza demo — production build smoke', () => {
  test('loads, renders the canvas and the live-trace panel', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`console.error: ${msg.text()}`);
    });

    await page.goto('/');
    // Header is visible
    await expect(page.getByText('Agent-DID Plaza')).toBeVisible();
    // Top-left HUD shows current attacker state
    await expect(page.getByText(/Attacker mode (ON|OFF)/)).toBeVisible();
    // Pixi canvas is mounted
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });
    // Live trace panel renders
    await expect(page.getByRole('heading', { name: 'Live trace' })).toBeVisible({
      timeout: 20_000,
    });

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('toggling attacker mode eventually opens the blocked modal', async ({ page }) => {
    await page.goto('/');
    // Wait until the engine is ready (Live trace panel mounted == DIDs created)
    await expect(page.getByRole('heading', { name: 'Live trace' })).toBeVisible({
      timeout: 20_000,
    });
    // Activate attacker mode
    const toggle = page.getByRole('checkbox');
    await toggle.check();
    // The auto-opened BlockedModal should appear within one full loop (~6s)
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Handoff blocked by the SDK')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('tampered-signature').first()).toBeVisible();
    // CTAs present
    await expect(page.getByRole('link', { name: /Read the spec/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Talk to maintainer/ })).toBeVisible();
  });
});

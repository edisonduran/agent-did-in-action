import { test, expect } from '@playwright/test';

test.describe('Plaza gallery + demo — production build smoke', () => {
  test('gallery renders both demos and you can deep-link to one', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`console.error: ${msg.text()}`);
    });

    await page.goto('/');
    await expect(page.getByText('Agent-DID Plaza')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The Plaza Gallery' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The Plaza Shopping Mall' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cold-chain Supply Bots' })).toBeVisible();

    await page.goto('/?demo=shopping-mall');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Live trace' })).toBeVisible({
      timeout: 20_000,
    });

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('attacker mode in the supply-chain demo eventually opens the blocked modal', async ({ page }) => {
    await page.goto('/?demo=supply-chain');
    await expect(page.getByRole('heading', { name: 'Live trace' })).toBeVisible({
      timeout: 20_000,
    });
    const toggle = page.getByRole('checkbox');
    await toggle.check();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Handoff blocked by the SDK')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('manifest-altered').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Read the spec/ })).toBeVisible();
  });
});

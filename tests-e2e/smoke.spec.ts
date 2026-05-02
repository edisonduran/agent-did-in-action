import { test, expect } from '@playwright/test';

const DEMOS = [
  {
    id: 'newsroom-publish-chain',
    title: 'Newsroom Publish Chain',
    tagline:
      'A reporter, fact-checker, editor, and publisher preserve editorial provenance across a four-agent release chain.',
  },
  {
    id: 'pharma-recall-cascade',
    title: 'Pharma Recall Cascade',
    tagline:
      'A manufacturer, regulator, wholesaler, and hospital pharmacy preserve the exact scope of an emergency drug recall.',
  },
  {
    id: 'shopping-mall',
    title: 'The Plaza Shopping Mall',
    tagline:
      'A shopper, a store, and a payment bot exchange signed handoffs in real time.',
  },
  {
    id: 'spaceport-launch-window',
    title: 'Spaceport Launch Window',
    tagline:
      'Weather, range safety, flight control, and the launch gate coordinate a signed go/no-go chain for a launch window.',
  },
  {
    id: 'supply-chain',
    title: 'Cold-chain Supply Bots',
    tagline:
      'A factory, a courier, and a receiver swap signed shipment manifests — and catch a courier that lies.',
  },
];

test.describe('Plaza gallery + demo — production build smoke', () => {
  test('gallery renders all demos, shows dedicated hero art, and you can deep-link to one', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`console.error: ${msg.text()}`);
    });

    await page.goto('/');
    await expect(page.getByText('Agent-DID Plaza')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The Plaza Gallery' })).toBeVisible();
    for (const demo of DEMOS) {
      await expect(page.getByRole('heading', { name: demo.title })).toBeVisible();
    }
    await expect(page.getByAltText('Newsroom Publish Chain preview art')).toBeVisible();
    await expect(page.getByAltText('Spaceport Launch Window preview art')).toBeVisible();
    await expect(page.getByAltText('Pharma Recall Cascade preview art')).toBeVisible();

    await page.goto('/?demo=shopping-mall');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Live trace' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId('hud-demo-context')).toContainText(
      'A shopper, a store, and a payment bot exchange signed handoffs in real time.',
    );

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

  test('gallery selector can open all five demos one by one', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`console.error: ${msg.text()}`);
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'The Plaza Gallery' })).toBeVisible();

    for (const demo of DEMOS) {
      await test.step(`open ${demo.id}`, async () => {
        const card = page.getByTestId(`gallery-card-${demo.id}`);
        await card.scrollIntoViewIfNeeded();
        await card.click();
        await expect(page).toHaveURL(new RegExp(`\\?demo=${demo.id}$`));
        await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText(demo.title)).toBeVisible({ timeout: 15_000 });
        await expect(page.getByTestId('hud-demo-context')).toContainText(demo.tagline);
        await page.getByRole('button', { name: /Gallery/ }).click();
        await expect(page.getByRole('heading', { name: 'The Plaza Gallery' })).toBeVisible();
      });
    }

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });
});

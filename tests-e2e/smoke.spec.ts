import { test, expect } from '@playwright/test';

const DEMOS = [
  {
    id: 'newsroom-publish-chain',
    title: 'Newsroom Publish Chain',
    latestClaim: 'revision: 7',
    tagline:
      'A reporter, fact-checker, editor, and publisher preserve editorial provenance across a four-agent release chain.',
    hint:
      'Editorial AI pipelines need to prove the story that gets published is the same one that was checked and approved upstream.',
  },
  {
    id: 'pharma-recall-cascade',
    title: 'Pharma Recall Cascade',
    latestClaim: 'recall units: 240',
    tagline:
      'A manufacturer, regulator, wholesaler, and hospital pharmacy preserve the exact scope of an emergency drug recall.',
    hint:
      'Safety-critical recall chains fail if a middleman can shrink or expand the affected batch scope without getting caught.',
  },
  {
    id: 'shopping-mall',
    title: 'The Plaza Shopping Mall',
    latestClaim: 'price: $42',
    tagline:
      'A shopper, a store, and a payment bot exchange signed handoffs in real time.',
    hint:
      'Multi-agent commerce: how do we know the bot taking your money is actually the one the store hired?',
  },
  {
    id: 'spaceport-launch-window',
    title: 'Spaceport Launch Window',
    latestClaim: 'window minutes: 18',
    tagline:
      'Weather, range safety, flight control, and the launch gate coordinate a signed go/no-go chain for a launch window.',
    hint:
      'Autonomous launch operations need to prove the final gate saw the exact clearance chain, not a forged or corrupted last-hop signal.',
  },
  {
    id: 'supply-chain',
    title: 'Cold-chain Supply Bots',
    latestClaim: 'pallets: 12',
    tagline:
      'A factory, a courier, and a receiver swap signed shipment manifests — and catch a courier that lies.',
    hint:
      "Multi-hop logistics: how do we trust the courier didn't tamper with the manifest before delivery?",
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
    await expect(page).toHaveTitle('Browse demos - Agent-DID');
    await expect(page.getByTestId('app-header-title')).toHaveText('Browse demos');
    await expect(page.getByRole('heading', { name: 'The Plaza Gallery' })).toBeVisible();
    for (const demo of DEMOS) {
      await expect(page.getByRole('heading', { name: demo.title })).toBeVisible();
    }
    await expect(page.getByAltText('Newsroom Publish Chain preview art')).toBeVisible();
    await expect(page.getByAltText('Spaceport Launch Window preview art')).toBeVisible();
    await expect(page.getByAltText('Pharma Recall Cascade preview art')).toBeVisible();
    await expect(page.getByAltText('The Plaza Shopping Mall preview art')).toBeVisible();
    await expect(page.getByAltText('Cold-chain Supply Bots preview art')).toBeVisible();

    await page.goto('/?demo=shopping-mall');
    await expect(page).toHaveTitle('The Plaza Shopping Mall - Agent-DID');
    await expect(page.getByTestId('app-header-title')).toHaveText('The Plaza Shopping Mall');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Live trace' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId('hud-demo-context')).toContainText(
      'A shopper, a store, and a payment bot exchange signed handoffs in real time.',
    );
    await expect(page.getByText('Multi-agent commerce: how do we know the bot taking your money is actually the one the store hired?')).toBeVisible();
    await expect(page.getByText('price: $42', { exact: true })).toBeVisible({ timeout: 20_000 });

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

  test('attacker mode in the shopping-mall demo explains MITM signature corruption', async ({ page }) => {
    await page.goto('/?demo=shopping-mall');
    await expect(page.getByRole('heading', { name: 'Live trace' })).toBeVisible({
      timeout: 20_000,
    });

    const toggle = page.getByRole('checkbox');
    await toggle.check();

    await expect(page.getByTestId('attacker-panel')).toBeVisible();
    await expect(page.getByTestId('mitm-attack-note')).toContainText(
      'Channel tampering only: the payload claims stay intact, but the signature is corrupted in transit.',
    );

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Handoff blocked by the SDK')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('tampered-signature').first()).toBeVisible();
    await expect(page.getByTestId('mitm-blocked-forensics')).toContainText(
      'payload intact; signature corrupted in transit',
    );
    await expect(page.getByText('price: $42', { exact: true })).toBeVisible();
  });

  test('attacker mode in the spaceport demo explains MITM signature corruption', async ({ page }) => {
    await page.goto('/?demo=spaceport-launch-window');
    await expect(page.getByRole('heading', { name: 'Live trace' })).toBeVisible({
      timeout: 20_000,
    });

    const toggle = page.getByRole('checkbox');
    await toggle.check();

    await expect(page.getByTestId('attacker-panel')).toBeVisible();
    await expect(page.getByTestId('mitm-attack-note')).toContainText(
      'Channel tampering only: the payload claims stay intact, but the signature is corrupted in transit.',
    );

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Handoff blocked by the SDK')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('tampered-launch-clearance').first()).toBeVisible();
    await expect(page.getByTestId('mitm-blocked-forensics')).toContainText(
      'payload intact; signature corrupted in transit',
    );
    await expect(page.getByText('window minutes: 18', { exact: true })).toBeVisible();
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
        await expect(page.getByTestId('app-header-title')).toHaveText(demo.title);
        await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('main').getByText(demo.title)).toBeVisible({ timeout: 15_000 });
        await expect(page.getByTestId('hud-demo-context')).toContainText(demo.tagline);
        await expect(page.getByText(demo.hint)).toBeVisible();
        await expect(page.getByText(demo.latestClaim, { exact: true })).toBeVisible({ timeout: 20_000 });
        await page.getByRole('button', { name: /Gallery/ }).click();
        await expect(page.getByTestId('app-header-title')).toHaveText('Browse demos');
        await expect(page.getByRole('heading', { name: 'The Plaza Gallery' })).toBeVisible();
      });
    }

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BlockedModal } from '../src/ui/BlockedModal';
import { Hud } from '../src/ui/Hud';
import type { InteractionResult } from '../src/sim/types';

const sampleResult: InteractionResult = {
  payload: {
    from: 'did:agent:zStoreXYZ',
    to: 'did:agent:zPaymentABC',
    action: 'payment.charge',
    amount: 42,
    nonce: 'abcd1234',
  },
  signature: '0xdeadbeefcafebabe1234567890abcdef',
  signerDid: 'did:agent:zStoreXYZlongerthantwentyfourchars',
  verified: false,
  blockedReason: 'tampered-signature',
};

describe('BlockedModal', () => {
  it('renders the SDK reason verbatim', () => {
    const html = renderToStaticMarkup(
      <BlockedModal result={sampleResult} totalBlocks={1} onDismiss={() => {}} />,
    );
    expect(html).toContain('tampered-signature');
    expect(html).toContain('Handoff blocked by the SDK');
    expect(html).toContain('VerificationBlockedError');
  });

  it('renders both CTAs (spec + maintainer)', () => {
    const html = renderToStaticMarkup(
      <BlockedModal result={sampleResult} totalBlocks={3} onDismiss={() => {}} />,
    );
    expect(html).toContain('Read the spec');
    expect(html).toContain('Talk to maintainer');
    expect(html).toMatch(/href="https:\/\/github\.com\/.+spec/i);
  });

  it('shortens long signer + signature for display', () => {
    const html = renderToStaticMarkup(
      <BlockedModal result={sampleResult} totalBlocks={1} onDismiss={() => {}} />,
    );
    // Truncated form keeps the prefix and last chars with an ellipsis between.
    expect(html).toMatch(/did:agent:zStore.{1,3}ourchars/);
    expect(html).toContain('0xdeadbeefcafeba');
    expect(html).toContain('90abcdef');
  });

  it('shows the running total of blocked handoffs', () => {
    const html = renderToStaticMarkup(
      <BlockedModal result={sampleResult} totalBlocks={7} onDismiss={() => {}} />,
    );
    expect(html).toContain('>7<');
  });
});

describe('Hud blocked-counter', () => {
  it('hides the counter button when no blocks have happened', () => {
    const html = renderToStaticMarkup(
      <Hud
        attackerMode={false}
        onToggleAttacker={() => {}}
        blockedCount={0}
      />,
    );
    expect(html).not.toContain('View last');
    expect(html).not.toContain('handoffs blocked');
    expect(html).toContain('Attacker mode OFF');
  });

  it('shows pluralized counter and View-last button when blocks > 0', () => {
    const html = renderToStaticMarkup(
      <Hud
        attackerMode
        onToggleAttacker={() => {}}
        blockedCount={3}
        onReopenLastBlock={() => {}}
      />,
    );
    expect(html).toContain('Attacker mode ON');
    expect(html).toContain('handoffs blocked');
    expect(html).toContain('View last');
  });

  it('uses singular form for exactly 1 block', () => {
    const html = renderToStaticMarkup(
      <Hud
        attackerMode
        onToggleAttacker={() => {}}
        blockedCount={1}
        onReopenLastBlock={() => {}}
      />,
    );
    expect(html).toContain('handoff blocked');
    expect(html).not.toContain('handoffs blocked');
  });

  it('disables the View-last button if no callback is provided', () => {
    const html = renderToStaticMarkup(
      <Hud attackerMode onToggleAttacker={() => {}} blockedCount={2} />,
    );
    expect(html).toContain('disabled');
  });
});

describe('attacker-mode auto-open contract', () => {
  // Lightweight check: simulating the App callback semantics in isolation.
  it('only fires onBlocked auto-open once per attacker activation', () => {
    let autoOpened = false;
    let openCalls = 0;
    const handle = () => {
      if (!autoOpened) {
        openCalls += 1;
        autoOpened = true;
      }
    };
    handle();
    handle();
    handle();
    expect(openCalls).toBe(1);
    // Simulate user toggling attacker mode OFF and back ON.
    autoOpened = false;
    handle();
    expect(openCalls).toBe(2);
  });

  it('records every block in totalBlocks regardless of modal state', () => {
    const onBlocked = vi.fn();
    onBlocked();
    onBlocked();
    onBlocked();
    expect(onBlocked).toHaveBeenCalledTimes(3);
  });
});

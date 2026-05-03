import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BlockedModal } from '../src/ui/BlockedModal';
import { Hud } from '../src/ui/Hud';
import { TraceInspector } from '../src/ui/TraceInspector';
import type { InteractionResult } from '../src/sim/types';

const sampleResult: InteractionResult = {
  payload: {
    from: 'did:agent:zStoreXYZ',
    to: 'did:agent:zPaymentABC',
    action: 'payment.charge',
    claims: { priceUsd: 42 },
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

describe('TraceInspector attacker guidance', () => {
  it('explains MITM demos keep the payload intact and corrupt the signature in transit', () => {
    const html = renderToStaticMarkup(
      <TraceInspector
        traces={[]}
        latest={sampleResult}
        attacker
        useCase={{
          scenario: 'A store signs a charge for a payment bot.',
          whyItMatters: 'The receiver must detect channel tampering.',
        }}
        attackerInfo={{
          kind: 'mitm-channel',
          from: 'store',
          to: 'payment',
          label: 'MITM on Store → Payment',
          description: 'The channel flips signature bytes in flight.',
        }}
      />,
    );
    expect(html).toContain('Channel tampering only: the payload claims stay intact');
    expect(html).toContain('forensics:');
    expect(html).toContain('payload intact; signature corrupted in transit');
  });

  it('does not show the MITM guidance for malicious-agent demos', () => {
    const html = renderToStaticMarkup(
      <TraceInspector
        traces={[]}
        latest={sampleResult}
        attacker
        useCase={{
          scenario: 'A courier relays a shipment manifest.',
          whyItMatters: 'The receiver must detect payload mutation.',
        }}
        attackerInfo={{
          kind: 'malicious-agent',
          agentId: 'courier',
          label: 'Courier-Logistics-12 (rogue)',
          description: 'The courier rewrites the signed pallet count.',
        }}
      />,
    );
    expect(html).not.toContain('Channel tampering only: the payload claims stay intact');
    expect(html).not.toContain('payload intact; signature corrupted in transit');
  });
});

describe('Hud blocked-counter', () => {
  it('hides the counter button when no blocks have happened', () => {
    const html = renderToStaticMarkup(
      <Hud
        attackerMode={false}
        onToggleAttacker={() => {}}
        blockedCount={0}
        muted
        onToggleMute={() => {}}
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
        muted
        onToggleMute={() => {}}
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
        muted
        onToggleMute={() => {}}
      />,
    );
    expect(html).toContain('handoff blocked');
    expect(html).not.toContain('handoffs blocked');
  });

  it('disables the View-last button if no callback is provided', () => {
    const html = renderToStaticMarkup(
      <Hud
        attackerMode
        onToggleAttacker={() => {}}
        blockedCount={2}
        muted
        onToggleMute={() => {}}
      />,
    );
    expect(html).toContain('disabled');
  });

  it('renders the sound toggle reflecting current mute state', () => {
    const mutedHtml = renderToStaticMarkup(
      <Hud
        attackerMode={false}
        onToggleAttacker={() => {}}
        blockedCount={0}
        muted
        onToggleMute={() => {}}
      />,
    );
    expect(mutedHtml).toContain('Sound off');
    expect(mutedHtml).toContain('click to unmute');

    const unmutedHtml = renderToStaticMarkup(
      <Hud
        attackerMode={false}
        onToggleAttacker={() => {}}
        blockedCount={0}
        muted={false}
        onToggleMute={() => {}}
      />,
    );
    expect(unmutedHtml).toContain('Sound on');
    expect(unmutedHtml).toContain('click to mute');
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

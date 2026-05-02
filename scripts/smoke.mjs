/**
 * Node-side smoke for the Day 0 spike logic.
 * Mirrors the App.tsx flow but runs in Node so we can validate the SDK
 * behaves correctly before publishing the repo.
 *
 * Run with: node scripts/smoke.mjs
 */
import { AgentIdentity } from '@agentdid/sdk';
import { ethers } from 'ethers';

async function main() {
  const storeWallet = ethers.Wallet.createRandom();
  const shopperWallet = ethers.Wallet.createRandom();

  const storeIdentity = new AgentIdentity({ signer: storeWallet, network: 'polygon' });
  const shopperIdentity = new AgentIdentity({ signer: shopperWallet, network: 'polygon' });

  const store = await storeIdentity.create({
    name: 'Store-Clothing-77',
    description: 'Legitimate clothing store agent.',
    coreModel: 'gpt-4o-mini',
    systemPrompt: 'You sell clothes.',
    capabilities: ['accept-orders']
  });

  const shopper = await shopperIdentity.create({
    name: 'Shopper-001',
    description: 'Wants to buy a hoodie.',
    coreModel: 'gpt-4o-mini',
    systemPrompt: 'Looking for a hoodie.',
    capabilities: ['browse', 'pay']
  });

  const payload = JSON.stringify({
    from: store.document.id,
    to: 'did:agent:payment-bot',
    action: 'charge',
    amount: 42
  });

  const signature = await storeIdentity.signMessage(payload, store.agentPrivateKey);
  const verifyOk = await AgentIdentity.verifySignature(store.document.id, payload, signature);

  const tampered = signature.slice(0, -2) + (signature.endsWith('00') ? '11' : '00');
  const verifyTamperedOk = await AgentIdentity.verifySignature(store.document.id, payload, tampered);

  const results = {
    storeDid: store.document.id,
    shopperDid: shopper.document.id,
    payload,
    signaturePrefix: signature.slice(0, 32) + '...',
    verifyOk,
    verifyTamperedShouldBeFalse: verifyTamperedOk
  };

  console.log(JSON.stringify(results, null, 2));

  if (!verifyOk) {
    console.error('\nFAIL: legitimate signature did not verify.');
    process.exit(1);
  }
  if (verifyTamperedOk) {
    console.error('\nFAIL: tampered signature verified as valid. Impostor would NOT be blocked.');
    process.exit(2);
  }
  console.log('\nALL PASS — Day 0 spike validated end-to-end (Node side).');
}

main().catch((err) => {
  console.error('SPIKE CRASHED:', err);
  process.exit(99);
});

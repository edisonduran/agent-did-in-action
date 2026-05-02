# Pharma Recall Cascade

Four agents move an urgent recall notice through a healthcare chain:

1. A manufacturer signs the batch scope of a recall.
2. A regulator verifies that notice and signs an authorized recall order.
3. A wholesaler relays the authorized order to the hospital pharmacy.
4. The pharmacy verifies the relayed regulator signature before pulling stock.

In attacker mode, the wholesaler shrinks the affected lot count while keeping
the regulator's original signature. The pharmacy detects the mismatch and
blocks the recall handoff.
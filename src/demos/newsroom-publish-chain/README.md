# Newsroom Publish Chain

Four agents move one story revision through a newsroom:

1. A reporter signs the draft revision.
2. A fact-checker verifies the reporter's claim and signs editorial clearance.
3. An editor verifies that clearance and relays the approved revision to the publisher.
4. A publisher verifies the relayed fact-check clearance before release.

In attacker mode, the editor changes the approved revision number while keeping
the fact-checker's original signature. The publisher still sees a real
signature, but against the wrong bytes, so verification fails.
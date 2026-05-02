# Spaceport Launch Window

Four agents coordinate a launch window:

1. A weather station signs the approved wind score.
2. Range safety verifies that report and signs a launch clearance.
3. Flight control relays the clearance to the launch gate.
4. The launch gate verifies the relayed clearance before opening the window.

In attacker mode, the network channel between flight control and the launch gate
flips one byte of the range-safety signature. All agents remain honest; the
channel is not.
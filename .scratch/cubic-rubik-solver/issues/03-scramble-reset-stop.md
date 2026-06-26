# 03 — Scramble + Reset + Stop

Status: ready-for-agent

## Parent

Builds on the full 18-move algebra from slice 02. Adds the three lifecycle controls that make the cube a usable playground: Scramble, Reset, Stop.

## What to build

The user can scramble the cube to a random state, reset it to solved, and stop a long playback mid-flight. These are the minimal controls for a usable Virtual Mode playground.

End-to-end behavior:
- **Scramble** generates a random-move sequence of fixed length 20 with two constraints per CONTEXT.md: no move immediately undoes the previous (no `R` then `R'`), no move on the same face back-to-back (no `R` then `R`). `scramble.ts` depends only on the 18 Moves, never on `solve/`. Space key or "Scramble" button enqueues all 20 moves; they animate back-to-back via the Move Queue.
- **Reset** returns the on-screen cube to the solved state in one step: clears the Move Queue, sets the Cube State to solved, and re-derives all mesh transforms from the model (no animation — instant snap). Resets the notation display to empty. Mode-agnostic: works the same in Virtual and Real-cube Mode.
- **Stop** clears the Move Queue and lets the current in-flight move finish animating, per CONTEXT.md. The model then reflects exactly the visible state (animate-then-apply completes the current move). Esc key or "Stop" button. Essential once Scramble enqueues 20 moves and the user wants to interrupt.
- The notation display clears on Reset and continues across Stop (Stop doesn't reset state, only the queue).

## Acceptance criteria

- [ ] Scramble (Space key or button) enqueues 20 random Moves with no-undo and no-same-face-back-to-back constraints; animates back-to-back via the Move Queue
- [ ] `scramble.ts` imports only from the 18 Moves, not from `solve/` — scrambling works without the solver present
- [ ] Reset clears the Move Queue, snaps the Cube State to solved, re-derives all mesh transforms from the model, and clears the notation display — all in one instant step (no animation)
- [ ] Stop (Esc key or button) clears the Move Queue but lets the current in-flight move finish; after it finishes the model reflects exactly the visible state
- [ ] After Scramble + Stop, the cube shows a partially-scrambled state consistent with the moves played so far (not solved, not fully scrambled)
- [ ] After Scramble + Reset, the cube is visibly solved with an empty notation display
- [ ] Notation display clears on Reset and persists across Stop

## Blocked by

- 02-all-18-moves-notation-queue-keyboard.md (needs the full 18-move algebra and Move Queue)
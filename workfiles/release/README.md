# Nimbo — js13kGames 2026

Stack clouds into a staircase and help a little unicorn escape the rising fog.
The standalone competition game is in `js13k/src/`. The home preview plays that
exact packed entry; the Original studio button opens the earlier Three.js version.

## Reproduce

Use Node.js 24 or newer and the committed lockfile. Verification used Node.js
26.8.1; use that version for byte-identical release reproduction.

```sh
npm ci --ignore-scripts
npm run test:game
npm run pack:js13k
npm run typecheck
npm run build
sh startup.sh
```

`public/nimbo.zip` is the competition package. Its single root `index.html`
contains all runtime JavaScript, geometry, UI, sound and styles. `public/entry/`
is the identical unpacked preview. The app wrapper, studio, share cards and
platform scripts are not part of the competition ZIP.

The packer applies Terser and a seeded Roadroller search, then keeps the smallest standard DEFLATE
ZIP. It exits unsuccessfully above 13,312 bytes. No server, database, accounts,
network assets or audio downloads are required by the entry.

## Controls

A/D or arrows move. W/X/up rotates clockwise; Q/Z rotates counterclockwise.
S/down soft drops; Space hard drops. P/Escape pauses, M toggles sound.
Touch controls provide move, rotate, soft/hard drop. Tap the board to rotate,
swipe horizontally to nudge, or swipe down to drop.

Nimbo hops up at most two cells and across one on a 14-column board. Five matching
clouds horizontally or vertically clear and ease the fog. Full rows instead become
fixed rainbow platforms, immune to matches and gravity. Land on one to save an
in-memory checkpoint; after death choose Retry checkpoint or New game. Reloading
does not retain checkpoints. A retry restores the saved board, fog and queued
pieces, with the active piece raised to its spawn height. Height remains the score.

Falling player pieces can crush Nimbo; the red drop outline warns of an impact
at her current position. Clouds compacting after matches cannot crush her. The
fog remains lethal. Each bag contains all seven tetrominoes and one rainbow piece.
Checkpoint color, emission and shimmer are procedural WebGL shader effects;
reduced-motion uses a static glow. The camera shows the complete board and at
least 20 usable rows on desktop.

For repeatable QA, `node scripts/nimbo-preview.mjs` validates and serves the ZIP
at port 8082. `/scenarios` serves a separate readable-source fixture with visible
buttons for completing a checkpoint, aiming a piece at Nimbo and a clear chain.
Fixture controls are not present in the competition ZIP.

## Credits and provenance

The compact WebGL renderer is adapted from the public-domain W family by xem:
https://github.com/xem/W/tree/3834c32bddc7c66fdb465fa94af07dd5d75d3f3b
The upstream README explicitly declares public domain. Nimbo's readable renderer,
models, gameplay and synthesized music are included in `js13k/src/game.js`.
Build tools and the optional studio retain their respective dependency licences.
AI assistance was used for the audit, implementation and verification.

Author credit and competition-period eligibility require the owner's confirmation
before submission. No additional licence grant for original project content is
implied by publishing readable source.

See `workfiles/audit.md`, `workfiles/agent-browser/playbook.md` and the release JSON
files for measured verification. Competition-site saving and acceptance are deferred at the owner's request.

# Nimbo — release guide

Nimbo is a standalone 13KB cloud-stacking game. The competition build is the main game.

## Build and play

Use Node 26.8.1 for byte-identical release reproduction (Node 24+ is required).

```sh
npm ci --ignore-scripts
npm test
npm run typecheck
npm run build
npm run dev
```

Open http://localhost:8080. `npm run typecheck` checks JavaScript syntax; there is no TypeScript source in the cleaned repository. Gameplay regressions run separately through `npm test`.

- `js13k/src/`: readable game, WebGL renderer, procedural models, music and interface.
- `public/nimbo.zip`: competition upload; single root `index.html`, no runtime dependencies.
- `public/entry/index.html`: identical unpacked game.
- `public/press/`: presentation scenes and media, excluded from the ZIP.
- `scripts/`: packing, static server, checks and repeatable QA.
- `workfiles/`: cumulative audit and submission evidence.

The packer uses pinned Terser/Roadroller versions and a fixed packing seed. It fails above 13,312 bytes. `node scripts/press-scenes.mjs` regenerates staged promotional scenes from the actual game models; these are explicitly not ordinary gameplay captures.

## Rules and controls

Build on a 14-column board. Nimbo automatically climbs one cell across and up to two cells higher. Five or more consecutive clouds of one color clear horizontally or vertically. Full rows instead become permanent glowing rainbow platforms and take priority over matches. Reach a platform to activate a checkpoint. Retry restores that snapshot; New game starts over. Checkpoints expire on reload. The rising fog and falling player pieces can kill Nimbo; a red drop outline warns of crushing. Compaction cannot crush her. One prism per seven-piece bag pushes fog back.

A/D or arrows move; W/X/up rotates; Q/Z reverses rotation. S/down soft drops, Space hard drops, P/Escape pauses, M toggles sound. Mobile has touch controls and board gestures. Best scores and sound preferences use localStorage.

## QA and archive

`npm run qa:zip` serves the validated ZIP on 8082. `/scenarios` provides separate source fixtures for checkpoint, crush and clear-chain checks. `node scripts/nimbo-firefox.mjs` runs Firefox checks while that server is running. Physical phones and OS focus switching remain outside recorded coverage.

The former Three.js studio and app-builder framework remain in Git history through `e979a3d`. A local ignored backup is retained in `workfiles/local-platform/`; they are not dependencies of this entry.

Renderer provenance: [xem/W, public domain](https://github.com/xem/W/tree/3834c32bddc7c66fdb465fa94af07dd5d75d3f3b). Original project content has no additional licence grant implied. AI assistance was used. Confirm author credit and creation-period eligibility before final contest submission.

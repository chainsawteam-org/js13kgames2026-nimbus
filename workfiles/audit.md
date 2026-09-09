# Nimbo audit and release record

## Checkpoint 1 — source audit and simulation
- Source of truth: local js13k source; target GitHub repository verified empty with admin access.
- Existing ZIP 9232 bytes, one root index.html. Dependency install: 437 packages, zero audit vulnerabilities.
- Fixed stale jump paths, nearest-cloud teleport, random prism droughts, repeated key actions, pointer cancellation, mute-before-start, and music scheduling backlog. Tests pending.
- Renderer audit: pool of 240 mixed gameplay/effect objects could hide playable clouds; FOV used full angle rather than half angle; inactive nodes still drawn. Fix in progress.
- Remaining: procedural models and presentation; regression tests; fresh packaging and build checks; 15 minutes of final artifact play; Chrome/Firefox/mobile verification; GitHub source and draft.
- Scope override: competition size and theme require procedural art, rainbow palette, native CSS and system fonts rather than the general UI skill library/font defaults.

## Checkpoint 2 — visual pass and first browser checks
- English standalone UI, preview defaults to competition entry, original studio retained.
- New procedural unicorn, rounded clouds, rainbow geometry, particle priority, camera FOV correction.
- 15 game regressions and 60 preview/smoke tooling tests pass; typecheck and full build pass.
- First Firefox 155.0 pass: desktop, mobile portrait and landscape, pause/resume/mute/touch/offline input, zero console errors/external requests. Repeat required for final balance revision.
- Playtesting uncovered unattended centre-stack success (82m within two minutes). Balanced entry columns across the board and increased the minimum fall interval from 0.14s to 0.30s; fixed unicorn occlusion with foreground depth.
- Candidate ZIP: 11792 bytes. SHA-256 b6a964b1ecdf2d4379b9cfb30ef1e90c3b2556be8cc9627f82b38818b747947c. Final play session began 2026-09-09 02:15:30 UTC.
- Current stable versions verified from vendor feeds: Chrome 153.0.8010.36 and Firefox 155.0.1. Downloading isolated test copies; existing Chrome 152 is insufficient to claim latest-browser acceptance.

## Checkpoint 3 — late-run fixes and frozen release
- Earlier candidates and their playtest clocks were superseded. A clear after fog cleanup could collapse the remaining tower to the deleted original ground. Gravity now respects the cleanup boundary; a focused regression covers it.
- Built iframe screenshots exposed a 300x150 canvas initialization race. The game now reconciles backing resolution with its viewport; smoke checks assert actual and expected pixel dimensions.
- Roadroller's random optimizer caused differing build hashes. Packaging now seeds the build-only search. Two consecutive packages are byte-identical, and the ZIP, main entry, and production entry match.
- Frozen ZIP: 11977 bytes (1335 bytes spare), SHA-256 9d4697332b799ac9a8c9bada95d242f4794cfbf656cb9a580887676e7642727b. Final playtest began 2026-09-09 02:33:49 UTC; pause/menu time will be excluded.
- 16 gameplay regressions pass. Typecheck and full build pass. The build's database step deliberately skips because DATABASE_URL is absent and the game requires no database. Vite's large-chunk warning concerns the preserved Three.js studio, outside the ZIP.
- Original studio UI and gameplay messages translated to English. Procedural competition game has no runtime external resources.
- GitButler manages commits and pushes. A narrow `git remote add` configured the supplied repository because GitButler has no remote-add command. Local browser binaries/profiles, environment secrets, platform cache and unrelated generated outputs are excluded.
- The user explicitly deferred competition-site saving/submission. Registration was inspected and requires login; no draft, terms acceptance or submission was performed.

## Checkpoint 4 — user-requested rainbow concept
- The owner rejected the tower framing/visibility and chose falling cloud pieces along a scrolling rainbow bridge. This supersedes tower acceptance and the earlier final-playtest clock.
- New requirements: fixed isometric perspective lens; wider construction window; manual zoom/overview; clear merge forecasts; infinite horizontal rainbow progress; Nimbo walks and climbs the connected path.
- Five touching clouds now weave permanent rainbow sections. Missing sections are visible gaps. Old tower best scores remain stored; rainbow distance uses a separate key.
- The previous tower implementation remains available in Git history (0c1e875) and the original Three.js studio remains separate.

## Checkpoint 5 — usability repair after direct player feedback
- First-drop play confirmed that requiring matches to create a safe path made the core task confusing. Every drop now creates permanent rainbow under its columns; matching five touching colors is an optional fog-relief bonus.
- Nimbo uses a separate front lane, so cloud stacks cannot stop traversal. The first three pieces are untimed and aligned with the next gap. Subsequent pieces require a small adjustment; the forecast explicitly says which direction to move.
- Desktop and touch share visible BUILD/move/rotate controls. A fixed wide perspective and manual zoom remain.
- 22 focused gameplay regressions, typecheck and production build passed. Final candidate is 13098 bytes, 214 bytes below the hard limit (above the optional 12800-byte target). Archive integrity and packed-preview correspondence verified in archive.json.
- All previous final play sessions are superseded. Fresh archive play and current-browser verification are in progress; no competition submission has occurred.

- Final Chrome153.0.8010.36 and Firefox155.0.1 rendering/input checks passed; full console/offline/touch-emulation coverage also passed in Playwright Firefox155.0. Desktop/mobile development and built views match, including full-resolution canvas. No physical-device test is claimed.
- Repeated packaging reproduced SHA-256 2a2d4fa03dcb8f210be6f6974631a793fa6c34a0b6c028f576d25ce5c2a24c5e. GitHub commit93d79fd contains identical ZIP, game source/templates/styles, and packer; checked through GitHub contents API after a raw-host503.
- Live in-app runs reached43m,27m,72m, with deliberately missed gaps, fog loss, Space restart, best-score persistence, pause/resume, mute toggles and manual zoom. A background tab creation did not reproduce a focus change, so real in-app focus-loss behavior is not claimed from that action; input-release regression tests cover the handler.

- Final unchanged-artifact in-app session lasted 17.8 minutes across repeated runs, including practice dwell and live observation. Explicit pause was 11.6s; a conservative two-minute menu allowance is recorded separately. No frame-instrumented active-time claim. Final console has no warnings/errors. Preview left at a fresh untimed opening. Detailed events: release/in-app-play.json.

## Checkpoint 6 — restore placement decisions
- User demonstrated that Space-only play could build endlessly; prior usability success was not evidence of a meaningful puzzle. Previous final-artifact play evidence is superseded.
- Connected placements must cover both the last built tile and the first gap. Rotations trade extension width against cloud placement; disconnected drops create no path and advance fog2.5m. Prisms only relieve fog on connected drops; matches clear clouds without creating disconnected bridge.
- After practice, pieces spawn behind Nimbo instead of following the gap. New pieces start high enough to allow adjustment above accumulated clouds. Clear gravity no longer interrupts a supported bridge walk.
- All25 tests pass, including100 randomized Space-only runs ending below20m and an intentional-placement policy progressing beyond80m. This is regression evidence, not a claim that fun is objectively proven.
- The4,000-token task budget was exceeded investigating the placement/spawn interaction; implementation is checkpointed here.

## Checkpoint 7 — restore polished stacking
- Owner explicitly requested the version before the isometric/rainbow redesign. Restored gameplay, camera, UI, assets, rules and regression tests from0c1e875. No history reset; experimental versions remain in Git history.
- Preserved the detached preview-server startup fix and cumulative audit/play records. Tower climbing, height scores, line/full-row clears, support revalidation/falling, input release, synthesized audio safeguards and renderer capacity fixes are restored together.
- Rainbow gameplay verification is historical and does not describe the restored rules. Fresh restore checks follow below.

- Restore verified:16/16 engine tests, typecheck, full build, desktop/mobile dev+built rendering, Firefox155.0 input/offline checks. ZIP11977bytes exactly matches0c1e875. In-app movement/rotation/drop/climb/pause verified. Further engine work stays within tower stacking; no new bridge rules remain.
## Checkpoint 8 — safe drops over Nimbo
- Fixed the reported death/placement edge case: Nimbo is treated as a rider while a piece is falling. If the piece reaches her column, the lock step lifts it above her before committing it; occupied cloud cells remain solid and cannot be overwritten.
- Added a regression covering a drop above Nimbo's support. All17 gameplay tests pass, including clears, support loss, fog failure, restart, input release and audio resumption.
- Final pack is 12032 bytes (1280 bytes spare), under the 13312-byte limit. Typecheck, production build, and dev desktop/mobile smoke checks pass with zero console/page errors and no horizontal overflow.
- Browser spot check started the game, moved, rotated and hard-dropped a piece; console remained clean. The rule is also exercised deterministically by the new regression test.

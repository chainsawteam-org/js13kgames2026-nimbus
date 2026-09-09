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

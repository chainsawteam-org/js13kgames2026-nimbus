# Nimbo browser QA playbook

## 2026-09-09

Targets: dev http://127.0.0.1:8080/; built wrapper http://127.0.0.1:8081/;
extracted competition ZIP http://127.0.0.1:8082/.

In-app browser: inspect title; start; use A/D and both rotations; drop connected
stairs; observe automatic climbs, prism relief and clears. Keep a regular visual
check while playing, deliberately test loss/restart and pause/resume/mute.
Repeat portrait 390x844 and landscape. Only browser UI input is used here.

Chrome: isolated agent-browser session `nimbo-stable`, CLI 0.37.1, official Chrome
for Testing 153.0.8010.36. Snapshot before refs, then batch actions through #go,
keyboard presses, #pause, #resume, #mute, screenshots, errors and network requests.
The installed Chrome 152 baseline was superseded by this stable-version pass.

Firefox: agent-browser does not support Firefox; use `scripts/nimbo-firefox.mjs`
for Playwright Firefox 155.0 desktop/mobile/offline checks and the isolated Selenium
155.0.1 stable browser for the current-release check. Never infer mobile touch-device
coverage from desktop viewport tests; actual phone hardware remains untested.

The smoke helper now includes embedded frame content and derives its root from
its own location, so the exact entry is verified rather than only wrapper text.
Cumulative results and final duration are appended below after completion.

## 2026-09-09 — rainbow usability repair
- Tested the exact extracted 13098-byte ZIP at http://127.0.0.1:8082/ and the entry at http://127.0.0.1:8080/entry/index.html.
- In-app browser: start, BUILD first three pieces, follow left/right forecast, fill a missed gap, observe resumed walking; toggle sound twice and zoom in. First three placements remain untimed. Continued run has passed 37m.
- agent-browser 0.37.1, isolated Chrome 153.0.8010.36: start, Space, 390x844, button movement/rotation/BUILD, resize 844x390 then1280x800, screenshots, errors/console. No errors or runtime resource requests. Screenshots repair-chrome-mobile/landscape/desktop.png.
- Firefox 155.0.1 desktop confirms live rendering and pause/resume. Playwright Firefox155.0 additionally checks console, touch-input emulation, portrait/landscape, and continued offline play; all passed. Physical mobile hardware remains untested.
- Development and production smoke match, no overflow/errors, full-resolution canvas. Read both desktop/mobile screenshots; live UI is visible and legible.

- Brand-only session nimbo-brand-assets: staged procedural SVGs opened with --allow-file-access, viewport set after opening, screenshots 1200x630 and1200x264, visual inspection and JPEG read-back passed. Updated og.jpg/x-banner.jpg to Follow the rainbow; no competition runtime changes. Session closed. Evidence screenshots/brand-og-rainbow.png and brand-x-banner-rainbow.png.

- Final in-app sessions: repeated practice, guided placement, visible failure and Space restart, best scores43 then72, pause freezing43, sound toggled twice, zoom100/114 and reset. Later unattended gaps intentionally/incidentally caused losses; the game does not progress indefinitely without placement input. Input automation's immediate DOM read can precede the next animation frame; re-read after the screen changes before choosing the next action.
- Real in-app focus loss was not reproduced by opening a background tab, and physical touch hardware was unavailable. Handler regressions and browser touch emulation pass; these are coverage limitations, not evidence of physical-device acceptance.

## Edge-connection mechanic verification
- Final13158-byte entry: practice shows Connected +N; after practice the piece spawns behind the edge and requests movement right. Six Space presses from10m caused loss/restart instead of an endless path. This browser check accompanies100 randomized anti-spam simulations.
- Chrome agent-browser0.37.1: entry start/drop,390x844 screenshot edge-mobile.png, no console errors. Firefox155.0: desktop, portrait, landscape, touch emulation, pause/sound/offline checks pass. Dev/built desktop/mobile screenshots inspected; no overflow/errors, identical smoke baseline. Higher spawns initially clipped at the top; fixed camera framing adjusted and rechecked.
- Earlier18-minute play evidence applies to the superseded rules. This update has focused browser verification, not a fresh15-minute final-release session. Physical devices and in-app focus-loss coverage remain outstanding.

## Preview server recovery
- User reported connection refused. Confirmed nothing listening on8080; prior dev log had no application crash message.
- startup.sh now launches npm run dev as a detached Node child with ignored stdin and file logs. Startup returned, subsequent independent HTTP check returned200; second startup remained idempotent.
- Existing in-app error tab could not navigate because its underlying error document used a blocked data URL. A fresh in-app tab loaded the original HTTP game address successfully. Marked deliverable and shown; visually confirmed scene/title, clicked Let's weave, verified practice controls and no console errors.

## Restore stacking from0c1e875
- Reloaded existing deliverable tab8 at http://127.0.0.1:8080/entry/index.html. Verified Cloud tower label, original climb/clear rules and frontal camera visually. Started, moved left/right, rotated, dropped pieces, climbed2m and paused successfully.
- All16 stacking regressions pass; typecheck/build pass. Generated ZIP11977bytes is byte-identical to0c1e875. Dev/built desktop/mobile screenshots inspected; clean console and matching baseline. Firefox155.0 desktop/portrait/landscape touch emulation, pause/mute/offline-input checks pass. Fresh15-minute final-release acceptance has not been repeated.
- 2026-09-09 Nimbo overlap drop fix: opened http://127.0.0.1:8080/entry/index.html, started the run, pressed left, rotate and Space, then checked the browser console. No errors were emitted. The exact overlap case is covered by `a piece can land above Nimbo without killing or overwriting her support` in `scripts/nimbo.test.mjs`.
- 2026-09-09 protected checkpoints: Chrome for Testing 153.0.8010.36 via isolated
  `nimbo-checkpoints` agent-browser session. Exact ZIP at http://127.0.0.1:8082/;
  separate readable-source fixture at /scenarios. Fixture flow: complete checkpoint,
  Space, wait for `Checkpoint · 2 m`, aim at Nimbo, Space, verify crush reason,
  Retry checkpoint, pause and verify restored height 2. Shader glow screenshot:
  screenshots/checkpoint-glow.png. Fixture controls never enter the ZIP.
- Chrome portrait 390x844: start, Move right, Rotate, DROP; inspect red warning and
  screenshot checkpoint-mobile-play.png. Resize to 844x390, inspect screenshot
  checkpoint-landscape.png. No console errors; request log contains only local
  document loads. Physical phone hardware remains untested.
- Firefox 155.0: exact ZIP desktop, portrait and landscape input/offline tests;
  source fixtures verify checkpoint retries, clear chains and landscape reduced
  motion. All assertions pass with zero errors. An earlier fixture navigation
  emitted Firefox's `InvalidStateError: Navigated away from page` while leaving an
  offline document; separate per-scenario pages eliminate that teardown race.
- Dev and production wrapper screenshots inspected at desktop/mobile dimensions;
  canvas resolution correct, zero overflow/errors and no baseline divergence.
  Production entry, extracted ZIP entry and main preview have identical hashes.

- Final 13095-byte artifact rechecked in Chrome and Firefox. Chrome reduced-motion: `set media light reduced-motion`, reload /scenarios, complete checkpoint, Space, verify checkpoint 2m and media query true; static colored glow renders without console errors (checkpoint-chrome-reduced.png). Firefox final exact-ZIP and source-fixture checks all pass.

- Final exact-ZIP in-app play completed: 958 conservative active seconds (15m58s), repeated real-time UI-controlled runs, menus/pauses and previous candidates excluded. Final console warnings/errors: none. Explicit pause and sound toggle verified. Events and method are in release/in-app-play.json checkpointRelease; screenshot checkpoint-final-in-app.png. Rare checkpoint/chain cases were exercised in separate source fixtures. Physical mobile devices and an OS-level focus switch were not verified; focus/input-release behavior is covered by regression tests.

## Listing media and cleanup
- agent-browser isolated session nimbo-press, local preview8080. Rendered cover/checkpoint/thumbnail scenes generated by scripts/press-scenes.mjs; fixed a presentation-only incorrect pause element ID before capturing the final images.
- Actual game: open /, start, move right, Space, screenshot1280x800; repeat390x844 with touch buttons. All five media images visually inspected. Their staged/gameplay distinctions are listed in public/press/index.html.
- Computer Use attempted the live registration page in the user Chrome. User tab changes initially interrupted actions; after Chrome was released, the page title was Registration | js13kGames 2026 but AX content was empty and screenshot null. Form remains unfilled pending restored visibility.
- Clean static-server smoke: fresh nimbo-verify Chrome session,1280x800, snapshot, click Let’s climb, d, Space, resize390x844; both screenshots inspected, error list empty. A click before viewport refresh was covered by canvas and was retried from a fresh snapshot.

- Codex browser registration: reused signed-in submit tab, entered repository and Nimbo title, read official rules, saved registration; Contact step displayed. Attempted Game navigation stayed at Contact. Physical-prize/address choice requested from owner; later steps remain gated.

## In-app listing/media — 2026-09-09

User explicitly selected the Codex browser. Connected in-app runtime used for https://js13kgames.com/submit: uploaded ZIP through file chooser; saved Presentation with accepted exact-size PNG files. Browser screenshots returned JPEG bytes, so PNG encoding was corrected before upload. ZIP accepted at 13095 bytes. Contact and Team had been completed by owner.

Local recorder on 8083 captured actual WebGL canvas and Web Audio, including a staged checkpoint fixture. User requested no video after YouTube sign-in was found missing; no upload occurred. Temporary recorder and YouTube tabs closed; viewport restored. Recording retained only in ignored local backup.

Final preview https://js13kgames.com/games/nimbo visibly shows cover, new 1347-byte description, ZIP size and post-mortem link. Screenshot: workfiles/release/listing-final.jpg. Final form has Desktop/Mobile/Audio selected (not yet submitted). Hosted Play URL https://play.js13kgames.com/nimbo/ failed net::ERR_BLOCKED_BY_CLIENT; no hosted runtime pass claimed. GitHub post-mortem publication verified via repository contents API. Presentation was saved; final submission remains unperformed.

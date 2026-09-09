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

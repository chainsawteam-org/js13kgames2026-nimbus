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

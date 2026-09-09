# Nimbo — js13kGames 2026

Theme: **Unicorns and Rainbows**.

Stack pastel tetromino clouds into a tower. Nimbo the unicorn climbs by herself.
Keep a continuous path. Rainbow (prism) pieces push the fog back. If the fog
catches her, she falls asleep.

This folder is the **readable source** for the 13 KB competition entry.
The main preview plays the exact competition entry. The Original studio action
opens the separate Three.js version. Release instructions and measured checks
are in [workfiles/release/README.md](../workfiles/release/README.md).

## 3D in 13 KB

The jam build does **not** ship Three.js. It vendors a compact port of
[W](https://github.com/xem/W/tree/3834c32bddc7c66fdb465fa94af07dd5d75d3f3b)
by xem (public domain):

- cubes, spheres, pyramids
- scene-graph groups
- camera + directional light
- fragment lighting via `dFdx`/`dFdy` (no vertex normals)

Clouds use rounded procedural geometry. Nimbo has a cream body, expressive face,
golden horn, animated hooves, and a rainbow mane and tail. Pack tries Terser
then Roadroller and keeps whichever zips smaller.

## Pack

```bash
node scripts/pack-js13k.mjs
```

Writes a zip with a single root `index.html` (no external resources):

- `public/nimbo.zip` — submit this (must be ≤ 13,312 bytes)
- `public/entry/index.html` — unpacked playable copy

Source files:

- [`src/game.js`](src/game.js) — W renderer, tetromino sim, unicorn BFS climb, Web Audio
- [`src/page.html`](src/page.html) — standalone entry template
- [`src/page.css`](src/page.css) — overlay HUD / title / touch pad
- [`../scripts/pack-js13k.mjs`](../scripts/pack-js13k.mjs) — terser + roadroller + zip

## Controls

| Desktop | Mobile |
| --- | --- |
| A / D or arrows — move | pad ‹ › |
| W / X — rotate, Z / Q reverse | ↻ or tap canvas |
| S — soft drop | ↓ |
| Space — hard drop | DROP or swipe down |
| P / Esc — pause, M — mute | buttons |

Works offline; recorded browser verification is in `../workfiles/release/`. `localStorage` key is `nimbo-best-v1`.

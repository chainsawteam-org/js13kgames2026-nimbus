# Nimbo

**Tiny unicorn. Big climb. A little cloud magic.**

Build a staircase of rainbow clouds for Nimbo, who climbs by herself while the fog rises below. You control the falling pieces. She trusts you to leave a way up.

[Play Nimbo on js13kGames](https://js13kgames.com/games/nimbo#play) · [Download the game ZIP](https://raw.githubusercontent.com/chainsawteam-org/js13kgames2026-nimbus/competition-2026/public/nimbo.zip) · [Development post-mortem](workfiles/release/post-mortem.md)

![Nimbo above a rainbow staircase](https://raw.githubusercontent.com/chainsawteam-org/js13kgames2026-nimbus/competition-2026/public/press/cover.png?v=424e3d0)

*Promotional scene rendered with the actual procedural game models. [View the cover file](public/press/cover.png).*

## Build clever. Climb higher.

- Build on a 14-column board. Nimbo hops up to two cells higher and one cell across.
- Match five or more consecutive clouds of one color horizontally or vertically to clear space and ease the fog.
- Complete a row to create a permanent glowing rainbow platform. Land on it to activate a checkpoint.
- Watch the red drop warning: falling pieces can crush Nimbo. Retry your highest saved checkpoint or start again.
- One prism in every seven-piece bag pushes the fog back.

All models, rainbow shaders, sparkles and music are generated procedurally. The **13,095-byte ZIP** contains one standalone HTML file and no external runtime resources. Checkpoints last through retries; best scores and sound preferences are stored locally.

## Screenshots

### Desktop gameplay

![Desktop gameplay with the landing warning and upcoming pieces](https://raw.githubusercontent.com/chainsawteam-org/js13kgames2026-nimbus/competition-2026/public/press/gameplay-desktop.png?v=424e3d0)

*Captured from the competition entry. [Full-size desktop screenshot](public/press/gameplay-desktop.png).*

### Mobile gameplay

<img src="https://raw.githubusercontent.com/chainsawteam-org/js13kgames2026-nimbus/competition-2026/public/press/gameplay-mobile.png?v=424e3d0" alt="Mobile gameplay with on-screen touch controls" width="390">

*Captured at 390 × 844. [Full-size mobile screenshot](public/press/gameplay-mobile.png).*

### Rainbow checkpoint

![Nimbo on a glowing rainbow checkpoint platform](https://raw.githubusercontent.com/chainsawteam-org/js13kgames2026-nimbus/competition-2026/public/press/checkpoint.png?v=424e3d0)

*Staged checkpoint demonstration using the game renderer. [Full-size checkpoint scene](public/press/checkpoint.png).*

## Controls

| Action | Keyboard |
| --- | --- |
| Move piece | A/D or Left/Right |
| Rotate | W/X/Up; Q/Z to reverse |
| Soft / hard drop | S/Down / Space |
| Pause | P/Escape |
| Toggle sound | M |

On mobile, use the touch buttons, tap to rotate and swipe to move or drop.

## Build and run

Use Node 24 or newer. Byte-identical release reproduction uses Node 26.8.1.

```sh
npm ci --ignore-scripts
npm test
npm run typecheck
npm run build
npm run dev
```

Open http://localhost:8080. The build writes `public/nimbo.zip` and its identical unpacked entry in `public/entry/index.html`. Packaging fails above 13,312 bytes. `typecheck` checks JavaScript syntax; this repository has no TypeScript source.

[Readable game source](js13k/src/game.js) · [Packaging script](scripts/pack-js13k.mjs) · [Full release guide and verification](workfiles/release/README.md)

## Images and press kit

All media is committed under [public/press](public/press). Presentation images are outside the competition ZIP.

| Asset | Dimensions | Download / view |
| --- | --- | --- |
| Promotional cover | 1600 × 900 | [PNG](public/press/cover.png) |
| Checkpoint scene | 1600 × 900 | [PNG](public/press/checkpoint.png) |
| Desktop gameplay | 1280 × 800 | [PNG](public/press/gameplay-desktop.png) |
| Mobile gameplay | 390 × 844 | [PNG](public/press/gameplay-mobile.png) |
| Square artwork | 400 × 400 | [PNG](public/press/thumbnail.png) |
| js13k listing cover | 800 × 500 | [PNG](public/press/listing-cover.png) |
| js13k listing thumbnail | 320 × 320 | [PNG](public/press/listing-thumbnail.png) |

Run the local server and visit `/press/index.html` for the media gallery.

## Credits

Renderer adapted from [xem/W](https://github.com/xem/W/tree/3834c32bddc7c66fdb465fa94af07dd5d75d3f3b), released into the public domain. Development used AI assistance. Read the [post-mortem](workfiles/release/post-mortem.md) for the design changes, constraints and testing limits.

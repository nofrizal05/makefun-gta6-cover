# Vice City Nights — Cover Art Maker

[![Make GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/nofrizal05/makefun-gta6-cover/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/nofrizal05/makefun-gta6-cover/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn your own photos and a caption into GTA 6-style cover art — the multi-panel
poster look with bold caption lettering and a Vice City sunset or neon colour
grade — and export it as a PNG to share. Built for make.fun's
[Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty ($250).

## What it does

- **Any photo:** load up to 4 photos from your machine (nothing is uploaded —
  photos never leave the browser). Two free sample photos are included so you
  can try it instantly.
- **Crop & position each photo:** click a panel to select it, drag to pan the
  photo inside it, scroll (or use the slider) to zoom, or pick which photo
  fills that panel. One button fills every panel with photo 1.
- **Six layouts:** Hero + three, 2×2 four panels, nine-panel poster grid,
  full bleed, tilted snapshots, and a split layout.
- **Five colour grades:** Vice Sunset, Neon Nights, Palm Gold, Teal Dusk and
  Candy Pink — each with its own sky gradient, photo wash and title gradient.
- **Your words:** an editable caption in big Anton display type with a
  sunset-gradient fill, a Pacifico script subtitle, and a badge ribbon.
  Poster frame, film grain and vignette toggles included. Undo/redo included.
- **Export PNG** in the three common post sizes: **1080×1080**,
  **1080×1350** and **1920×1080**. Photo to PNG in a few clicks.

Everything is original: no Rockstar Games logo, wordmark, artwork, character
or font. The display fonts (Anton and Pacifico) are shipped under the
SIL Open Font License — see `app/fonts/OFL.txt`.

## Run it

No build step, no network. Serve the `app/` folder with any static server:

```sh
node serve.ts
# open http://localhost:8080
```

Or serve `app/` with any static file server and open `index.html` in a
desktop browser.

## Entry program

`main.ts` (Node 22, standard library only) hands the entry in: it copies
`app/` and `screenshots/` to `/output` and writes `/output/dossier.json`
with `buildDossier` from `vendor/makefun-app.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout of the repo

- `app/index.html`, `app/style.css` — the editor page
- `app/src/cover.js` — the cover renderer (layouts, grades, lettering, grain)
- `app/src/main.js` — editor wiring: photos, panels, export, undo/redo
- `app/src/shots.js` — fixed `?shot=` scenes used for the screenshots
- `app/fonts/` — Anton + Pacifico (SIL OFL)
- `app/samples/` — two free sample photos (made with an image model for make.fun)
- `screenshots/` — the cover and the editor, captured in a real browser
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged

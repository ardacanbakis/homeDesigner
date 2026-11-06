# HomeDesigner

A browser-based, desktop-first home and room designer. Sketch a floor plan in 2D, furnish it from a catalog, then switch to 3D to orbit or walk through it. Everything runs in the browser: there's nothing to install and no account, and your design never leaves your machine unless you share it.

**Live demo:** https://ardacanbakis.github.io/homeDesigner/

## Features

### Plan
- **Walls**: click to draw chained walls with snap to grid and to endpoints. Drag endpoints to reshape, and set exact length, height and thickness in the Inspector.
- **Doors & windows**: add them from a wall's Inspector, then set offset, width, height and sill. Each door's swing is worked out for you: interior doors open into the smaller room, exterior doors open inwards. The 2D plan, the 3D view and the printed plan all agree on it.
- **Rooms**: closed wall loops become rooms automatically, each with its area and a name guessed from its furniture (Bedroom, Kitchen-Diner, Office, Meeting…). Click a room to select it, or **double-click to rename** it. You can also give it a **floor finish** (wood, tile, carpet, concrete or marble) and a **wall paint** (seven paints or any colour). Paint goes on the room's side of each wall, so two rooms sharing a wall can be different colours. Names, finishes and paint are anchored to a point inside the room, so they survive wall edits.
- **Multiple floors**: add floors from the toolbar. The floor below shows faintly in 2D for alignment, and all floors stack at their real heights in 3D.
- **Measure tool** (`M`): click two points to read a distance.
- **Units**: cm, m or ft-in, switched from the toolbar. Every length field accepts any unit you type (`2.5m`, `8' 2"`, `96in`, `250cm`). Geometry is always stored in cm.

### Furniture
- **22 catalog pieces** across Bedroom, Kitchen, Living, Bath, Office, Decor and Build: bed, nightstand, wardrobe, dresser, fridge, stove, sink, counter, washer, sofa, table, chair, TV, bookshelf, toilet, bathtub, shower, desk, rug, plant, floor lamp and stairs. You can also create **custom objects** with your own name, size and colour.
- Drag from the palette onto the plan, or click to drop one in. Pieces snap flush against nearby walls.
- **Rotate and resize** with on-canvas handles (rotation snaps every 45°), or type exact size, position and angle in the Inspector.
- **Multi-select** with shift-click or by dragging a marquee. Copy, paste, duplicate, nudge, align and distribute.
- Overlapping pieces get a red outline. **Rugs** are the exception: furniture is meant to stand on them, so they draw underneath everything.
- **Colours**: a piece's colour fills it on the plan and recolours its 3D model's main material (the sofa's fabric, the bed's covers, a cabinet's body). "Default" brings back the model's own finish.

### 3D
- Every piece is a real glTF model with PBR materials. Walls have proper openings with framed doors (handles included, open at their swing) and glazed windows. Floor finishes render as tiling textures, and wall paint covers each room's side of its walls.
- **Wall cutaway**: choose **Full**, **Cutaway** or **Low** walls. Cutaway (the default) works like a doll's house: walls between you and the rooms drop to a low stub, and only the back walls stay up. It updates as you orbit. Cut walls show a dark section, and clicks pass through them to the furniture behind. Floors above the active one are lifted off while walls are cut, and Walk mode always uses full walls.
- Camera modes: **Orbit**, **Walk** (first person: WASD, Shift to run), **Top**, **Front** (a section view in Cutaway) and **Iso**. You can show all floors or isolate the active one, and export a PNG screenshot.
- The 3D engine (three.js + react-three-fiber) is split out of the main bundle. The editor opens fast, and the 3D engine downloads in the background once the page is idle.

### Templates, sharing and export
- **Templates**: start from a studio, a 1-bedroom or 2-bedroom apartment, a family house or an office suite. Each one is laid out with real clearances and checked by a test gate: no overlaps, nothing inside walls and no blocked door swings. You can also save your own designs as templates.
- **Share link**: this copies a URL that contains the whole design, compressed into the link's `#` fragment, so it is never sent to a server. Opening a link asks before replacing your current design.
- **Export**: a printable 2D plan (PNG, SVG, or Print / Save as PDF) with room names, areas, floor finishes and wall paint, exterior wall lengths, overall dimensions, a scale bar and a title block. You can also export or import the design as JSON.
- **Autosave**: every change is saved to `localStorage`. Undo and redo cover every edit.
- **Light and dark themes.**

## Keyboard shortcuts

| Key | Action |
|---|---|
| `V` / `W` | Select tool / wall tool |
| `M` | Measure tool |
| `Esc` | Cancel the current tool or drawing, or deselect a room |
| `R` | Rotate the selected furniture 90° |
| `Delete` / `Backspace` | Delete the selection |
| Arrow keys | Nudge the selection (by one grid step when snap is on) |
| `Ctrl/⌘ + C` / `V` / `D` | Copy / paste / duplicate |
| `Ctrl/⌘ + Z` / `Ctrl/⌘ + Shift + Z` or `Ctrl/⌘ + Y` | Undo / redo |
| `F` | Fit the plan to the view |
| Shift-click / drag on empty space | Add to the selection / marquee select |
| Double-click a room | Rename it |
| Scroll / middle-drag | Zoom / pan (2D) |
| Left-drag / right-drag | Orbit / pan (3D) |
| `W` `A` `S` `D`, Shift | Walk / run (3D walk mode) |

## Tech stack

| Layer | Library |
|---|---|
| Build | Vite + React 19 + TypeScript |
| 2D canvas | `react-konva` (Konva.js) |
| 3D scene | `three`, `@react-three/fiber`, `@react-three/drei` |
| State | `zustand` with `zundo` for undo/redo |
| Styling | Tailwind CSS v4 |
| Tests | Vitest (jsdom) |

There is a single source of truth: one Zustand store holds the `Design` (floors, then walls, openings, furniture and room tags) plus UI state. The 2D canvas, the 3D scene and the plan exporter all render from it, so switching views is instant and needs no conversion. Rooms are derived from the walls on the fly and never stored. Only the user's overrides (name and finish) are stored, as point-anchored tags.

## Run it locally

```bash
git clone https://github.com/ardacanbakis/homeDesigner.git
cd homeDesigner
npm install
npm run dev        # http://localhost:5173/homeDesigner/
```

Other scripts:

```bash
npm test           # unit tests (geometry, store, templates, share links, plan export)
npm run lint
npm run build      # regenerates the 3D models, type-checks, bundles into dist/
npm run preview    # serve the production build
```

## Deployment

GitHub Actions builds the site and publishes it to GitHub Pages on every push to `main` ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)). In **Settings → Pages**, the source must be set to **GitHub Actions**. The `base` path in [vite.config.ts](vite.config.ts) is `/homeDesigner/`, which matches the project-page URL.

## Project layout

```
scripts/
  generate-models.mjs   # builds public/models/*.gltf from three.js geometry
public/models/          # 21 generated glTF furniture models
src/
  store/
    types.ts            # data model: Wall, Opening, Furniture, RoomTag, Floor, Design
    design.ts           # Zustand store, actions, undo history
  geometry/
    catalog.ts          # furniture presets and floor materials
    walls.ts            # wall math and snapping
    rooms.ts            # room detection, naming, label placement, door swings
    cutaway.ts          # which side of each wall is inside, for the 3D cutaway
    paint.ts            # which stretch of each wall face takes which room's paint
    snap.ts             # furniture-to-wall snapping and overlap checks
    measure.ts          # units: formatting, parsing, rotated footprints
  persistence/
    storage.ts          # localStorage, JSON import/export, migrations
    layout.ts           # declarative floor-plan builder used by the templates
    templates.ts        # built-in templates and user templates
    share.ts            # compressed share links (#d=v1.…)
    planExport.ts       # printable SVG plan, then PNG / SVG / print
  editor2d/Canvas2D.tsx # the 2D editor (react-konva)
  scene3d/              # 3D scene: walls (cutaway, openings, paint), floors, furniture
  ui/                   # toolbar, palette, inspector, template gallery, overlays
  App.tsx               # layout; lazy-loads the 3D view
```

### How the furniture models are built

`npm run build` runs `scripts/generate-models.mjs` first (via `prebuild`). That script builds each piece from three.js primitives and writes a self-contained `.gltf` file with an embedded buffer. Every model has its back at −z, so pieces placed against a wall face into the room. At runtime, `Furniture3D.tsx` loads each model with drei's `useGLTF` and scales it to the piece's exact `w × h × d`, so resizing just works. A piece's colour is applied to the materials named for its kind in `src/scene3d/modelTint.ts` (a test checks those names exist in the models). To use a real CC0 asset instead, drop a `.gltf` into `public/models/<kind>.gltf`, and update its entry in `modelTint.ts` if you want colours to apply. Regenerate the built-in ones with `npm run generate-models`.

## Ideas for later

- Touch and mobile support (the app is currently desktop-first)
- Higher-fidelity CC0 models (Poly Haven, Kenney, Quaternius)
- Ceilings and lighting per room
- Measurements and labels in the 3D view

## References

These open-source projects are worth a look:

- [furnishup/blueprint3d](https://github.com/furnishup/blueprint3d): the classic "2D floor plan → 3D" three.js project
- [theLodgeBots/open3dFloorplan](https://github.com/theLodgeBots/open3dFloorplan): SvelteKit + three.js with a large furniture catalog
- [amitukind/architect3d](https://github.com/amitukind/architect3d): a WebGL interior designer
- [CodeHole7/threejs-3d-room-designer](https://github.com/CodeHole7/threejs-3d-room-designer): a React + three.js room planner

## License

MIT

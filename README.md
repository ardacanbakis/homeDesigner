# HomeDesigner

A browser-based, desktop-first home and room designer. Sketch your floor plan in 2D, toggle to 3D to walk around it, and drag preset furniture into rooms — all in the browser, no install.

**Live demo:** https://ardacanbakis.github.io/homeDesigner/

## What it does

- **2D floor-plan editor** — draw walls by clicking, with snap-to-grid and snap-to-endpoint. Pan with middle-mouse, zoom with scroll. Endpoint handles let you reshape existing walls. Live length labels on every wall.
- **3D viewer** — toggle from 2D to 3D and the same design renders as extruded walls in a lit Three.js scene with orbit/pan/zoom.
- **Furniture catalog** — 14 presets across bedroom / kitchen / living / bathroom / office:
  bed, wardrobe, dresser, fridge, washer, stove, sink, sofa, table, chair, TV, toilet, bathtub, desk.
  Each one is rendered as a proportioned 3D primitive with detail geometry (sofa has armrests + back, bed has a pillow + headboard, toilet has tank + bowl, etc.).
- **Drag-drop placement** — drag from the palette onto the workspace, or click to place at center. Drag in 2D to move; press `R` to rotate 90°; `Delete` to remove.
- **Inspector** — for the selected item: width/depth/height inputs, rotation, position, delete.
- **Persistence** — auto-saves to `localStorage` on every change. **Export JSON** / **Import JSON** / **New** in the toolbar.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `W` | Wall tool |
| `V` | Select tool |
| `Esc` | Cancel current tool |
| `R` | Rotate selected furniture 90° |
| `Delete` / `Backspace` | Delete selection |
| Scroll | Zoom (2D and 3D) |
| Middle-drag | Pan (2D) |
| Left-drag (3D) | Orbit |
| Right-drag (3D) | Pan |

## Tech stack

| Layer | Library |
|---|---|
| Build | Vite + React 18 + TypeScript |
| 3D scene | `three`, `@react-three/fiber`, `@react-three/drei` |
| 2D canvas | `react-konva` (Konva.js) |
| State | `zustand` |
| Styling | Tailwind CSS v4 |
| IDs | `nanoid` |
| Tests | Vitest |

Single source of truth: one Zustand store holds `{ walls, openings, furniture, selection }`. Both the 2D canvas and 3D scene render from it, so switching views is instant and no data conversion happens.

## Run it locally

```bash
git clone https://github.com/ardacanbakis/homeDesigner.git
cd homeDesigner
npm install
npm run dev      # http://localhost:5173/homeDesigner/
```

Other scripts:

```bash
npm run build    # production bundle into dist/
npm run preview  # preview production build
npm run lint
```

## Deployment

GitHub Actions builds and publishes to GitHub Pages on every push to `main`. The workflow lives at [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

One-time setup (after the first push):

1. Go to **Settings → Pages**.
2. Under **Source**, choose **GitHub Actions**.

The site publishes to `https://<owner>.github.io/homeDesigner/` within ~2 minutes of a push.

The `base` path in [vite.config.ts](vite.config.ts) is set to `/homedesigner/` so asset URLs resolve under the project-page subpath.

## Project layout

```
src/
  store/
    types.ts            # data model: Wall, Furniture, Design, ...
    design.ts           # Zustand store + actions
  geometry/
    catalog.ts          # 14 furniture presets (size, color, category, icon)
    walls.ts            # wall math + snapping
  persistence/
    storage.ts          # localStorage + JSON import/export
  ui/
    Toolbar.tsx         # 2D/3D toggle, tools, file ops
    Palette.tsx         # left sidebar — furniture catalog
    Inspector.tsx       # right sidebar — selected-object props
  editor2d/
    Canvas2D.tsx        # react-konva workspace
  scene3d/
    Scene3D.tsx         # R3F canvas, lighting, camera, grid
    Walls3D.tsx         # extruded wall meshes
    Furniture3D.tsx     # furniture primitives w/ detail geometry
  App.tsx               # three-pane layout, swaps Canvas2D ↔ Scene3D
  main.tsx
```

## Roadmap

Done:

- **Doors & windows** — openings cut into the wall extrusion via `THREE.Shape` + `Path` holes.
- **Undo / redo** — `zundo` temporal middleware, tracking only the design.
- **Multi-floor + stairs** — `Design` holds `floors: Floor[]`; a floor switcher in the toolbar edits one floor at a time (with the floor below ghosted in 2D), and all floors render stacked at their real heights in 3D. Stairs are a catalog preset rendered as a stepped 3D run.

Not yet implemented (open for follow-ups):

- **GLB models** — replace primitives with CC0 glTF assets (Poly Haven, Kenney, Quaternius), preloaded with drei's `useGLTF`.
- **Room detection** — derive rooms from wall loops (the blueprint3d-style cycle algorithm), then show room labels and area.
- **Mobile / touch** — currently desktop-first.

## References

The design borrows patterns from several open-source projects worth a look:

- [furnishup/blueprint3d](https://github.com/furnishup/blueprint3d) — the canonical "2D floor plan → 3D" Three.js project.
- [theLodgeBots/open3dFloorplan](https://github.com/theLodgeBots/open3dFloorplan) — SvelteKit + Three.js, large furniture catalog.
- [amitukind/architect3d](https://github.com/amitukind/architect3d) — WebGL interior designer.
- [CodeHole7/threejs-3d-room-designer](https://github.com/CodeHole7/threejs-3d-room-designer) — React + Three.js room planner.

Commercial peers studied for UX: Planner 5D, Coohom, Homestyler, Sweet Home 3D, RoomSketcher.

## License

MIT.

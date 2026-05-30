# Plato's Cove

A first-person **vaporwave 3D experience** — a liminal poolroom platform drifting on an endless ocean at golden hour, with a recessed pool, doric columns, a marble bust on a pedestal, and a boombox playing lo-fi tracks. Walk around, jump, and let the chromatic-aberrated, bloom-soaked sunset wash over you.

![Sun over the ocean](screenshots/sun.png)

## The experience

- **Endless ocean** — animated `three.js` `Water` stretching to the horizon
- **Procedural sky** — custom GLSL shader with a low, hazy sun and graded vaporwave colors
- **Floating poolroom** — a tiled platform with a recessed pool of reflective water
- **Set dressing** — doric columns and a marble bust raised on a tall pedestal
- **Diegetic music** — a boombox plays vaporwave/lo-fi tracks; volume fades with your distance to it, and controls appear when you walk close
- **First-person walk camera** — custom kinematic controller with acceleration, gravity, and jumping
- **Vaporwave grade** — ACES filmic tone mapping plus bloom, chromatic aberration, film noise, and vignette

| | |
|---|---|
| ![Pool](screenshots/pool.png) | ![Ocean](screenshots/ocean.png) |
| ![Neon](screenshots/neon.png) | |

## Tech stack

- **React 19** + **Vite 7** — fast dev server and build
- **Three.js** via **React Three Fiber** — 3D rendering
- **@react-three/drei** — R3F helpers (`useGLTF`, `Text`)
- **@react-three/postprocessing** — bloom, chromatic aberration, noise, vignette
- **vite-plugin-glsl** — imports the sky `.glsl` shaders
- **Leva** — dev-only tweak panel for lights and effects
- **Playwright** — headless screenshot capture

## Getting started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Then open http://localhost:3000 in your browser. Click the canvas to capture the mouse and look around.

## Controls

| Key | Action |
|-----|--------|
| W / ↑ | Move forward |
| S / ↓ | Move backward |
| A / ← | Strafe left |
| D / → | Strafe right |
| Mouse | Look around |
| Space | Jump |
| Esc | Release mouse |
| P | Play / pause music |
| E | Next track |
| M | Mute / unmute |

## Project structure

```
src/
├── main.tsx              # Entry point
├── App.tsx               # Canvas, camera, tone mapping, Leva panel
├── shaders/
│   ├── sky.vert.glsl     # Sky dome vertex shader
│   └── sky.frag.glsl     # Procedural sunset / sky color
└── components/
    ├── Scene.tsx         # The whole world: ocean, sky, pool, columns,
    │                     #   pedestal, lighting, postprocessing, and the
    │                     #   first-person walk camera
    ├── MusicPlayer.tsx   # Boombox: distance-based volume, proximity detection
    ├── musicStore.ts     # Track list + play/pause/mute state (outside Canvas)
    └── UI.tsx            # HUD overlay + boombox music controls

public/
├── models/               # GLB props (bust, columns, boombox, ...)
├── textures/             # PBR textures (floor tiles, pool tiles, water normals)
├── sounds/music/         # Vaporwave / lo-fi tracks
└── fonts/                # Italianno display font
```

## Screenshots & QA

A headless capture tool renders the running scene to a PNG:

```bash
npm run dev                                            # serves :3000
npm run shot -- --out screenshots/sun.png --pitch 0.05 # capture a frame
```

Appending `?qa=1` to the URL hides the Leva panel and HUD for clean captures. See `scripts/shot.mjs` for all flags (`--yaw`, `--pitch`, `--frames`, etc.).

## License

ISC

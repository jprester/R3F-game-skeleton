# R3F Collision Skeleton

A minimal React Three Fiber project demonstrating first-person controls with physics-based collision detection using Rapier.

## Features

- **First-person controls** — WASD movement + mouse look
- **Physics collision** — Player collides with walls, furniture, and obstacles
- **Modular structure** — Reusable components for rooms and furniture
- **TypeScript** — Full type safety

## Tech Stack

- **React** + **Vite** — Fast development
- **Three.js** via **React Three Fiber** — 3D rendering
- **@react-three/drei** — Useful R3F helpers
- **@react-three/rapier** — Physics engine (Rapier)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Then open http://localhost:3000 in your browser.

## Controls

| Key | Action |
|-----|--------|
| W / ↑ | Move forward |
| S / ↓ | Move backward |
| A / ← | Strafe left |
| D / → | Strafe right |
| Mouse | Look around |
| Space | Jump |
| ESC | Release mouse |

## Project Structure

```
src/
├── main.tsx              # Entry point
├── App.tsx               # Canvas + Physics setup
└── components/
    ├── Scene.tsx         # Main scene composition
    ├── Player.tsx        # First-person controller with Rapier
    ├── Room.tsx          # Floor, walls, ceiling
    ├── Furniture.tsx     # Tables, chairs, obstacles
    └── UI.tsx            # HUD overlay
```

## Extending This Skeleton

This is designed as a foundation for the **Liminal Drift** project. Next steps:

1. Add PBR textures (from ambientCG/PolyHaven)
2. Implement procedural room generation
3. Add atmospheric effects (fog, bloom, flickering lights)
4. Integrate AI for scene generation

## License

MIT

Original prompt: This project is a simple 3d game environment using three.js and rapier. I am thinking of doing some more experiments with it and trying to create more engaging virtual worlds. In this branch I would like to build a simple 3d environment inspired by the poolroom liminal aesthetics. I added a example demo from the three.js example website that looks quite close to that idea (https://threejs.org/examples/#games_fps). Could you implement this example in the current code and also develop a plan how to add more elements to make this environment more realistic?

## Progress

- Inspected the current React Three Fiber/Rapier setup and the local `example/games_fps.html` reference.
- Planned implementation: preserve the existing Rapier first-person player, rebuild scene geometry as a tiled poolroom environment, add FPS-style throwable physics balls, and expose a compact `window.render_game_to_text` hook for verification.
- Implemented procedural tiled poolroom geometry, indoor/outdoor fog lighting, shallow water surfaces, elevated decks, columns, bridge slabs, low dividers, and fluorescent strips.
- Added FPS-style hold/release thrown physics balls using Rapier dynamic spheres.
- Added `window.render_game_to_text` and `window.advanceTime` hooks for automated inspection.
- `npm run build` passes. Vite reports a large bundle warning from the Three/Rapier bundle.
- Started the dev server at `http://127.0.0.1:3000/`.
- Attempted the `develop-web-game` Playwright client. It required a Chromium binary that was not installed for the bundled Playwright version; using local Chrome required approval to launch the app outside the sandbox, which the user questioned, so browser automation was skipped.
- Second pass for reference screenshots: reworked the poolroom toward a brighter off-white tiled hall with a large teal water surface, side walkways, cylindrical support columns, a central spiral stair around a round column, ceiling aperture, tunnel mouths, window slits, water caustic overlay, and reflection stripes.
- `npm run build` passes after the second-pass poolroom changes. Vite still reports the large Three/Rapier bundle warning.
- Third pass for water/tile feedback: replaced the static water material with an animated custom shader using vertex waves, procedural glints, shallow/deep teal blending, and caustic overlay. Fixed distorted floor/walkway tiles by cloning material textures per box face and calculating repeat counts from real face dimensions instead of using one repeat value per object.
- `npm run build` passes after the shader/tile fix. `git diff --check` passes.
- Browser automation added to the workflow using the in-app browser and the existing `develop-web-game` Playwright client. Added `<link rel="icon" href="data:,">` to avoid favicon 404 noise, guarded pointer-lock rejection so browser shells do not produce page errors, and added `?qa=1` throw support for automation when pointer lock is unavailable.
- Browser QA output in `output/web-game-poolroom-qa-mass`: movement and QA-mode thrown balls verified via screenshots and `render_game_to_text` states. Added `output` to `.gitignore`.
- Fourth pass for photo-realism direction: removed the spiral stair, tunnel masks, bright ring, stacked platforms, heavy dark block forms, and other liminal demo objects that did not fit the realistic indoor pool reference. Rebuilt the room as a cleaner rectangular pool hall with a recessed basin, pool coping, side decks, rectangular wall piers, ceiling beams, skylight panels, subtle downlight fixtures, wall light patches, and pool edge markings.
- Softened the lighting to read more like natural skylight: reduced direct-light intensity, raised neutral ambient/hemisphere fill, extended fog distance, disabled harsh ceiling cast shadows, neutralized tile colors, reduced wall light patch opacity, and calmed the water shader highlights/caustics.
- `npm run build` passes after the final realism pass. `git diff --check` passes.
- Browser QA output in `output/web-game-realism-full`: local Chrome automation completed with movement, jump, and QA-mode ball throwing. `render_game_to_text` states confirm the player remains grounded and balls stay in sane positions.
- Texture pass: wired the user-added `public/textures/wall/bahtroom-walls` white tile set and `public/textures/floor/pool-tiles` blue pool tile set into the room material system. The block materials now use color, normal, and roughness maps with per-face repeat scaling, so walls/decks/coping and pool basin surfaces render with PBR tile detail instead of only procedural canvas lines.
- Added QA-only UI hiding for `?qa=1` so browser screenshots show the scene without the instruction/audio overlays. Normal app UI remains unchanged at the regular URL.
- `npm run build` passes after the PBR texture pass. Browser QA output in `output/web-game-realism-full` was refreshed and visually inspected; the new tile maps are visible in the latest screenshots.
- UV cleanup pass: replaced default box UV islands with generated world-coordinate UVs for each face, so tile maps use consistent scale and origin across floors, walls, pillars, pool sides, and coping. Also removed coplanar overlap between the deck strips that was causing floor patching/z-fighting near corners. Latest browser screenshots in `output/web-game-realism-full` show cleaner floor/wall joins.
- `npm run build` passes after the UV cleanup. `git diff --check` passes. Browser QA completed with movement and QA throw actions.
- Floor/lighting polish pass: reduced PBR texture world size so individual tile squares render smaller, separated deck strips from the pool coping instead of overlapping them, lowered the coping into a thin flush trim, dropped the water surface slightly, and disabled deck/coping shadow casting to remove the jagged seam artifacts along the pool edge.
- Reworked the ceiling from large bright sky-hole panels into a continuous tiled ceiling with smaller recessed diffuser panels and slim strip fixtures. This keeps the light readable without the giant glowing card look.
- `npm run build` passes after the floor/lighting polish. Static QA screenshot refreshed in `output/web-game-realism-static`; interaction QA refreshed in `output/web-game-realism-full`; `git diff --check` passes.
- Switched wall/deck/coping to the newer `public/textures/wall/bahtroom-walls2` `Tiles105` set after inspection; it is flatter/cleaner than the previous beveled bathroom tile and reduces the heavy gray floor artifacts. Rebuilt and reran static plus interaction browser QA.
- Reset pass: removed the poolroom/FPS/physics/UI path from the rendered app and replaced it with a React Three Fiber adaptation of the official Three.js `webgl_shaders_ocean` example. The app now mounts only a Canvas with `Sky`, `Water`, PMREM sky environment, animated water time, and orbit controls.
- Downloaded the official Three.js `waternormals.jpg` texture into `public/textures/waternormals.jpg` so the ocean shader does not depend on a remote runtime fetch.
- `npm run build` passes after the ocean reset. Browser QA output in `output/web-game-ocean` shows a nonblank 1280x720 ocean render with advancing water time in `render_game_to_text`. `git diff --check` passes.
- Fly-controls pass: replaced orbit-only navigation with a camera-as-player fly controller. Click the canvas for pointer-lock mouse look; use WASD/arrow keys to move, Space/E to rise, and Shift/Q to descend. Added a minimal non-QA instruction overlay.
- `npm run build` passes after fly controls. Browser QA output in `output/web-game-ocean-fly` shows the camera position changing across movement bursts and a valid ocean screenshot from the moved camera.
- Floating floor pass: added a surreal rectangular slab hovering above the ocean. The top surface uses the `public/textures/wall/bahtroom-walls2` `Tiles105` color/normal/roughness maps with repeated UVs; the darker slab side/underside remains simple to keep the tile texture from stretching vertically.
- `npm run build` passes after the floating floor. Browser QA output in `output/web-game-ocean-floor` shows the tiled floor over water and confirms camera movement plus water animation in `render_game_to_text`. `git diff --check` passes.
- Grounded player pass: replaced the fly camera with a simple physical walking controller on the floating floor. The camera is fixed at eye height above the slab, WASD/arrows move horizontally, Space jumps with gravity, and platform bounds keep the player on the tiled surface. The text-state hook now reports player position, velocity, grounded state, jump count, and last jump peak.
- `npm run build` passes after the grounded walking controller. Browser QA output in `output/web-game-ocean-walk` confirms walking/strafe movement, jump registration, landing back on the floor height, water animation, and clean screenshots. `git diff --check` passes.

## Realism Plan

1. Add material depth: replace procedural tile texture with PBR tile sets, normal maps, roughness variation, chipped grout masks, and wetness gradients near pool edges.
2. Add water behavior: animated shader ripples, caustic light projection, subtle refraction, depth tinting, and splash/ripple responses when balls hit water.
3. Improve lighting: bake or approximate fluorescent panel falloff, add intermittent flicker, indirect blue bounce, and darker occluded corners under bridges.
4. Expand architecture: create modular poolroom pieces with arches, low tunnels, maintenance corridors, ladders, drains, raised platforms, and sightline reveals.
5. Add ambience: footsteps that switch between tile and shallow water, distant HVAC, drips, reverb zones, and occasional mechanical hum changes.
6. Add physical details: lane ropes, drains, vents, railings, tile caps, access doors, signs, pool ladders, floating debris, and wall stains.
7. Add navigation goals: collectible markers, locked maintenance doors, one-way drops, and landmark lighting so exploration feels intentional.
8. Add performance structure: instanced tile modules, merged static colliders, frustum-friendly chunks, and LOD for small detail props.

## Current Notes

- The dev server is running at `http://127.0.0.1:3000/`.
- Current direction is now the Three.js ocean shader basis rather than the poolroom scene. The old poolroom source files still exist in `src/components`, but they are no longer mounted by `src/App.tsx` or `src/components/Scene.tsx`.

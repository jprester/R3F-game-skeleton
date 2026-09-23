# Wayfarer — Quiet Entry

A small tactical magic infiltration prototype built with React Three Fiber, TypeScript, Vite and Rapier. Recover a transit core from a corporate research room and return to the extraction circle without letting security finish an alarm call.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000. Click **Enter operation** to capture the mouse. If an embedded browser blocks capture, choose **Use drag-look controls**, then hold the right mouse button to look around.

## Controls

| Input | Action |
| --- | --- |
| WASD | Move |
| Mouse | Look (right-drag in fallback mode) |
| Shift | Slow movement |
| Space | Jump |
| Left click | Motor Lock: 10 m range, 6 s immobilization, 4 s cooldown |
| Q | Blink: aim at clear floor within 7 m; 3 s cooldown |
| F | Seeker Crystal: target a visible guard within 14 m; 10 s hold on impact, 9 s cooldown |
| E | Recover the core / extract |
| M | Mute or unmute cues |
| Escape | Pause and release mouse |

Motor Lock stops a guard immediately. Seeker Crystal takes time to travel but follows its selected guard around cover after launch; it holds them longer on impact. Both leave guards conscious and alert afterward. Blink requires a visible floor and clear capsule-sized arrival volume, including clearance from guards. Invalid casts do not consume cooldowns. The pale floor ring previews valid arrivals.

Guards patrol fixed routes, detect within a 120-degree cone out to 10 m, and need 1.2 seconds of sight to confirm contact. Confirmed contact starts a 3-second alarm call. Walls and tall furniture block sight. Breaking contact reduces the call progress; either immobilization spell clears it on impact. Guards navigate through doorways toward the last seen position, search briefly, then return to patrol. A marker above each guard and the HUD communicate suspicion, alert, investigation and immobilization. Short synthesized cues signal contact and successful spells. Guards also make positional footstep sounds as they walk. The steps are softer and muffled through walls, and stop when a guard stops or is immobilized. Stereo headphones make their direction easier to hear. The right-hand passage provides a screened route through Operations. Slow movement is a precision control; guard hearing is not implemented.

Recover the core with E near its pedestal in Research, then press E in the entry room's extraction circle. Success and failure screens offer a new attempt. Pausing freezes guards, physics, cooldowns and the mission timer.

## Checks

```sh
npm run build
npm test
```

Tests require Node 22.6+ for TypeScript stripping. They cover wall occlusion, guard field of view, alarm interruption, Motor Lock recovery, investigation routes, Seeker pursuit around cover, safe destinations and actual Rapier grounding/targeting/arrival-volume queries.

## Code

- `src/game/mechanics.ts`: authored geometry, tuning constants and guard behavior.
- `src/game/Environment.tsx`: blockout environment, lights and signs.
- `src/game/Encounter.tsx`: input, player physics, guards, spells and mission loop.
- `src/game/GuardCharacter.tsx`: articulated security guard blockout and state animations.
- `src/game/GuardFootsteps.ts`: synthesized positional guard footsteps.
- `src/App.tsx` and `src/game/game.css`: briefing, HUD, pause and restart.
- `src/level/` and the original `src/components/`: preserved office skeleton for future asset/level integration; the prototype currently uses its own compact, fully loaded encounter.

This is a gameplay blockout. Guards have articulated movement, an alert radio gesture, a searching head turn, and a frozen pose while immobilized. They still use code-built meshes and grid navigation over the authored rooms. There is no gunplay, guard hearing or skeletal animation asset yet. Future work should focus on playtesting patrol and cooldown balance, then replacing the character blockout with an animated model.

# Wayfarer — Records Wing

A small tactical magic infiltration prototype built with React Three Fiber, TypeScript, Vite and Rapier. The default Records Wing mission has two side routes through Operations and Records to a vault: a direct, exposed security route on the left and a longer service route with cover on the right. Recover the transit core and return to the extraction circle without letting security finish an alarm call or a worker reach an alarm panel. The original Quiet Entry office remains selectable as a compact mechanics demo.

For design intent, development history, architecture, and continuation notes, see [HANDOFF.md](HANDOFF.md).

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000 (or the URL Vite prints if that port is occupied). Choose a level on the briefing screen, then click **Enter operation** to capture the mouse. If an embedded browser blocks capture, choose **Use drag-look controls**, then hold the right mouse button to look around.

## Controls

| Input | Action |
| --- | --- |
| WASD | Move |
| Mouse | Look (right-drag in fallback mode) |
| Shift | Slow, quieter movement |
| V | Life Sense: reveal everyone within 16 m through walls for 4 s, with where they are looking; 20 s cooldown |
| C | Toggle crouch: lower eye line (hides behind desks and crates), slowest and quietest movement; Space stands up |
| Space | Jump |
| Left click | Motor Lock: target a guard or worker within 10 m; 6 s immobilization, 4 s cooldown |
| Hold E (on an immobilized target) | Restraint: within 1.8 m, hold 1.5 s to bind them for the rest of the mission |
| Q | Blink: aim at clear floor within 7 m; 3 s cooldown |
| F | Seeker Crystal: target a visible guard or worker within 14 m; 10 s hold on impact, 9 s cooldown |
| R | Echo Lure: aim at clear floor within 12 m; draw nearby guards, 8 s cooldown |
| E | Recover the core / extract |
| M | Mute or unmute cues |
| Escape | Pause and release mouse |

After each attempt, a debrief lists time, detections, radio reports, calls cut off, hits, restraints and spells cast, and rates successful runs Ghost (never seen, nothing reported), Discreet (never seen, something reported) or Compromised (seen or hit). Your best run per level is remembered in this browser.

Motor Lock stops a target immediately. Seeker Crystal takes time to travel but follows its selected target around cover after launch; it holds them longer on impact. Both leave targets conscious afterward, and a guard who recovers without having been reported radios that he was attacked. Restraint turns an immobilized target into a permanent one: the target sits bound on the floor, never recovers or reports, but can still be discovered by other guards. Seated bodies are low enough to be hidden behind desks and crates. Blink requires a visible floor and clear capsule-sized arrival volume, including clearance from NPCs. Echo Lure projects a sound to a visible floor point, causing guards within hearing range to investigate without revealing the caster. Its amber ring previews valid placement. Invalid casts do not consume cooldowns. The pale floor ring previews valid Blink arrivals.

Guards patrol fixed routes, detect within a 120-degree cone out to 10 m, and need 1.2 seconds of clear, close, head-on sight to confirm contact. They check four points on the player (head, both shoulders, torso), so peeking past cover is partial exposure and confirms proportionally slower. Peripheral vision (beyond 30 degrees) and distance (beyond 4 m) each slow confirmation, down to half at the edge; crouching slows it by a further 40%. A brief glimpse only makes a guard stop and look toward the spot for a moment; he walks over to investigate once his suspicion passes 40% (20% when security is wary). The HUD under vitality shows stance and how much of you the most-exposed observer can see. Armed guards give a visible and audible .6-second aim before each shot, followed by a 1-second recovery. Each shot leaves a brief amber tracer. Breaking sight, Blinking behind cover or immobilizing the guard cancels the hit. The player has three vitality segments; three hits end the attempt. Unarmed guards call the alarm after 3 seconds of confirmed contact. Walls and tall furniture block sight and gunfire. Breaking contact reduces the call progress; either immobilization spell clears it on impact. Guards also investigate audible player footsteps, with a shorter hearing range through walls; holding Shift makes movement quieter. Hearing alone does not confirm contact or start an alarm. Guards navigate through doorways toward the last seen or heard position, search briefly, then return to patrol. A marker above each guard and the HUD communicate suspicion, alert, investigation and immobilization. Short synthesized cues signal contact, aiming, shots and successful spells. Guards also make positional footstep sounds as they walk. The steps are softer and muffled through walls, and stop when a guard stops or is immobilized. Stereo headphones make their direction easier to hear.

An unarmed office worker stands near the objective. They react to sight rather than footsteps or Echo Lure. Once they recognize the player, they run to the marked panel and take 4 seconds to report. Their beacon and the HUD show the flight and countdown. Motor Lock and Seeker Crystal stop them and clear an active report; after immobilization expires, a worker who already recognized the player resumes the attempt.

Recover the core with E near its pedestal, then press E in the entry room's extraction circle. Success and failure screens offer a new attempt or level switch. Pausing freezes guards, physics, cooldowns and the mission timer.

## Checks

```sh
npm run build
npm test
```

Tests require Node 22.6+ for TypeScript stripping. They cover level connectivity and NPC starts, wall occlusion, guard field of view and hearing, armed aiming and shot cancellation, Echo Lure investigations, alarm interruption, Motor Lock recovery, investigation routes, Seeker pursuit around cover, worker sight, route, report and immobilization, safe destinations and actual Rapier grounding/targeting/arrival-volume queries.

## Code

- `src/game/levels.ts`: level geometry, NPC placements, routes, lighting and signs.
- `src/game/mechanics.ts`: navigation, sight, tuning constants and guard behavior.
- `src/game/Environment.tsx`: blockout environment, lights and signs.
- `src/game/Encounter.tsx`: input, player physics, guards, spells and mission loop.
- `src/game/GuardCharacter.tsx`: articulated security guard blockout and state animations.
- `src/game/GuardFootsteps.ts`: synthesized positional guard footsteps.
- `src/game/worker.ts` and `src/game/WorkerCharacter.tsx`: civilian behavior and blockout model.
- `src/App.tsx` and `src/game/game.css`: briefing, HUD, pause and restart.
- `src/game/security.ts`: guard coordination: colleague discovery, radio calls, wary state and gunfire hearing.

This is a gameplay blockout. Guards have articulated movement, a firearm or alert radio gesture, a searching head turn, and a frozen pose while immobilized. They still use code-built meshes and grid navigation over the authored rooms. Gunfire is a simple line-of-sight prototype; the player has no firearm, and there are no skeletal animation assets yet. Future work should focus on playtesting patrol, hearing, combat and cooldown balance before expanding the map.

# Wayfarer game — development handoff

Updated 2026-09-23. This document is for a developer or coding model joining the project without the earlier conversation. Read [README.md](README.md) for player-facing controls and run instructions; this file covers intent, implementation, history, and safe continuation points. The repository, rather than this document, is authoritative if details diverge.

## Project intent

Wayfarer is a first-person tactical infiltration game in a modern or near-future corporate setting. The protagonist is an elite female operative from a technologically advanced magical civilization. Magic is engineered, standardized, quiet, and precise. She avoids contact when possible, uses nonlethal incapacitation when necessary, and escalates only when required. The fantasy is a professional magical special operator outmaneuvering competent modern security, not a conventional wizard with flashy spells.

The story premise is a covert recovery: a corporation has acquired a **Transit Core** from her world. She enters a corporate annex, retrieves it, and extracts. A larger mystery about how the core arrived is possible later, but the current goal is a small playable infiltration slice. The original concept also suggests spatial manipulation, perception editing, recon wisps, guardian shards, and defensive fields; these are **ideas, not implemented features**. Keep the visual language restrained: dark graphite, steel, subdued blue-white magical effects, brief spatial distortion, and corporate architecture. Large spectacle should signal an operational failure or deliberate escalation.

The user has preferred incremental, playable changes and has tested the prototype repeatedly. Preserve the compact **Quiet Entry** level as a mechanics demo while iterating on the main mission. Do not begin with a large Blender asset pipeline, open world, inventory, skill tree, or many new spells. The central prototype question remains whether **Blink + Motor Lock + Seeker Crystal + stealth** makes a distinctive, enjoyable loop.

## What is playable now

The game is a React Three Fiber / Three.js / TypeScript / Vite app with Rapier collision and physics. It starts on the **Records Wing** mission. The briefing can switch to **Quiet Entry**, the smaller original test office. Both are code-built blockouts, with no imported character or environment models.

- **Records Wing:** entry/extraction room, Operations and Records sections, then a vault holding the Transit Core. The left passage is direct and exposed to two armed guards. The right service passage makes a longer detour through offset doorways and shelving that blocks sight; two unarmed guards there can raise the alarm. Signs, floor strips, and cooler right-side lighting explain the split. A civilian worker near the core can run to a vault alarm panel. The crate in the entry room was moved away from the extraction ring. Low desk runs (1.5 m) beside both armed lanes on the left hide a crouched player but show a standing player's head, so the direct route is fast-and-exposed standing or slow-and-covered crouched. A low vault crate (1.3 m) by the right doorway lets the player approach the worker unseen. The service route's tall shelving is unchanged.
- **Quiet Entry:** smaller office with one armed guard, one alarm guard, an office worker, the core, and extraction. A 1.4 m lab bench in Research gives crouch cover beside the alarm guard's patrol, reached from the right doorway. It is retained for fast mechanic tests.
- **Objective:** press `E` near the core, return to the marked entry circle, then press `E` to extract. Success and failure screens support retries and level switching.
- **Failure:** three guard hits, a completed guard alarm call, a completed worker report, or falling out of the level. The game pauses while the briefing/menu is open.

### Controls and ability tuning

| Input | Current behavior |
| --- | --- |
| WASD / mouse | Move / look; pointer lock normally, right-drag fallback when capture is unavailable |
| Shift / Space | Quiet slower movement / jump (Space stands up from a crouch) |
| V — Life Sense | Reveals every guard and worker within 16 m of the cast point, through walls, for 4 s: state-coloured silhouette, head-height gaze line, full view cone and brighter focus cone on the floor. 20 s cooldown. Shows position and facing, never future patrol routes |
| C | Toggle crouch: eye drops from 1.56 m to about 1.0 m (below 1.1 m crates and 1.5 m desks), 1.5 m/s, 1 m footstep hearing range |
| LMB — Motor Lock | Instant, line-of-sight immobilization of a visible guard or worker within 10 m; lasts 6 s; 4 s cooldown |
| Hold E — Restraint | Aim at an immobilized guard or worker within 1.8 m and hold for 1.5 s; binds them for the rest of the mission. Resets if released, the aim leaves the target, or the lock expires first |
| Q — Blink | Teleport to visible floor within 7 m; 3 s cooldown. Requires a clear floor location and an unoccupied Rapier capsule arrival volume; invalid casts do not consume cooldown |
| F — Seeker Crystal | Launch at a visible guard or worker within 14 m; guided projectile follows around cover using pathfinding; holds target for 10 s on impact; 9 s cooldown |
| R — Echo Lure | Project a sound to visible floor within 12 m; nearby guards investigate the location without identifying the caster; 8 s cooldown |
| E / M / Escape | Interact / mute audio / pause |

Awareness arcs around the crosshair (`src/game/awareness.ts`, drawn by `ThreatRing` in `App.tsx`) point to every guard or worker whose attention is on the player, by screen angle relative to camera yaw: amber suspicious or glancing, blue investigating or checking a colleague, orange radioing, red alert. Brightness follows suspicion or radio progress. Incapacitated observers drop out.

When an attempt ends, the briefing panel shows a debrief (`src/game/debrief.ts`, `Debrief` in `App.tsx`): time, times spotted, times noticed, completed radio reports, calls cut off, hits taken, restraints and spells cast. `Encounter` counts these in `game.stats` (casts, restraints and hits through its `pulse()` helper; spotted on entering guard `alert` or the worker witnessing; cut-off calls as radios that vanish without a report). Successful runs are rated **Ghost** (never spotted, nothing reported), **Discreet** (never spotted, something reported) or **Compromised** (spotted or hit). The best run per level is kept in `localStorage` (`wayfarer.best.<level id>`): better rating first, then time. Failed runs show the same stats without a rating; the failure header reads OPERATION FAILED.

The HUD shows health, cooldowns, aiming warnings, detection/alarm or worker-report progress, targeting prompts, and short feedback messages. Blink and Echo Lure have floor previews. Spells have restrained visual and synthesized audio cues.

### Security and audio

Guards patrol authored routes, pausing 0.8 s at each end and then turning around in place at 1.4 rad/s (about 2 s for an about-face) before walking back; investigating guards turn at 3 rad/s. Guards only step off once roughly facing their heading, so direction changes are never instant. Their 120-degree view cone extends 10 m and requires 1.2 seconds of clear, close, head-on contact to confirm the player. Sight is sampled at four points (head, shoulders offset across the sight line, torso) by `playerExposure`. Shoulders only count when the head or torso is also visible (reciprocity: if the player's camera cannot see past a corner, a shoulder poking past it does not give them away; this removed shoulder-only leaks at 28% of crouched positions in the Records Wing); `sightRate` scales confirmation by that exposure, by peripheral angle (full rate inside 30 degrees, half at 60), by distance (full within 4 m, half at 10) and by 0.6 when crouched. A glimpse only becomes an investigation once suspicion reaches **0.4** (0.2 when wary); a shorter glimpse earns a 2 s glance toward the spot, after which the guard resumes patrol. The `curious` flag keeps an ongoing investigation from dropping back to a glance, and a colleague's contact report sets it. Suspicious guards turn toward a glimpse at 2.5 rad/s rather than snapping (8 rad/s once contact is confirmed), so peripheral sightings stay peripheral for a moment. Guards can shoot any exposed part (`canGuardHit`); full cover blocks fire. The worker uses the same model. Each guard and the worker publish `exposure` for the HUD's stance/visibility readout. Walls and tall furniture block sight. Armed guards then aim for **0.6 s** and fire; the recovery/cooldown is **1 s**. Shots use a line-of-sight hit check and a brief amber tracer, with a muzzle flash and positional shot sound. Sight loss, cover, Blink, or immobilization can prevent a hit. Unarmed guards call an alarm after **3 s** of confirmed contact; losing sight reduces progress. Guards can investigate last seen or heard positions and route through the authored doorways.

Player footsteps can attract guards. Shift reduces the hearing radius; walls muffle it. Hearing alone does not confirm the player or start an alarm. Guards also make positional walking sounds, tuned to be audible across the small office without being overly loud. Their steps stop when stationary or immobilized. Audio is synthesized via Web Audio rather than external sound files.

Guards coordinate over radio (`src/game/security.ts`). A guard who sees an immobilized colleague or worker walks to within 1.4 m and makes a **2 s** radio call. An armed guard who confirms contact radios the player's last position; the other guards who are not already engaged converge on it. Either completed call makes security **wary for 30 s**, cutting sight confirmation from 1.2 s to 0.8 s. Motor Lock or Seeker Crystal on the caller cancels the call. Their beacon blinks white and the left arm is raised while calling, which shows the player who to silence. Once started, a call continues after sight is lost. Each incapacitation is reported at most once. Sound investigations (footsteps, Echo Lure, gunfire) take priority over discovery, so a lure can pull a guard away from a body. Other guards hear gunfire within 14 m (reduced by walls) and investigate the shooter. Radio calls do not fail the mission; only the unarmed guards' alarm call does.

Restraint (`restrainGuard` / `restrainWorker`) is the permanent follow-up to an immobilization. A restrained NPC never recovers, radios, hears or shoots, and ignores further locks. The body is still evidence: guards discover and radio it like a frozen colleague. Because a restrained body sits on the floor, observers look for it at 0.7 m instead of 1.2 m, so desks and crates can hide it. A guard who recovers from Motor Lock or Seeker **without having been reported** makes a 2 s "attacked" radio call, which another lock cuts off (toggle: `RECOVERED_GUARDS_REPORT` in `mechanics.ts`). This makes the choice between *delay* (lock only) and *resolve* (lock then restrain, at close range) the core takedown decision.

The worker is unarmed. Sight builds recognition for roughly **0.7 s**; after that the worker runs to the level's alarm point and spends **4 s** reporting. Motor Lock or Seeker Crystal interrupts the report and freezes the worker. Once a previously alerted worker recovers, they resume trying to report. Echo Lure and footsteps do not distract the worker.

## Development history at a glance

1. Started from an existing Three.js/Rapier office skeleton and made a very small first-person infiltration encounter.
2. Added player movement, Rapier collision, guard patrol/sight/alarm behavior, core recovery, extraction, HUD, pause/restart, and safe Blink placement.
3. Added Motor Lock and a guided Seeker Crystal, with targeting and nonlethal hold behavior.
4. Added guard footsteps and player footstep hearing; tuned distance and loudness through user playtesting.
5. Added Echo Lure to redirect guard investigations, plus its floor preview and sound.
6. Added the unarmed office worker and their run-to-panel report behavior.
7. Armed selected guards, added telegraphed fire, three-segment player health, then shortened fire timing and added tracers at the user's request.
8. Extracted level data from the original office and built the larger selectable Records Wing mission. The original office became the Quiet Entry demo.
9. Moved a crate off the Records Wing extraction point; differentiated its two routes through geometry, guard roles, cover, signage, floor markings, and lighting.
10. Added guard coordination: discovery of incapacitated colleagues/worker, radio calls (downed and contact) that Motor Lock can interrupt, a facility-wide wary state, and gunfire hearing. Also straightened NPC paths, made nearest-cell lookup direct, and pooled shot tracers so simultaneous shots each draw.
11. Added Restraint (hold E on an immobilized target), seated bound poses, low-cover body hiding, and recovered guards reporting their own attack.
12. Added crouch, four-point partial exposure, peripheral/distance sight falloff, and the stance/visibility HUD.
13. Added low crouch cover to both maps (left-route desk runs, vault crate, Quiet Entry lab bench) and moved a Records Wing desk that the armed guard's patrol walked through.
14. Guards glance at brief glimpses instead of always investigating, turn gradually, and crouching slows confirmation more (0.6); tuned after playtesting found security investigated every distant peek.
15. Added directional awareness arcs and the Life Sense pulse (V).
16. Added the end-of-operation debrief with Ghost / Discreet / Compromised ratings and per-level personal bests.
17. Guards pause at patrol ends and turn gradually instead of snapping 180°, after playtesting found players caught by instant reversals.

## Code map and important invariants

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Top-level React app, level picker, briefing, HUD, pointer-lock/fallback flow, restart, shared audio context |
| `src/game/Encounter.tsx` | Active game loop: input, player body and camera, spell targeting/casts, guard and worker updates, shot resolution, objective and failure handling, visual/audio effects |
| `src/game/levels.ts` | **Active level source of truth:** solids, precomputed bounds, play area, spawn/core/extraction, guard routes and armed flags, worker/panel, lights, signs |
| `src/game/mechanics.ts` | Per-guard AI (including colleague checks and radio progress), vision, hearing, navigation, Blink-safe floor checks, Seeker flight, gameplay constants. `lockGuard` is the single entry point for immobilizing a guard. Most helpers take a `Level`; omitted level defaults to Quiet Entry for older tests/tools |
| `src/game/security.ts` | Guard-force coordination: advances all guards, resolves completed radio calls (converge on contact, wary state, mark victims reported) and gunfire hearing. `Encounter` calls `updateSecurity` once per frame |
| `src/game/worker.ts` | Worker state machine and report behavior; also receives the selected level |
| `src/game/Environment.tsx` | Renders `level.solids` as Rapier fixed colliders and meshes; also lights, signs, panel, extraction ring, route cues |
| `src/game/GuardCharacter.tsx`, `WorkerCharacter.tsx` | Code-built NPC blockouts and animations; character rigid bodies carry identifiers used by Rapier targeting rays |
| `src/game/debrief.ts` | Operation stats shape, rating rules, best-run comparison, time formatting |
| `src/game/awareness.ts` | Pure threat-indicator list and screen-angle math for the awareness arcs |
| `src/game/SenseMarker.tsx` | Life Sense overlay per NPC (depth-test-free silhouette, gaze line, view and focus cones); cones reuse the sight constants from `mechanics.ts` so the display matches detection |
| `src/game/GuardFootsteps.ts` | Synthesized positional guard walking audio |
| `src/game/game.css` | HUD and briefing appearance |
| `tests/*.test.mjs` | Mechanics, level connectivity, worker behavior, guard coordination (`security.test.mjs`), and selected real Rapier collision queries |

The unused chunk-based level system (`src/level/`), the original office components (`src/components/`) and `LEVEL_SYSTEM_SPEC.md` from the earlier skeleton were removed; they remain in git history before this change. All gameplay lives in `src/game/` and `src/App.tsx`. `src/main.tsx` mounts `App`.

When editing a level, keep the visible and physical world aligned: add walls, doors, and cover to `level.solids`, because those solids drive rendering, Rapier colliders, line-of-sight bounds, Blink safety, and the 0.5 m navigation grid. Decorative-only features belong in `Environment.tsx`. Check guard route endpoints and the worker's route against the new geometry. Routes from `pathTo` are smoothed: grid waypoints are dropped wherever a guard-sized body can walk straight, so tests should measure walked distance or segment crossings rather than waypoint counts. The tests in `tests/levels.test.mjs` specifically check clear NPC starts, patrols clear of furniture along their whole length, that each added crouch-cover spot hides a crouched player, two reachable approaches, the longer right detour, cover occlusion, and the worker's ability to reach the alarm.

Rapier handles the player and NPC collision bodies. The first Rapier targeting ray hit prevents spells from selecting NPCs through a wall. Blink combines a static floor/clearance check with a Rapier capsule intersection query to reject occupied arrivals. The `Encounter` component receives a `level` prop; `App` remounts the `Physics` tree when switching levels or restarting, which resets the encounter state.

## Running and checking

From the repository root:

```sh
npm install
npm run dev
npm test
npm run build
```

Vite requests port **3000** and may select another port if occupied; use the URL it prints. Node **22.6+** is needed for the TypeScript-stripping test runner. `npm run build` includes TypeScript checking. At this handoff, `npm test` passes **64 tests** and `npm run build` passes. The build emits a large-chunk warning, but no error. Browser pointer lock may be unavailable inside an embedded preview; the **Use drag-look controls** fallback is intentional. No development server needs to remain running after verification.

## Prototype limits and useful next work

The Records Wing is a gameplay blockout, not finished art. Patrols, hearing, cooldowns, guard fire, and the two route choices still need end-to-end human playtesting and balance. The next useful pass is to play both routes through core retrieval **and extraction**, note where the player is confused or overwhelmed, then tune cover and patrol timing. Preserve the distinct risk profiles: fast/exposed/armed on the left, longer/covered/alarm risk on the right. Prefer improving readable decisions before adding another large map or more powers.

Current guard gunfire is a sight-based hit event with a tracer effect, not a physical projectile simulation. Radio and wary timings (2 s call, 30 s wary, 0.8 s wary detection) are first-pass values and need playtesting, particularly whether a contact call makes the Records Wing converge too hard. Guard and worker models are primitive meshes; there is no animation or Blender asset pipeline. There is no save system, inventory, recon wisp, guardian shard, defensive field, or squad/cover AI beyond the radio coordination above. These are future possibilities, not missing parts of the current prototype.

For any continued work: make a small playable change, keep Quiet Entry working, update the active level data rather than the unused skeleton, run tests and build, and verify important visual or input changes in the game. Update this handoff when a major mechanic or architecture decision changes.

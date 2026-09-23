import { Vector3 } from 'three';
import { TOWER_LEVEL as level } from './src/game/levels.ts';
import { CAMERA_HOLD, CAMERA_SWEEP_RATE, CAMERA_OPTICS, createCameras } from './src/game/camera.ts';
import { playerExposure, safeFloor } from './src/game/mechanics.ts';
import { updateCamera } from './src/game/camera.ts';
const cams = createCameras(level);
const frames: number[][] = [];
for (let t = 0; t < 40; t += .1) { for (const c of cams) updateCamera(c, new Vector3(0, -50, 0), .1, level); frames.push(cams.map(c => c.facing)); }
const crouched = process.argv[2] === 'crouched';
console.log(`open office, ${crouched ? 'crouched' : 'standing'}; rows z 7.5 (south) .. -13.5 (north), cols x -11.5 .. 6.5`);
for (let z = 7.5; z >= -13.5; z -= .75) {
  let row = `${z.toFixed(1).padStart(6)} `;
  for (let x = -11.5; x <= 6.5; x += .5) {
    if (!safeFloor(new Vector3(x, 0, z), level)) { row += '#'; continue; }
    const p = new Vector3(x, crouched ? 1.01 : 1.56, z);
    let seen = 0;
    for (const facings of frames) if (cams.some((c, i) => playerExposure(c.position, facings[i], p, crouched, level, CAMERA_OPTICS) > 0)) seen++;
    const f = seen / frames.length;
    row += f === 0 ? '.' : f === 1 ? '@' : String(Math.min(9, Math.floor(f * 10)));
  }
  console.log(row);
}

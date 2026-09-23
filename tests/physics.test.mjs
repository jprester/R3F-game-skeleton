import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { solids } from '../src/game/mechanics.ts';

await RAPIER.init();
test('Rapier supports floor grounding, spell occlusion and occupied Blink rejection', () => {
  const world = new RAPIER.World({x: 0, y: -20, z: 0});
  try {
    for (const s of solids) {
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...s.position));
      world.createCollider(RAPIER.ColliderDesc.cuboid(...s.size.map(n => n / 2)), body);
    }
    const player = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, .91, 5.5).lockRotations());
    world.createCollider(RAPIER.ColliderDesc.capsule(.55, .3), player);
    const guard = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-3, .9, -3));
    guard.userData = {guard: 0};
    world.createCollider(RAPIER.ColliderDesc.capsule(.55, .28), guard);
    for (let i = 0; i < 60; i++) world.step();
    assert.ok(player.translation().y > .8 && player.translation().y < .92, 'capsule settles on floor');
    const grounded = world.castRay(new RAPIER.Ray(player.translation(), {x: 0, y: -1, z: 0}), .97, true, undefined, undefined, undefined, player);
    assert.ok(grounded, 'ground check excludes own body');
    const visibleGuard = world.castRay(new RAPIER.Ray({x:-3,y:1.5,z:2}, {x:0,y:0,z:-1}), 10, true, undefined, undefined, undefined, player);
    assert.equal(visibleGuard.collider.parent().userData.guard, 0);
    const wall = world.castRay(new RAPIER.Ray({x:0,y:1.5,z:2}, {x:0,y:0,z:-1}), 10, true, undefined, undefined, undefined, player);
    assert.notEqual(wall.collider.parent().handle, guard.handle, 'wall blocks spell');
    const shape = new RAPIER.Capsule(.55,.33); const rotation = {x:0,y:0,z:0,w:1};
    assert.ok(world.intersectionWithShape({x:-3,y:.92,z:-3},rotation,shape,undefined,undefined,undefined,player), 'guard occupies arrival volume');
    assert.equal(world.intersectionWithShape({x:3.5,y:.92,z:-5},rotation,shape,undefined,undefined,undefined,player),null, 'service passage is clear');
  } finally { world.free(); }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../game/vendor/three/three.module.min.js';
import { createCapture, createFixedClock, playerView } from '../game/runtime.js';
import { createInput } from '../game/input.js';
import { box, disposeModel } from '../game/geometry.js';
import { makeGuard } from '../game/actors.js';
import { buildStation, blocked, walk } from '../game/station.js';
import { interaction, spawns, startMission, stepMission } from '../game/mission.js';

const silent = () => {};
const miss = () => null;

function key(target, type, code) {
  const event = new Event(type);
  Object.assign(event, { code, repeat: false });
  target.dispatchEvent(event);
}

function controls() {
  const target = new EventTarget();
  return { target, input: createInput(target, () => true) };
}

test('slow frames preserve active time, movement, and the mission deadline', () => {
  function simulate(frameMilliseconds) {
    const mission = startMission([]);
    const { input } = controls();
    input.keys.add('KeyW');
    const clock = createFixedClock(0);
    for (let time = frameMilliseconds; time <= 2000; time += frameMilliseconds) {
      clock.advance(time, () => mission.phase === 'play',
        dt => stepMission(mission, input, dt, miss, silent));
    }
    return mission;
  }
  const fast = simulate(20);
  const slow = simulate(250);
  assert(Math.abs(fast.elapsed - 2) < 1e-8);
  assert(Math.abs(slow.elapsed - fast.elapsed) < 1e-8);
  assert(Math.abs(slow.player.z - fast.player.z) < 1e-8);
  const mission = startMission([]);
  const { input } = controls();
  const clock = createFixedClock(0);
  clock.advance(106000, () => mission.phase === 'play',
    dt => stepMission(mission, input, dt, miss, silent));
  assert.equal(mission.phase, 'lost');
  assert(mission.elapsed < 105.02);
  clock.reset(200000);
  let steps = 0;
  clock.advance(200010, () => true, () => steps++);
  assert.equal(steps, 0, 'reset discards paused time');
});

test('render pose and shooting ray share the bobbed camera eye', () => {
  const camera = new T.PerspectiveCamera(65, 1, .07, 230);
  camera.rotation.order = 'YXZ';
  const mission = startMission([]);
  mission.stride = Math.PI / 2;
  mission.player.pitch = .08;
  playerView(camera, mission);
  const ray = new T.Raycaster();
  ray.setFromCamera(new T.Vector2(), camera);
  assert.equal(ray.ray.origin.y, camera.position.y);
  assert(Math.abs(ray.ray.origin.y - 1.598) < 1e-10);
  assert(ray.ray.direction.distanceTo(camera.getWorldDirection(new T.Vector3())) < 1e-10);
});

test('repeated guard cleanup disposes owned resources and preserves shared station resources', () => {
  const scene = new T.Scene();
  const stationBox = box(scene, 0, 0, 0, 1, 1, 1, 0x343735);
  let sharedDisposals = 0;
  stationBox.geometry.addEventListener('dispose', () => sharedDisposals++);
  stationBox.material.addEventListener('dispose', () => sharedDisposals++);
  for (let i = 0; i < 20; i++) {
    const guard = makeGuard(scene, 0, 4, 0);
    let ownedDisposals = 0;
    guard.torso.material.addEventListener('dispose', () => ownedDisposals++);
    guard.warningLight.material.addEventListener('dispose', () => ownedDisposals++);
    // Also cover future guard meshes that own their geometry.
    const unique = new T.Mesh(new T.SphereGeometry(.1), guard.torso.material);
    unique.geometry.addEventListener('dispose', () => ownedDisposals++);
    guard.model.add(unique);
    disposeModel(guard.model);
    assert.equal(ownedDisposals, 3);
    assert.equal(guard.model.parent, null);
    assert.equal(guard.model.children.length, 0);
  }
  assert.equal(sharedDisposals, 0);
  assert.equal(scene.children.length, 1);
});

test('short actions survive key-up and empty fire never creates muzzle flash', () => {
  const { target, input } = controls();
  const mission = startMission([]);
  mission.player.ammo = mission.player.reserve = 0;
  const down = new Event('mousedown');
  const up = new Event('mouseup');
  Object.assign(down, { button: 0 });
  Object.assign(up, { button: 0 });
  target.dispatchEvent(down);
  target.dispatchEvent(up);
  assert(input.fire);
  stepMission(mission, input, 1 / 60, miss, silent);
  assert.equal(mission.muzzle, 0);
  assert(!input.fire);
  mission.fire = 0;
  mission.player.ammo = 1;
  target.dispatchEvent(down);
  target.dispatchEvent(up);
  stepMission(mission, input, 1 / 60, miss, silent);
  assert(mission.muzzle > 0);
  assert.equal(mission.player.ammo, 0);
  key(target, 'keydown', 'KeyR');
  key(target, 'keyup', 'KeyR');
  assert(input.reload);
  mission.player.reserve = 12;
  stepMission(mission, input, 1 / 60, miss, silent);
  assert(mission.reload > 0);
  input.reset();
  assert(!input.fire && !input.reload && !input.interact && !input.keys.size);
});

test('capture rejects late acquisition after blur and clears held input on errors', async () => {
  const doc = new EventTarget();
  const host = new EventTarget();
  let focus = true;
  doc.hidden = false;
  doc.hasFocus = () => focus;
  doc.pointerLockElement = null;
  doc.exitPointerLock = () => {
    doc.pointerLockElement = null;
    doc.dispatchEvent(new Event('pointerlockchange'));
  };
  const attempts = [];
  const view = {
    requestPointerLock: () => new Promise((resolve, reject) => attempts.push({ resolve, reject })),
  };
  const input = createInput(host, () => capture.captured());
  let running = false;
  const capture = createCapture(view, doc, host, input, () => true, active => { running = active; });
  const first = capture.request();
  focus = false;
  host.dispatchEvent(new Event('blur'));
  doc.pointerLockElement = view;
  doc.dispatchEvent(new Event('pointerlockchange'));
  attempts[0].resolve();
  await first;
  assert(!running && !capture.captured());
  assert.equal(doc.pointerLockElement, null);

  focus = true;
  const next = capture.request();
  doc.pointerLockElement = view;
  doc.dispatchEvent(new Event('pointerlockchange'));
  attempts[1].resolve();
  await next;
  key(host, 'keydown', 'KeyW');
  key(host, 'keydown', 'KeyE');
  assert(input.keys.size && input.interact);
  doc.pointerLockElement = null;
  doc.dispatchEvent(new Event('pointerlockerror'));
  assert(!running && !input.keys.size && !input.interact);

  const failed = capture.request();
  attempts[2].reject(new Error('capture refused'));
  await failed;
  assert(!running && !capture.captured());
  const retry = capture.request();
  assert.equal(attempts.length, 4);
  attempts[3].reject(new Error('capture refused'));
  await retry;
});

test('station boundaries, bot collision, and normal extraction route', () => {
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({ fillRect() {}, fillText() {} }),
    }),
  };
  const scene = new T.Scene();
  buildStation(scene);
  for (const [x, z, dx, dz] of [[14.2, 18, 9, 0], [0, 22.6, 0, 9], [0, -32.6, 0, -9]]) {
    const unit = { x, z };
    walk(unit, dx, dz);
    assert(!blocked(unit.x, unit.z), 'boundary traversal');
  }
  const unit = { x: 8, z: -26 };
  walk(unit, -8, 0);
  assert(unit.x > 7, 'thin bay wall stops long movement');

  const guards = spawns.map(([x, z], i) => makeGuard(scene, x, z, i));
  const patrol = startMission(guards);
  patrol.player.x = 0;
  patrol.player.z = 22;
  const { input } = controls();
  for (let i = 0; i < 3000 && patrol.phase === 'play'; i++) {
    stepMission(patrol, input, 1 / 60, miss, silent);
    assert(guards.every(guard => !blocked(guard.x, guard.z)), 'bot entered solid geometry');
  }

  const mission = startMission(spawns.map(([x, z], i) => makeGuard(scene, x, z, i)));
  const { target, input: routeInput } = controls();
  function travel(x, z) {
    let steps = 0;
    while (Math.hypot(mission.player.x - x, mission.player.z - z) > .11) {
      assert(++steps < 1200, 'route stuck');
      mission.player.yaw = Math.atan2(mission.player.x - x, mission.player.z - z);
      routeInput.keys.add('KeyW');
      stepMission(mission, routeInput, 1 / 60, miss, silent);
      assert.equal(mission.phase, 'play');
      assert(!blocked(mission.player.x, mission.player.z));
    }
    routeInput.keys.clear();
  }
  for (const [x, z] of [[12.65, 18], [12.65, -21.7], [2, -21.7], [2, -23]]) travel(x, z);
  assert(interaction(mission));
  key(target, 'keydown', 'KeyE');
  key(target, 'keyup', 'KeyE');
  stepMission(mission, routeInput, 1 / 60, miss, silent);
  assert(mission.recovered);
  for (const [x, z] of [[2, -21.7], [12.65, -21.7], [12.65, 18]]) travel(x, z);
  assert(interaction(mission));
  key(target, 'keydown', 'KeyE');
  key(target, 'keyup', 'KeyE');
  stepMission(mission, routeInput, 1 / 60, miss, silent);
  assert.equal(mission.phase, 'won');
  console.log('Extraction route', mission.elapsed.toFixed(2), 'seconds;', mission.player.hp, 'HP');
});

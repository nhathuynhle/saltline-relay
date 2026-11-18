import * as T from './vendor/three/three.module.min.js';
import { buildStation, shotObstacles, core, dock } from './station.js';
import { makeGuard, makeCarbine } from './actors.js';
import { unlockAudio, sound } from './audio.js';
import { distance, duration, interaction, spawns, startMission, stepMission } from './mission.js';
import { createInput } from './input.js';
import { disposeModel } from './geometry.js';
import { createCapture, createFixedClock, playerView } from './runtime.js';

const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map(element => [element.id, element]));
const scene = new T.Scene();
scene.background = new T.Color(0x829d9e);
scene.fog = new T.FogExp2(0x829d9e, .007);
scene.add(new T.HemisphereLight(0xdce5e3, 0x425754, 1.8));
const sun = new T.DirectionalLight(0xffd7a4, 2.65);
sun.position.set(-34, 19, -12);
sun.castShadow = true;
sun.shadow.mapSize.set(1536, 1536);
Object.assign(sun.shadow.camera, { left: -37, right: 37, top: 37, bottom: -37, far: 100 });
sun.shadow.bias = -.00025;
sun.shadow.normalBias = .037;
scene.add(sun);

const renderer = new T.WebGLRenderer({ canvas: ui.view, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFShadowMap;
renderer.autoClear = false;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = .95;
const camera = new T.PerspectiveCamera(65, 1, .07, 230);
camera.rotation.order = 'YXZ';
const propScene = new T.Scene();
propScene.add(new T.HemisphereLight(0xffefe2, 0x425f50, 2.8));
const propLight = new T.DirectionalLight(0xffdead, 2);
propLight.position.set(-1, 2, 1);
propScene.add(propLight);
const propCamera = new T.PerspectiveCamera(56, 1, .025, 5);
const carbine = makeCarbine(propScene);
const { payload, beacon, animateCoast } = buildStation(scene);
const ray = new T.Raycaster();
let mission;
let paused = true;
const input = createInput(window, () => mission?.phase === 'play' && capture.captured());
const clock = createFixedClock();
const capture = createCapture(ui.view, document, window, input,
  () => mission?.phase === 'play',
  active => {
    paused = !active;
    clock.reset();
    if (mission?.phase !== 'play') return;
    ui.pause.hidden = ui.overlay.hidden = active;
  });

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = propCamera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  propCamera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

function lock() {
  unlockAudio();
  capture.request();
}

function deploy() {
  capture.suspend();
  if (mission) for (const guard of mission.guards) disposeModel(guard.model);
  mission = startMission(spawns.map(([x, z], i) => makeGuard(scene, x, z, i)));
  input.reset();
  clock.reset();
  payload.visible = true;
  ui.brief.hidden = ui.report.hidden = true;
  ui.hud.hidden = ui.overlay.hidden = false;
  paused = true;
  ui.pause.hidden = false;
  document.body.classList.add('active');
  lock();
}
ui.start.onclick = ui.retry.onclick = deploy;
ui.resume.onclick = lock;
ui.view.onclick = () => {
  if (paused) lock();
};
addEventListener('mousemove', event => {
  if (mission?.phase !== 'play' || !capture.captured()) return;
  const p = mission.player;
  p.yaw -= event.movementX * .0023;
  p.pitch = T.MathUtils.clamp(p.pitch - event.movementY * .0021, -1.12, 1.12);
});

function aim(s) {
  const p = s.player;
  playerView(camera, s);
  ray.setFromCamera(new T.Vector2(), camera);
  const targets = new Map();
  for (const guard of s.guards) {
    if (guard.hp <= 0 || distance(p, guard) > 48) continue;
    guard.model.position.set(guard.x, 0, guard.z);
    guard.model.updateMatrixWorld();
    targets.set(guard.head, { guard, head: true });
    targets.set(guard.torso, { guard, head: false });
  }
  scene.updateMatrixWorld(true);
  const [first] = ray.intersectObjects([...targets.keys(), ...shotObstacles()], false);
  return first ? targets.get(first.object) : null;
}

function display(s) {
  const p = s.player;
  ui.objective.textContent = s.recovered ? 'Extract at the dock' : 'Recover the data core';
  const remaining = Math.max(0, Math.ceil(duration - s.elapsed));
  ui.clock.textContent = Math.floor(remaining / 60) + ':' + String(remaining % 60).padStart(2, '0');
  ui.health.textContent = p.hp + '%';
  ui.vitals.style.width = p.hp + '%';
  ui.ammo.textContent = s.reload ? 'Reloading…' : p.ammo + ' / ' + p.reserve;
  const target = s.recovered ? dock : core;
  const meters = distance(p, target);
  let bearing = Math.atan2(p.x - target.x, p.z - target.z) - p.yaw;
  bearing = Math.atan2(Math.sin(bearing), Math.cos(bearing));
  const arrow = ['↑', '↖', '←', '↙', '↓', '↘', '→', '↗'];
  const heading = (Math.round(-p.yaw * 180 / Math.PI) % 360 + 360) % 360;
  ui.bearing.textContent = (s.recovered ? 'DOCK' : 'DATA CORE') + ' · ' + heading + '°';
  ui.waypoint.textContent = arrow[(Math.round(bearing / (Math.PI / 4)) + 8) % 8] + ' ' + Math.round(meters) + ' M';
  const warning = s.guards.some(guard => guard.hp > 0 && guard.warning > 0);
  ui.notice.textContent = interaction(s) || (warning ? 'HOSTILE AIMING · STRAFE OR TAKE COVER' : s.messageTime ? s.message : '');
  ui.reticle.classList.toggle('hit', !!s.hit);
  ui.impact.style.opacity = s.impact * 2.45;
}

function finish(s) {
  capture.suspend();
  const won = s.phase === 'won';
  sound(won ? 'won' : 'lost');
  ui.hud.hidden = true;
  ui.impact.style.opacity = 0;
  ui.pause.hidden = true;
  ui.overlay.hidden = ui.report.hidden = false;
  ui.result.textContent = won ? 'Core delivered' : 'Signal lost';
  ui.debrief.textContent = won ? 'Relay 06 is silent. Its data is aboard the launch. Extraction took ' + s.elapsed.toFixed(1) + ' seconds.' :
    s.player.hp ? 'The relay went dark. Follow the teal seawall markers to the core, then return to the green dock beacon.' : 'The patrol stopped your extraction. Amber lamps signal an aimed shot. Keep moving or break sight behind cargo.';
  const score = (won ? 1000 + Math.floor(duration - s.elapsed) * 10 : 0) + s.kills * 125 + s.heads * 75;
  const stats = [['SCORE', score], ['GUARDS', s.kills], ['HEADSHOTS', s.heads]];
  ui.stats.replaceChildren(...stats.map(([label, value]) => {
    const tile = document.createElement('div');
    const name = document.createElement('small');
    const count = document.createElement('strong');
    name.textContent = label;
    count.textContent = value;
    tile.append(name, count);
    return tile;
  }));
}

function render(now) {
  animateCoast(now / 1000);
  const s = mission;
  const active = s?.phase === 'play';
  if (active) {
    playerView(camera, s);
    for (const guard of s.guards) {
      guard.model.visible = guard.hp > 0;
      guard.model.position.set(guard.x, 0, guard.z);
      guard.boots.forEach((boot, i) => { boot.rotation.x = Math.sin(s.elapsed * 9 + guard.phase + i * Math.PI) * .34; });
      guard.torso.material.emissive.setHex(guard.flash > 0 ? 0xc74314 : 0);
      guard.warningLight.visible = guard.hp > 0 && guard.warning > 0;
    }
    carbine.model.position.set(.24 + Math.sin(s.stride / 2) * .012,
      -.20 + Math.cos(s.stride) * .012 - s.reload * .28, s.muzzle * .7);
    carbine.model.rotation.x = s.reload * -.42;
    carbine.flash.visible = s.muzzle > 0;
    payload.visible = !s.recovered;
    payload.rotation.y = s.elapsed * 1.4;
    beacon.visible = !s.recovered || Math.sin(s.elapsed * 5) > -.4;
    display(s);
  } else {
    const t = now * .00019;
    camera.position.set(15 + Math.sin(t) * 2, 6.3, 19 + Math.cos(t) * 2);
    camera.lookAt(-1.0, 3.0, -13);
  }
  renderer.clear();
  renderer.render(scene, camera);
  if (active && !paused) {
    renderer.clearDepth();
    renderer.render(propScene, propCamera);
  }
}

function frame(now) {
  const wasPlaying = mission?.phase === 'play';
  clock.advance(now,
    () => mission?.phase === 'play' && capture.captured(),
    dt => stepMission(mission, input, dt, aim, sound));
  if (wasPlaying && mission.phase !== 'play') finish(mission);
  render(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

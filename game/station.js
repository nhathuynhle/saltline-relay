import * as T from './vendor/three/three.module.min.js';
import { box, lamp } from './geometry.js';
import { buildCoast } from './coast.js';

export const dock = { x: 10.8, z: 18, range: 4 };
export const core = { x: 2, z: -26, range: 3.6 };
const walls = [];
const concrete = 0x87897d;
const cream = 0xe3d3af;
const teal = 0x155450;
const orange = 0xe96b36;
const dark = 0x233734;

function solid(scene, x, z, w, h, d, color) {
  const mesh = box(scene, x, h / 2, z, w, h, d, color);
  walls.push({ x, z, w, h, d, mesh });
  return mesh;
}

function sign(scene, x, y, z, text, width, back = '#163835') {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = back;
  ctx.fillRect(0, 0, 768, 128);
  ctx.fillStyle = '#f1d9b4';
  ctx.font = 'bold 68px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 384, 67, 720);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const mesh = new T.Mesh(new T.PlaneGeometry(width, width / 6), new T.MeshBasicMaterial({ map: texture }));
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
}

function tower(scene, x, z) {
  for (const dx of [-1.45, 1.45]) {
    for (const dz of [-1.08, 1.08]) box(scene, x + dx, 6.1, z + dz, .16, 12.2, .16, dark);
  }
  for (let y = 2; y <= 12; y += 2) {
    box(scene, x, y, z, 3.2, .18, 2.5, y === 12 ? orange : dark);
    for (const dz of [-1.08, 1.08]) {
      const brace = box(scene, x, y - 1, z + dz, .11, 3.5, .11, orange);
      brace.rotation.z = y % 4 ? 0.96 : -0.96;
    }
  }
  box(scene, x, 13.15, z, .13, 2.5, .13, orange);
  for (const y of [12.6, 13.1, 13.6]) box(scene, x, y, z, 2.3, .05, .09, cream);
}

export function buildStation(scene) {
  walls.length = 0;
  const animateCoast = buildCoast(scene);
  box(scene, 0, -.35, -5, 30, .69, 59, concrete);
  for (let z = -31; z <= 23; z += 4.5) {
    box(scene, 0, .004, z, 29.8, .008, .025, 0x8e8777);
    for (const x of [-13.4, 13.4]) {
      box(scene, x, .014, z, .13, .014, 2.7, cream);
      box(scene, Math.sign(x) * 14.7, .51, z, .13, 1.05, .13, teal);
    }
  }
  for (const x of [-14.7, 14.7]) {
    box(scene, x, .92, -5, .09, .10, 57, teal);
    box(scene, x, .45, -5, .06, .06, 57, teal);
  }

  for (const side of [-1, 1]) {
    const x = side * 8.2;
    solid(scene, x, -7.8, 6.2, 4.1, 13.7, side === 1 ? 0x426867 : concrete);
    box(scene, x, 4.12, -7.8, 6.7, .28, 14.2, dark);
    box(scene, x, 1.4, -.90, 6.13, .17, .025, orange);
    for (let slot = -2; slot <= 2; slot++) {
      box(scene, x + slot * .99, 3.45, -.90, .65, .46, .028, teal);
      box(scene, x - side * 3.11, 3.22, -7.8 + slot * 2.30, .032, .62, 1.32, dark);
    }
    solid(scene, side * 8.7, 6.3, 3.9, 2.45, 4.7, side === 1 ? orange : teal);
    for (let slat = -4; slat <= 4; slat++) box(scene, side * 8.7 + slat * .4, 1.23, 8.66, .06, 2.45, .08, dark);
    box(scene, side * 8.7, 2.46, 6.3, 4.05, .10, 4.8, cream);
  }

  for (const [x, z, w, h, d] of [[-1.8, 3, 4, 1.2, 1.5], [2.4, -5, 4.1, 1.85, 2],
    [-2.4, -12, 4.1, 1.75, 2], [6.7, -19, 3.3, 1.9, 1.9], [-4.7, -21, 2.8, 2.25, 3]]) {
    solid(scene, x, z, w, h, d, teal);
    box(scene, x, h, z, w + .1, .10, d + .1, orange);
    for (const dx of [-.36, .36]) box(scene, x + dx * w, h / 2, z + d / 2, .13, h, .08, dark);
  }
  solid(scene, 2, -29.2, 9.6, 4, .5, dark);
  for (const x of [-2.6, 6.6]) solid(scene, x, -26.25, .45, 4, 6, concrete);
  box(scene, 2, 4.08, -26.3, 10, .32, 6.55, teal);
  box(scene, 2, 3.63, -23.05, 10, .75, .26, teal);
  sign(scene, 2, 3.66, -22.89, '06 / RELAY CONTROL', 4.3);
  lamp(scene, 2, 3.22, -22.88, 5.7, .07, .10, 0xffaa52);
  sign(scene, 8.2, 2.55, -.85, 'SERVICE  /  02', 4.9);
  sign(scene, -8.2, 2.55, -.85, 'INTAKE  /  01', 4.9);
  sign(scene, 8.7, 1.64, 8.73, 'SALTLINE', 2.4);
  tower(scene, 9.1, -28.7);
  tower(scene, -11.3, -19.7);
  for (let z = -20; z <= 17; z += 2) {
    box(scene, 12.65, .028, z, .16, .022, 1.2, 0x9bd9c3).castShadow = false;
  }
  for (let x = 4; x <= 12; x += 2) {
    box(scene, x, .028, -21.7, 1.2, .022, .16, 0x9bd9c3).castShadow = false;
  }

  for (const [position, color] of [[dock, teal], [core, orange]]) {
    const { x, z } = position;
    box(scene, x, .025, z, 3.4, .048, 3.4, dark);
    for (const offset of [-1.67, 1.67]) {
      box(scene, x + offset, .056, z, .10, .035, 3.4, color);
      box(scene, x, .056, z + offset, 3.4, .035, .10, color);
    }
  }
  solid(scene, core.x, core.z, .91, .9, .78, dark);
  const payload = box(scene, core.x, 1.14, core.z, .72, .43, .61, orange);
  payload.material = payload.material.clone();
  payload.material.emissive.setHex(0xb04412);
  payload.material.emissiveIntensity = .75;
  for (const x of [dock.x - 1.6, dock.x + 1.6]) {
    box(scene, x, 1.45, 19.6, .16, 2.9, .16, teal);
    lamp(scene, x, 2.92, 19.6, .29, .21, .29, 0x78f5cc);
  }
  sign(scene, dock.x, 2.68, 19.69, 'D0 / DOCK', 2.7).rotation.y = Math.PI;
  const beacon = lamp(scene, dock.x, 3.02, 19.6, 2.68, .10, .12, 0x8dffd8);
  return { payload, beacon, animateCoast };
}

export function blocked(x, z, radius = .3) {
  return Math.abs(x) > 14.55 - radius || z < -33 + radius || z > 23 - radius ||
    walls.some(wall => Math.abs(x - wall.x) < wall.w / 2 + radius && Math.abs(z - wall.z) < wall.d / 2 + radius);
}

export function walk(unit, dx, dz) {
  // Subdivide longer callers too, so thin bay walls cannot be crossed in one move.
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / .15));
  for (let i = 0; i < steps; i++) {
    if (!blocked(unit.x + dx / steps, unit.z)) unit.x += dx / steps;
    if (!blocked(unit.x, unit.z + dz / steps)) unit.z += dz / steps;
  }
}

export function clearShot(x, z, tx, tz, height = 1.45) {
  return !walls.some(wall => wall.h >= height && crosses(wall, x, z, tx, tz));
}

function crosses(wall, x, z, tx, tz) {
  let enter = 0;
  let exit = 1;
  for (const [start, end, center, half] of [[x, tx, wall.x, wall.w / 2], [z, tz, wall.z, wall.d / 2]]) {
    const delta = end - start;
    const offset = start - center;
    if (!delta) {
      if (Math.abs(offset) >= half) return false;
      continue;
    }
    const a = (-half - offset) / delta;
    const b = (half - offset) / delta;
    enter = Math.max(enter, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
    if (enter >= exit) return false;
  }
  return true;
}

export const shotObstacles = () => walls.map(wall => wall.mesh);

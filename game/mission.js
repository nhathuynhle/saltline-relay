import { clearShot, walk, core, dock } from './station.js';

const magazineSize = 12;
export const duration = 105;
export const spawns = [[.65, 4], [-3.5, -5], [2, -17], [10, -18]];
export const roles = ['Yard runner', 'Intake patrol', 'Relay sentry', 'Seawall watch'];
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function startMission(guards) {
  return {
    player: { x: 0, z: 18, yaw: 0, pitch: 0, hp: 100, ammo: magazineSize, reserve: 72 },
    guards, elapsed: 0, recovered: false, kills: 0, heads: 0, phase: 'play',
    fire: 0, muzzle: 0, reload: 0, impact: 0, hit: 0, messageTime: 0, message: '', stride: 0,
  };
}

export function interaction(s) {
  const target = s.recovered ? dock : core;
  const p = s.player;
  if (distance(p, target) > target.range || !clearShot(p.x, p.z, target.x, target.z, 1.02)) return '';
  return s.recovered ? 'E · BOARD EXTRACTION LAUNCH' : 'E · DISCONNECT DATA CORE';
}

function message(s, text) {
  s.message = text;
  s.messageTime = 1.35;
}

export function stepMission(s, input, dt, aim, sound) {
  if (s.phase !== 'play') return;
  const p = s.player;
  s.elapsed += dt;
  if (s.elapsed >= duration) {
    s.phase = 'lost';
    return;
  }
  for (const key of ['fire', 'muzzle', 'impact', 'hit', 'messageTime']) s[key] = Math.max(0, s[key] - dt);
  if (s.reload) {
    s.reload = Math.max(0, s.reload - dt);
    if (!s.reload) {
      const rounds = Math.min(magazineSize - p.ammo, p.reserve);
      p.ammo += rounds;
      p.reserve -= rounds;
      sound('ready');
    }
  }
  const forward = Number(input.keys.has('KeyW')) - Number(input.keys.has('KeyS'));
  const strafe = Number(input.keys.has('KeyD')) - Number(input.keys.has('KeyA'));
  const length = Math.hypot(forward, strafe);
  if (length) {
    const speed = dt * 5.7 / length;
    walk(p, (strafe * Math.cos(p.yaw) - forward * Math.sin(p.yaw)) * speed,
      (-forward * Math.cos(p.yaw) - strafe * Math.sin(p.yaw)) * speed);
    s.stride += dt * 10;
  }
  if (input.reload || (input.fire && !p.ammo && !s.fire)) {
    input.consume('reload');
    if (!s.reload && p.reserve && p.ammo < magazineSize) {
      s.reload = 1.05;
      sound('reload');
    }
  }
  if (input.fire && !s.fire && !s.reload) {
    input.consume('fire');
    s.fire = .17;
    if (p.ammo) {
      s.muzzle = .055;
      p.ammo -= 1;
      sound('shot');
      const target = aim(s);
      if (target) {
        const { guard, head } = target;
        guard.hp -= head ? 120 : 38;
        s.hit = .17;
        sound(head ? 'head' : 'hit');
        if (guard.hp <= 0) {
          s.kills++;
          s.heads += Number(head);
          message(s, roles[guard.phase] + (head ? ' · HEADSHOT' : ' · DOWN'));
        }
      }
    } else sound('empty');
  }
  if (input.interact) {
    input.consume('interact');
    const prompt = interaction(s);
    if (!s.recovered && prompt) {
      s.recovered = true;
      message(s, 'CORE SECURED · RETURN TO DOCK');
      sound('core');
    } else if (s.recovered && prompt) {
      s.phase = 'won';
      return;
    }
  }
  for (const guard of s.guards) moveGuard(s, guard, dt, sound);
  if (p.hp <= 0) s.phase = 'lost';
}

function moveGuard(s, guard, dt, sound) {
  if (guard.hp <= 0) return;
  guard.flash = Math.max(0, (guard.flash ?? 0) - dt);
  const p = s.player;
  const range = distance(guard, p);
  const sees = range < (s.recovered ? 22 : 17) && clearShot(guard.x, guard.z, p.x, p.z, 1.3);
  if (guard.warning > 0) {
    guard.warning = Math.max(0, guard.warning - dt);
    if (!guard.warning) {
      guard.flash = .18;
      sound('reply');
      if (sees && distance(p, guard.target) < 1.15) {
        p.hp = Math.max(0, p.hp - 12);
        s.impact = .30;
      }
    }
    return;
  }
  let dx = guard.homeX + 1.9 * Math.sin(s.elapsed * .8 + guard.phase) - guard.x;
  let dz = guard.homeZ + .72 * Math.cos(s.elapsed * .9 + guard.phase) - guard.z;
  if (sees) {
    const ux = (p.x - guard.x) / Math.max(range, .1);
    const uz = (p.z - guard.z) / Math.max(range, .1);
    const drift = Math.sin(s.elapsed * 1.55 + guard.phase);
    const approach = range > 8.5 ? 1 : range < 4.2 ? -.65 : .15;
    dx = ux * approach + uz * drift * .83;
    dz = uz * approach - ux * drift * .83;
    guard.shot -= dt;
    if (guard.shot <= 0) {
      guard.shot = (s.recovered ? 1.2 : 1.75) + .42 * Math.sin(guard.phase + s.elapsed);
      guard.warning = .75 + guard.phase * .12;
      guard.target = { x: p.x, z: p.z };
    }
    guard.model.rotation.y = Math.atan2(ux, uz);
  } else {
    guard.shot = Math.max(.63, guard.shot);
    guard.model.rotation.y = Math.atan2(dx, dz);
  }
  const speed = dt * (sees ? 1.55 : 1.15) / Math.max(.5, Math.hypot(dx, dz));
  walk(guard, dx * speed, dz * speed);
}

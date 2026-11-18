export function createFixedClock(now = performance.now()) {
  const step = 1 / 60;
  let previous = now;
  let remainder = 0;
  return {
    reset(time = performance.now()) {
      previous = time;
      remainder = 0;
    },
    advance(time, running, update) {
      const elapsed = Math.max(0, (time - previous) / 1000);
      previous = time;
      if (!running()) {
        remainder = 0;
        return;
      }
      remainder += elapsed;
      // Consume the full active interval. A slow frame must not extend the deadline.
      while (remainder + 1e-10 >= step && running()) {
        remainder -= step;
        update(step);
      }
      if (!running()) remainder = 0;
    },
  };
}

export function playerView(camera, mission) {
  const p = mission.player;
  camera.position.set(p.x, 1.58 + Math.sin(mission.stride) * .018, p.z);
  camera.rotation.set(p.pitch, p.yaw, 0);
  camera.updateMatrixWorld();
}

export function createCapture(view, doc, host, input, enabled, changed) {
  let wanted = false;
  let pending = false;
  let generation = 0;
  const focused = () => !doc.hidden && doc.hasFocus();
  const captured = () => wanted && focused() && enabled() && doc.pointerLockElement === view;

  function suspend() {
    wanted = pending = false;
    generation++;
    input.reset();
    changed(false);
    if (doc.pointerLockElement === view) doc.exitPointerLock();
  }

  function sync() {
    if (captured()) {
      pending = false;
      input.reset();
      changed(true);
    } else suspend();
  }

  async function request() {
    if (pending || !enabled() || !focused()) return;
    wanted = pending = true;
    const attempt = ++generation;
    input.reset();
    try {
      await view.requestPointerLock();
      if (attempt === generation && doc.pointerLockElement === view) sync();
    } catch {
      if (attempt === generation) suspend();
    } finally {
      if (attempt === generation) pending = false;
    }
  }

  doc.addEventListener('pointerlockchange', sync);
  doc.addEventListener('pointerlockerror', () => {
    if (!captured()) suspend();
  });
  host.addEventListener('blur', suspend);
  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) suspend();
  });
  return { request, suspend, captured };
}

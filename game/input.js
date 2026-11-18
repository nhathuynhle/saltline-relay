// Edge actions survive key-up and frames that execute no simulation steps.
export function createInput(target, active) {
  const keys = new Set();
  const pending = new Set();
  let heldFire = false;
  const controls = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyE']);
  target.addEventListener('keydown', event => {
    if (!active() || !controls.has(event.code)) return;
    event.preventDefault();
    keys.add(event.code);
    if (!event.repeat && event.code === 'KeyR') pending.add('reload');
    if (!event.repeat && event.code === 'KeyE') pending.add('interact');
  });
  target.addEventListener('keyup', event => keys.delete(event.code));
  target.addEventListener('mousedown', event => {
    if (event.button !== 0 || !active()) return;
    heldFire = true;
    pending.add('fire');
  });
  target.addEventListener('mouseup', event => {
    if (event.button === 0) heldFire = false;
  });
  return {
    keys,
    get fire() { return heldFire || pending.has('fire'); },
    get reload() { return pending.has('reload'); },
    get interact() { return pending.has('interact'); },
    consume(action) { pending.delete(action); },
    reset() {
      keys.clear();
      pending.clear();
      heldFire = false;
    },
  };
}

let audio;

export function unlockAudio() {
  try {
    audio ??= new AudioContext();
    audio.resume().catch(() => {});
  } catch {
    // Mouse capture and gameplay remain usable when browser audio is unavailable.
  }
}

const sounds = {
  shot: [126, 32, .15, 'sawtooth', .16],
  reply: [81, 47, .13, 'triangle', .09],
  hit: [570, 360, .10, 'triangle', .16],
  head: [910, 1150, .14, 'triangle', .16],
  empty: [230, 100, .075, 'square', .038],
  reload: [106, 300, .25, 'square', .04],
  ready: [210, 368, .11, 'square', .038],
  core: [342, 880, .43, 'triangle', .16],
  lost: [206, 48, .7, 'triangle', .12],
  won: [392, 988, .72, 'sine', .19],
};

export function sound(name) {
  if (!audio || audio.state !== 'running') return;
  const [from, to, duration, type, volume] = sounds[name];
  const now = audio.currentTime;
  const wave = audio.createOscillator();
  const gain = audio.createGain();
  wave.type = type;
  wave.frequency.setValueAtTime(from, now);
  wave.frequency.exponentialRampToValueAtTime(to, now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(.001, now + duration);
  wave.connect(gain).connect(audio.destination);
  wave.start(now);
  wave.stop(now + duration);
}

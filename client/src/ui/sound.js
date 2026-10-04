// A simple two-tone notification "ding", synthesized with the Web Audio
// API instead of an audio file - nothing to fetch/cache, and no
// third-party sound asset to license for one short chime. See
// main.js's order:new/order:message/order:status handlers and the
// sound toggle in ui/settings.js.

let audioCtx = null;

function getContext() {
  // Created lazily on first actual use, not at module load - some
  // browsers start an AudioContext suspended until a user gesture
  // happens somewhere on the page, and by the time a notification
  // fires in this app, one almost certainly already has (logging in,
  // joining a shop, sending a chat message, ...).
  if (!audioCtx) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return null;
    audioCtx = new AudioContextCtor();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playNotificationSound() {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Two short sine-wave notes in quick succession - a plain "ding-dong"
  // rather than one flat beep.
  for (const [frequency, start, duration] of [
    [880, now, 0.12],
    [1320, now + 0.1, 0.15],
  ]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    // Exponential ramps (rather than a hard on/off) avoid the click/pop
    // a sudden gain change makes.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
}

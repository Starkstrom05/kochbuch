// Synthetic timer-alert sound via Web Audio API — no external assets.
// Lazy-initialises the AudioContext on first use (must follow a user gesture).

let ctx: AudioContext | null = null;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

function beep(
  audioCtx: AudioContext,
  dest: AudioNode,
  opts: { freq: number; start: number; duration: number; gain: number },
) {
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = opts.freq;
  const t0 = audioCtx.currentTime + opts.start;
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(opts.gain, t0 + 0.02);
  env.gain.exponentialRampToValueAtTime(0.001, t0 + opts.duration);
  osc.connect(env).connect(dest);
  osc.start(t0);
  osc.stop(t0 + opts.duration + 0.03);
}

/** Three rising beeps to signal a finished cooking timer. */
export function playTimerAlert(): void {
  const audioCtx = ensureContext();
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") void audioCtx.resume();

  const master = audioCtx.createGain();
  master.gain.value = 0.4;
  master.connect(audioCtx.destination);

  beep(audioCtx, master, { freq: 880, start: 0, duration: 0.18, gain: 0.6 });
  beep(audioCtx, master, { freq: 880, start: 0.25, duration: 0.18, gain: 0.6 });
  beep(audioCtx, master, { freq: 1175, start: 0.5, duration: 0.32, gain: 0.7 });
}

/**
 * Resume/prime the audio context from a user gesture so later programmatic
 * alerts (which don't originate from a gesture) are allowed to play.
 */
export function primeTimerAudio(): void {
  const audioCtx = ensureContext();
  if (audioCtx && audioCtx.state === "suspended") void audioCtx.resume();
}

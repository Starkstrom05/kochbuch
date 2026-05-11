// Synthetic page-flip sound via Web Audio API.
// No external assets — generates a filtered noise burst that resembles
// paper rustling. Lazy-initialises the AudioContext on first user gesture.

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;

const STORAGE_KEY = "kochbuch:bookSoundMuted";

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.35;
  masterGain.connect(ctx.destination);
  return ctx;
}

function createNoiseBuffer(audioCtx: AudioContext, durationSec: number): AudioBuffer {
  const sampleRate = audioCtx.sampleRate;
  const length = Math.floor(durationSec * sampleRate);
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  // Pink-ish noise: smoothed white noise for a softer, paper-like quality
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.18 * white) / 1.18;
    data[i] = last * 1.8;
  }
  return buffer;
}

function playBurst(audioCtx: AudioContext, dest: AudioNode, opts: {
  duration: number;
  attack: number;
  release: number;
  bandCenter: number;
  bandQ: number;
  gain: number;
  delay: number;
}) {
  const buf = createNoiseBuffer(audioCtx, opts.duration);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;

  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = opts.bandCenter;
  filter.Q.value = opts.bandQ;

  const env = audioCtx.createGain();
  const t0 = audioCtx.currentTime + opts.delay;
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(opts.gain, t0 + opts.attack);
  env.gain.exponentialRampToValueAtTime(0.001, t0 + opts.attack + opts.release);

  src.connect(filter).connect(env).connect(dest);
  src.start(t0);
  src.stop(t0 + opts.attack + opts.release + 0.05);
}

export function loadMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    muted = window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    muted = false;
  }
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }
}

export function isMuted(): boolean {
  return muted;
}

export function playPageFlip(): void {
  if (muted) return;
  const audioCtx = ensureContext();
  if (!audioCtx || !masterGain) return;
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }

  const rand = (min: number, max: number) => min + Math.random() * (max - min);

  // First burst: the main paper rustle
  playBurst(audioCtx, masterGain, {
    duration: 0.22,
    attack: 0.008,
    release: rand(0.16, 0.22),
    bandCenter: rand(2400, 3600),
    bandQ: rand(0.7, 1.2),
    gain: rand(0.5, 0.8),
    delay: 0,
  });

  // Second softer burst: trailing crinkle
  playBurst(audioCtx, masterGain, {
    duration: 0.15,
    attack: 0.012,
    release: rand(0.1, 0.16),
    bandCenter: rand(4000, 6000),
    bandQ: rand(0.9, 1.6),
    gain: rand(0.25, 0.4),
    delay: rand(0.06, 0.12),
  });
}

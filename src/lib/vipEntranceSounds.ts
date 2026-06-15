/**
 * 👑 VIP Tier Entrance Sound Effects — synthesized live with Web Audio API.
 * Each of the 7 VIP tiers gets a distinct signature audio cue:
 *   1 Dawn Ember       → soft chime swell
 *   2 Frost Guardian   → crystalline icy bells
 *   3 Dragon Shade     → deep purple growl + harmonic
 *   4 Nova Star        → cosmic arpeggio burst
 *   5 Phoenix          → fiery roar + rising flame
 *   6 Celestial Emperor → golden fanfare horn
 *   7 Eternal Legend   → orchestral rainbow swell + bell choir
 *
 * Zero asset downloads. Instant playback. Lazy-creates a shared AudioContext.
 */

let cachedCtx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!cachedCtx) cachedCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (cachedCtx.state === "suspended") cachedCtx.resume().catch(() => {});
    return cachedCtx;
  } catch {
    return null;
  }
}

function env(g: GainNode, ac: AudioContext, t0: number, attack: number, decay: number, peak: number) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

function tone(ac: AudioContext, freq: number, t0: number, dur: number, type: OscillatorType, peak: number) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  env(g, ac, t0, 0.02, dur, peak);
  o.connect(g).connect(ac.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.1);
}

function sweep(ac: AudioContext, fromF: number, toF: number, t0: number, dur: number, type: OscillatorType, peak: number) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(fromF, t0);
  o.frequency.exponentialRampToValueAtTime(toF, t0 + dur);
  env(g, ac, t0, 0.04, dur, peak);
  o.connect(g).connect(ac.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.1);
}

// 1 — Dawn Ember: gentle chime swell (C major triad)
function play1(ac: AudioContext) {
  const t = ac.currentTime;
  [523.25, 659.25, 783.99].forEach((f, i) => tone(ac, f, t + i * 0.08, 0.6, "sine", 0.18));
}

// 2 — Frost Guardian: crystalline icy bells
function play2(ac: AudioContext) {
  const t = ac.currentTime;
  [1318.5, 1567.98, 1975.53, 2349.32].forEach((f, i) => tone(ac, f, t + i * 0.07, 0.45, "triangle", 0.12));
  sweep(ac, 4000, 6000, t, 0.5, "sine", 0.05);
}

// 3 — Dragon Shade: deep purple growl
function play3(ac: AudioContext) {
  const t = ac.currentTime;
  sweep(ac, 110, 55, t, 1.0, "sawtooth", 0.32);
  sweep(ac, 220, 130, t + 0.1, 0.9, "square", 0.14);
  tone(ac, 330, t + 0.3, 0.5, "triangle", 0.08);
}

// 4 — Nova Star: cosmic arpeggio
function play4(ac: AudioContext) {
  const t = ac.currentTime;
  const notes = [523.25, 659.25, 783.99, 987.77, 1318.5];
  notes.forEach((f, i) => tone(ac, f, t + i * 0.06, 0.45, "triangle", 0.18));
  sweep(ac, 2000, 5000, t + 0.1, 0.8, "sine", 0.06);
}

// 5 — Phoenix: fiery roar + rising flame
function play5(ac: AudioContext) {
  const t = ac.currentTime;
  sweep(ac, 140, 70, t, 1.2, "sawtooth", 0.32);
  // crackle noise
  const buf = ac.createBuffer(1, ac.sampleRate * 1.2, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ac.createBufferSource(); src.buffer = buf;
  const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 0.9;
  const gN = ac.createGain(); env(gN, ac, t, 0.02, 1.2, 0.18);
  src.connect(bp).connect(gN).connect(ac.destination); src.start(t); src.stop(t + 1.3);
  // rising flame whistle
  sweep(ac, 600, 1800, t + 0.2, 0.8, "triangle", 0.1);
}

// 6 — Celestial Emperor: golden fanfare horn
function play6(ac: AudioContext) {
  const t = ac.currentTime;
  // Fanfare: G C E G
  const seq = [
    { f: 392, at: 0.0, d: 0.25 },
    { f: 523.25, at: 0.18, d: 0.25 },
    { f: 659.25, at: 0.36, d: 0.35 },
    { f: 783.99, at: 0.55, d: 0.7 },
  ];
  seq.forEach(({ f, at, d }) => {
    tone(ac, f, t + at, d, "sawtooth", 0.16);
    tone(ac, f * 2, t + at, d, "triangle", 0.08);
  });
  // golden shimmer
  sweep(ac, 3000, 5500, t + 0.4, 0.9, "sine", 0.05);
}

// 7 — Eternal Legend: orchestral rainbow swell + bell choir
function play7(ac: AudioContext) {
  const t = ac.currentTime;
  // Bell choir spread
  const bells = [523.25, 659.25, 783.99, 987.77, 1174.66, 1318.5];
  bells.forEach((f, i) => {
    tone(ac, f, t + i * 0.05, 1.5, "triangle", 0.14);
    tone(ac, f * 2, t + i * 0.05 + 0.1, 1.2, "sine", 0.06);
  });
  // deep orchestral pad
  sweep(ac, 110, 220, t, 1.8, "sawtooth", 0.18);
  sweep(ac, 165, 330, t + 0.15, 1.7, "triangle", 0.12);
  // rainbow high shimmer
  sweep(ac, 4000, 8000, t + 0.3, 1.5, "sine", 0.05);
  // final crash bell
  tone(ac, 1046.5, t + 0.8, 1.2, "triangle", 0.18);
}

const PLAYERS: Record<number, (ac: AudioContext) => void> = {
  1: play1, 2: play2, 3: play3, 4: play4, 5: play5, 6: play6, 7: play7,
};

/** Play the signature entrance sound for the given VIP level (1-7). */
export function playVipEntranceSound(level: number | null | undefined) {
  if (!level || level < 1) return;
  const ac = ctx();
  if (!ac) return;
  const fn = PLAYERS[Math.min(level, 7)];
  try { fn?.(ac); } catch {}
}

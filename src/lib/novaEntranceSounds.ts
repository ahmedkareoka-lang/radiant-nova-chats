/**
 * NOVA P entrance sound effects synthesized with Web Audio API.
 * No external asset downloads — instant tier-based audio cues.
 *
 *   P4 → fire crackle (warm noise burst + low rumble)
 *   P5 → rainbow shimmer (rising arpeggio across 5 tones)
 *   P6 → dragon roar (saw-wave rumble + descending growl)
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

function envelope(g: GainNode, ac: AudioContext, attack = 0.02, decay = 0.4, peak = 0.5) {
  const t0 = ac.currentTime;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

function playFire(ac: AudioContext) {
  // Low rumble
  const osc = ac.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(70, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 1.2);
  const gOsc = ac.createGain();
  envelope(gOsc, ac, 0.05, 1.2, 0.35);
  osc.connect(gOsc).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 1.4);

  // Crackling noise
  const bufferSize = ac.sampleRate * 1.5;
  const noise = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = ac.createBufferSource();
  src.buffer = noise;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1200;
  filter.Q.value = 0.8;
  const gN = ac.createGain();
  envelope(gN, ac, 0.02, 1.4, 0.18);
  src.connect(filter).connect(gN).connect(ac.destination);
  src.start();
  src.stop(ac.currentTime + 1.5);
}

function playRainbow(ac: AudioContext) {
  // Rising shimmer: C5, E5, G5, B5, D6 staggered
  const notes = [523.25, 659.25, 783.99, 987.77, 1174.66];
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const g = ac.createGain();
    const t0 = ac.currentTime + i * 0.12;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + 0.7);
  });

  // Sparkle high osc
  const high = ac.createOscillator();
  high.type = "sine";
  high.frequency.setValueAtTime(2400, ac.currentTime);
  high.frequency.exponentialRampToValueAtTime(4800, ac.currentTime + 1);
  const gH = ac.createGain();
  envelope(gH, ac, 0.05, 1.0, 0.08);
  high.connect(gH).connect(ac.destination);
  high.start();
  high.stop(ac.currentTime + 1.1);
}

function playDragon(ac: AudioContext) {
  // Deep growl
  const osc = ac.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(120, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(45, ac.currentTime + 1.5);
  const g = ac.createGain();
  envelope(g, ac, 0.04, 1.6, 0.45);

  // Heavy filter for grit
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 600;
  filter.Q.value = 8;
  osc.connect(filter).connect(g).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 1.7);

  // Roar harmonic
  const osc2 = ac.createOscillator();
  osc2.type = "square";
  osc2.frequency.setValueAtTime(180, ac.currentTime + 0.1);
  osc2.frequency.exponentialRampToValueAtTime(80, ac.currentTime + 1.4);
  const g2 = ac.createGain();
  envelope(g2, ac, 0.08, 1.4, 0.18);
  osc2.connect(g2).connect(ac.destination);
  osc2.start(ac.currentTime + 0.1);
  osc2.stop(ac.currentTime + 1.6);
}

/**
 * Play the NOVA P tier entrance sound (P4=fire, P5=rainbow, P6=dragon).
 * Lower tiers play nothing.
 */
export function playNovaEntranceSound(level: number) {
  const ac = ctx();
  if (!ac) return;
  try {
    if (level === 4) playFire(ac);
    else if (level === 5) playRainbow(ac);
    else if (level >= 6) playDragon(ac);
  } catch {}
}

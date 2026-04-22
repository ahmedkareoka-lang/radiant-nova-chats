// Confetti effect for large gifts
export const triggerConfetti = () => {
  const colors = ['#a855f7', '#ec4899', '#f59e0b', '#3b82f6', '#10b981'];
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;overflow:hidden;';
  document.body.appendChild(container);

  for (let i = 0; i < 60; i++) {
    const particle = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const x = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const size = 4 + Math.random() * 8;
    const rotation = Math.random() * 360;
    
    particle.style.cssText = `
      position:absolute;
      top:-10px;
      left:${x}%;
      width:${size}px;
      height:${size}px;
      background:${color};
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      animation: confetti-fall ${1.5 + Math.random()}s ease-out ${delay}s forwards;
      transform: rotate(${rotation}deg);
    `;
    container.appendChild(particle);
  }

  setTimeout(() => container.remove(), 3000);
};

// Gift sound effect — basic chime
let audioCtx: AudioContext | null = null;
const getCtx = (): AudioContext | null => {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch { return null; }
};

export const playGiftSound = () => {
  const ac = getCtx();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ac.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(1320, ac.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.4);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.4);
  } catch {}
};

/** Tiered sound: richer harmonics + reverb for expensive gifts */
export const playTieredGiftSound = (goldAmount: number) => {
  const ac = getCtx();
  if (!ac) return;
  try {
    const now = ac.currentTime;

    if (goldAmount >= 100000) {
      // LEGENDARY — dramatic fanfare chord with sweep
      playChord(ac, [523, 659, 784, 1047], now, 1.8, 0.12);
      playChord(ac, [587, 740, 880, 1175], now + 0.3, 1.5, 0.1);
      playSweep(ac, 200, 2000, now, 1.0, 0.08);
      playImpact(ac, now, 0.15);
    } else if (goldAmount >= 10000) {
      // EPIC — rising arpeggio
      [523, 659, 784, 1047].forEach((f, i) => {
        playTone(ac, f, now + i * 0.12, 0.6, 0.1, 'sine');
      });
      playImpact(ac, now, 0.08);
    } else if (goldAmount >= 1000) {
      // RARE — sparkle chime
      playTone(ac, 880, now, 0.5, 0.12, 'sine');
      playTone(ac, 1320, now + 0.1, 0.4, 0.1, 'sine');
      playTone(ac, 1760, now + 0.2, 0.3, 0.08, 'triangle');
    } else {
      // NORMAL — simple ding
      playTone(ac, 880, now, 0.3, 0.12, 'sine');
      playTone(ac, 1320, now + 0.08, 0.25, 0.08, 'sine');
    }
  } catch {}
};

function playTone(ac: AudioContext, freq: number, start: number, dur: number, vol: number, type: OscillatorType) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain); gain.connect(ac.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.start(start);
  osc.stop(start + dur);
}

function playChord(ac: AudioContext, freqs: number[], start: number, dur: number, vol: number) {
  freqs.forEach(f => playTone(ac, f, start, dur, vol / freqs.length, 'sine'));
}

function playSweep(ac: AudioContext, startFreq: number, endFreq: number, start: number, dur: number, vol: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain); gain.connect(ac.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(startFreq, start);
  osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur * 0.7);
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.start(start);
  osc.stop(start + dur);
}

function playImpact(ac: AudioContext, start: number, vol: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain); gain.connect(ac.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, start);
  osc.frequency.exponentialRampToValueAtTime(30, start + 0.3);
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
  osc.start(start);
  osc.stop(start + 0.5);
}

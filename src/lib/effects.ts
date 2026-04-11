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

// Gift sound effect
let audioCtx: AudioContext | null = null;
export const playGiftSound = () => {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.4);
  } catch {}
};

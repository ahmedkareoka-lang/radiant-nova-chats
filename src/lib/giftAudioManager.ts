/**
 * Global gift audio manager.
 * Ensures only ONE gift sound plays at any time. When a new gift starts,
 * the previous gift's audio (video element) is stopped immediately.
 */
let currentAudioEl: HTMLMediaElement | null = null;

export const registerGiftAudio = (el: HTMLMediaElement | null) => {
  if (!el) return;
  // Stop previous audio if a different element is starting now.
  if (currentAudioEl && currentAudioEl !== el) {
    try {
      currentAudioEl.pause();
      currentAudioEl.currentTime = 0;
    } catch {}
  }
  currentAudioEl = el;
};

export const stopGiftAudio = (el?: HTMLMediaElement | null) => {
  if (el && currentAudioEl !== el) return;
  if (currentAudioEl) {
    try {
      currentAudioEl.pause();
      currentAudioEl.currentTime = 0;
    } catch {}
    currentAudioEl = null;
  }
};

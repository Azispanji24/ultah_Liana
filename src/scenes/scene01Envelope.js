import { audioEngine } from '../audio/audioEngine.js';

export function initScene01Envelope({ onOpened }) {
  const sceneEl = document.getElementById('scene-envelope');
  const stageEl = document.getElementById('envelope-stage');
  const openBtn = document.getElementById('open-letter-btn');

  let opened = false;
  let dismissTimer = null;

  function triggerOpen() {
    if (opened) return;
    opened = true;

    // Initialize romantic BGM ("Photograph — Ed Sheeran") strictly on user gesture
    audioEngine.startExperienceAudio();
    audioEngine.playEnvelopeOpen();

    stageEl?.classList.add('is-opening');
    if (openBtn) {
      openBtn.disabled = true;
      openBtn.textContent = 'OPENING YOUR LETTER...';
    }

    dismissTimer = setTimeout(() => {
      sceneEl?.classList.add('is-dismissed');
      document.body.classList.remove('is-locked');
      onOpened?.();
    }, 1150);
  }

  stageEl?.addEventListener('click', triggerOpen);
  stageEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerOpen();
    }
  });
  openBtn?.addEventListener('click', triggerOpen);

  return {
    reset() {
      clearTimeout(dismissTimer);
      opened = false;
      stageEl?.classList.remove('is-opening');
      sceneEl?.classList.remove('is-dismissed');
      document.body.classList.add('is-locked');
      if (openBtn) {
        openBtn.disabled = false;
        openBtn.textContent = 'OPEN YOUR LETTER';
      }
    },
  };
}

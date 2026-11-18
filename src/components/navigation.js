import { audioEngine } from '../audio/audioEngine.js';

const CHAPTERS = [
  { id: 'scene-countdown', label: 'Countdown' },
  { id: 'scene-reveal', label: 'Chapter 21' },
  { id: 'scene-gallery', label: 'Our Gallery' },
  { id: 'scene-reasons', label: '21 Reasons' },
  { id: 'scene-letter', label: 'The Letter' },
  { id: 'scene-cake', label: 'Make a Wish' },
  { id: 'scene-finale', label: 'Finale' },
];

export function initNavigation() {
  const topbar = document.getElementById('floating-topbar');
  const progressTrack = document.getElementById('progress-track');
  const progressFill = document.getElementById('progress-fill');
  const rail = document.getElementById('chapter-rail');
  const backToTop = document.getElementById('back-to-top');

  const musicWidget = document.getElementById('music-widget');
  const musicToggleBtn = document.getElementById('music-toggle-btn');
  const musicIconPlay = document.getElementById('music-icon-play');
  const musicIconPause = document.getElementById('music-icon-pause');
  const volumeToggleBtn = document.getElementById('volume-toggle-btn');
  const volumePopover = document.getElementById('volume-popover');
  const volumeSlider = document.getElementById('volume-slider');
  const muteBtn = document.getElementById('mute-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  // Build chapter rail dots
  if (rail) {
    rail.innerHTML = CHAPTERS.map(
      (ch, idx) => `
      <button
        type="button"
        class="chapter-dot ${idx === 0 ? 'is-active' : ''}"
        data-target="${ch.id}"
        aria-label="Jump to ${ch.label}"
      >
        <span class="chapter-dot-label">${ch.label}</span>
      </button>
    `
    ).join('');

    rail.addEventListener('click', (e) => {
      const btn = e.target.closest('.chapter-dot');
      if (!btn) return;
      const targetEl = document.getElementById(btn.dataset.target);
      if (targetEl) {
        audioEngine.playSoftTransition();
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // Subscribe to audio engine updates
  audioEngine.subscribe((state) => {
    if (musicWidget) {
      musicWidget.classList.toggle('is-playing', state.isPlaying && !state.isMuted);
    }
    if (musicIconPlay && musicIconPause) {
      const playing = state.isPlaying && !state.isMuted;
      musicIconPlay.style.display = playing ? 'none' : 'block';
      musicIconPause.style.display = playing ? 'block' : 'none';
    }
    if (musicToggleBtn) {
      musicToggleBtn.setAttribute(
        'aria-label',
        state.isPlaying ? 'Pause background music' : 'Play background music'
      );
    }
    if (volumeSlider) {
      volumeSlider.value = String(Math.round(state.volume * 100));
    }
    if (muteBtn) {
      muteBtn.textContent = state.isMuted ? 'Unmute' : 'Mute';
    }
  });

  musicToggleBtn?.addEventListener('click', () => {
    audioEngine.togglePlay();
  });

  volumeToggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = volumePopover?.classList.toggle('is-open');
    volumeToggleBtn.setAttribute('aria-expanded', String(Boolean(isOpen)));
  });

  document.addEventListener('click', (e) => {
    if (volumePopover && !volumePopover.contains(e.target) && !volumeToggleBtn?.contains(e.target)) {
      volumePopover.classList.remove('is-open');
      volumeToggleBtn?.setAttribute('aria-expanded', 'false');
    }
  });

  volumeSlider?.addEventListener('input', (e) => {
    audioEngine.setVolume(Number(e.target.value) / 100);
  });

  muteBtn?.addEventListener('click', () => {
    audioEngine.toggleMute();
  });

  // Fullscreen toggle
  fullscreenBtn?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  });

  // Back to top
  backToTop?.addEventListener('click', () => {
    audioEngine.playSoftTransition();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Scroll progress + active chapter indicator
  const updateScroll = () => {
    const scrollTop = window.scrollY;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pct = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
    if (progressFill) progressFill.style.width = `${pct.toFixed(2)}%`;

    if (backToTop) {
      backToTop.classList.toggle('is-visible', scrollTop > window.innerHeight * 0.65);
    }

    // Highlight active chapter dot
    let currentId = CHAPTERS[0].id;
    const probeY = window.innerHeight * 0.42;
    for (const ch of CHAPTERS) {
      const el = document.getElementById(ch.id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top <= probeY) {
        currentId = ch.id;
      }
    }
    rail?.querySelectorAll('.chapter-dot').forEach((dot) => {
      dot.classList.toggle('is-active', dot.dataset.target === currentId);
    });
  };

  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('resize', updateScroll, { passive: true });

  return {
    show() {
      topbar?.classList.add('is-visible');
      progressTrack?.classList.add('is-visible');
      rail?.classList.add('is-visible');
      updateScroll();
    },
    hide() {
      topbar?.classList.remove('is-visible');
      progressTrack?.classList.remove('is-visible');
      rail?.classList.remove('is-visible');
      backToTop?.classList.remove('is-visible');
    },
  };
}

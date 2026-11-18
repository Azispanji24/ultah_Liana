import { audioEngine } from '../audio/audioEngine.js';

/**
 * Editorial Media Lightbox — Supports BOTH all 27 Photographs AND all 8 Videos.
 * Includes keyboard navigation (Left/Right/Esc), mobile touch swipe,
 * native HTML5 video playback, and automatic Google Drive H.264 preview fallback
 * for HEVC .MOV videos on browsers without hardware HEVC decoding.
 */
export function createLightbox(mediaItems) {
  const root = document.getElementById('photo-lightbox');
  const stageEl = document.getElementById('lightbox-stage');
  const captionEl = document.getElementById('lightbox-caption');
  const counterEl = document.getElementById('lightbox-counter');
  const closeBtn = document.getElementById('lightbox-close');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');

  let currentIndex = 0;
  let isOpen = false;
  let wasBgmPlayingBeforeVideo = false;
  let touchStartX = 0;
  let touchEndX = 0;

  function cleanupActiveVideo() {
    if (!stageEl) return;
    const vid = stageEl.querySelector('video');
    if (vid) {
      try {
        vid.pause();
        vid.removeAttribute('src');
        vid.load();
      } catch {}
    }
    stageEl.innerHTML = '';
  }

  function renderDriveIframeFallback(item) {
    if (!stageEl || !item.driveId) return;
    stageEl.innerHTML = `
      <div class="lightbox-video-frame">
        <iframe
          src="https://drive.google.com/file/d/${item.driveId}/preview"
          allow="autoplay; fullscreen"
          allowfullscreen
          title="${item.caption || 'Video kenangan'}"
        ></iframe>
      </div>
    `;
  }

  function render(index) {
    if (!mediaItems.length || !stageEl) return;
    cleanupActiveVideo();

    currentIndex = (index + mediaItems.length) % mediaItems.length;
    const item = mediaItems[currentIndex];
    if (!item) return;

    if (captionEl) captionEl.textContent = item.caption || '';
    if (counterEl) {
      const cur = String(currentIndex + 1).padStart(2, '0');
      const tot = String(mediaItems.length).padStart(2, '0');
      const kind = item.type === 'video' ? 'VIDEO' : 'FOTO';
      counterEl.textContent = `${kind} · ${cur} / ${tot}`;
    }

    if (item.type === 'video') {
      // Gently pause background music while video plays so audio doesn't clash
      if (audioEngine.getState().isPlaying) {
        wasBgmPlayingBeforeVideo = true;
        audioEngine.pauseBgm();
      }

      const vid = document.createElement('video');
      vid.className = 'lightbox-video';
      vid.src = item.src;
      if (item.poster) vid.poster = item.poster;
      vid.controls = true;
      vid.autoplay = true;
      vid.playsInline = true;
      vid.setAttribute('playsinline', '');

      // If browser cannot decode HEVC .MOV (error or videoWidth === 0 after metadata),
      // seamlessly fall back to Google Drive's H.264 stream!
      let switchedToFallback = false;
      const triggerFallback = () => {
        if (switchedToFallback || !item.driveId) return;
        switchedToFallback = true;
        renderDriveIframeFallback(item);
      };

      vid.addEventListener('error', triggerFallback);
      vid.addEventListener('loadedmetadata', () => {
        if (vid.videoWidth === 0) {
          triggerFallback();
        }
      });

      stageEl.appendChild(vid);
      vid.play().catch(() => {});
      return;
    }

    // Image item: restore BGM if it was paused for a video
    if (wasBgmPlayingBeforeVideo) {
      wasBgmPlayingBeforeVideo = false;
      audioEngine.playBgm();
    }

    const imgEl = document.createElement('img');
    imgEl.className = 'lightbox-img';
    imgEl.alt = item.caption || 'Photograph of Liana';
    imgEl.style.opacity = '0.2';
    imgEl.style.transform = 'scale(0.97)';
    stageEl.appendChild(imgEl);

    const pre = new Image();
    pre.onload = () => {
      imgEl.src = item.src;
      requestAnimationFrame(() => {
        imgEl.style.opacity = '1';
        imgEl.style.transform = 'scale(1)';
      });
    };
    pre.src = item.src;
  }

  function open(index = 0) {
    isOpen = true;
    render(index);
    root?.classList.add('is-open');
    root?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    audioEngine.playGalleryClick();
    closeBtn?.focus();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    cleanupActiveVideo();
    if (wasBgmPlayingBeforeVideo) {
      wasBgmPlayingBeforeVideo = false;
      audioEngine.playBgm();
    }
    root?.classList.remove('is-open');
    root?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function prev() {
    if (!isOpen) return;
    audioEngine.playGalleryClick();
    render(currentIndex - 1);
  }

  function next() {
    if (!isOpen) return;
    audioEngine.playGalleryClick();
    render(currentIndex + 1);
  }

  closeBtn?.addEventListener('click', close);
  prevBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    prev();
  });
  nextBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    next();
  });

  root?.addEventListener('click', (e) => {
    if (e.target === root) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'ArrowRight') next();
  });

  root?.addEventListener(
    'touchstart',
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true }
  );

  root?.addEventListener(
    'touchend',
    (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const dx = touchEndX - touchStartX;
      if (Math.abs(dx) > 45) {
        if (dx > 0) prev();
        else next();
      }
    },
    { passive: true }
  );

  return { open, close, prev, next };
}

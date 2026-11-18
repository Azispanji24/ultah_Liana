import { birthdayConfig } from '../config/birthdayConfig.js';
import { audioEngine } from '../audio/audioEngine.js';

/**
 * Scene 04 — Our Little Gallery
 * Showcases ALL 35 assets from Google Drive (`bahan/`):
 *  - All 27 unique photographs across 6 editorial compositions
 *  - All 8 personal videos in a dedicated Video Keepsakes showcase
 */
export function initScene04Gallery({ lightbox }) {
  const photos = birthdayConfig.gallery;
  const videos = birthdayConfig.videos || [];
  const allMedia = [...photos, ...videos];
  const indexMap = new Map(allMedia.map((m, idx) => [m.id, idx]));

  const bySection = (name) => photos.filter((p) => p.section === name);

  // 1. Cinematic Full-Screen Feature
  const cinematicHost = document.getElementById('gallery-cinematic');
  const cinematicPhoto = bySection('cinematic')[0];
  if (cinematicHost && cinematicPhoto) {
    const idx = indexMap.get(cinematicPhoto.id);
    cinematicHost.innerHTML = `
      <figure class="gallery-cinematic-card" data-media-index="${idx}" tabindex="0" role="button" aria-label="Expand photograph: ${cinematicPhoto.caption}">
        <img
          src="${cinematicPhoto.src}"
          alt="${cinematicPhoto.caption}"
          width="${cinematicPhoto.width}"
          height="${cinematicPhoto.height}"
          style="object-position: ${cinematicPhoto.objectPosition || 'center'}"
          loading="lazy"
          decoding="async"
        />
        <figcaption class="gallery-cinematic-overlay">
          <span class="gallery-cinematic-tag">${cinematicPhoto.tag || 'Featured Moment'}</span>
          <p class="gallery-cinematic-caption">"${cinematicPhoto.caption}"</p>
        </figcaption>
      </figure>
    `;
  }

  // 2. Polaroid Collection
  const polaroidHost = document.getElementById('gallery-polaroids');
  if (polaroidHost) {
    polaroidHost.innerHTML = bySection('polaroids')
      .map((p) => {
        const idx = indexMap.get(p.id);
        return `
          <figure class="polaroid-item" style="--tilt: ${p.tilt ?? 0}deg" data-media-index="${idx}" tabindex="0" role="button" aria-label="Open Polaroid: ${p.caption}">
            <div class="polaroid-media">
              <img
                src="${p.src}"
                alt="${p.caption}"
                width="${p.width}"
                height="${p.height}"
                style="object-position: ${p.objectPosition || 'center 25%'}"
                loading="lazy"
                decoding="async"
              />
            </div>
            <figcaption class="polaroid-caption">${p.caption}</figcaption>
          </figure>
        `;
      })
      .join('');
  }

  // 3. Editorial Photo Grid
  const editorialHost = document.getElementById('gallery-editorial');
  if (editorialHost) {
    editorialHost.innerHTML = bySection('editorial')
      .map((p) => {
        const idx = indexMap.get(p.id);
        const spanClass = p.span === 'wide' ? 'span-wide' : p.span === 'tall' ? 'span-tall' : '';
        return `
          <figure class="editorial-card ${spanClass}" data-media-index="${idx}" tabindex="0" role="button" aria-label="Open editorial photo: ${p.caption}">
            <img
              src="${p.src}"
              alt="${p.caption}"
              width="${p.width}"
              height="${p.height}"
              style="object-position: ${p.objectPosition || 'center 25%'}"
              loading="lazy"
              decoding="async"
            />
            <figcaption class="editorial-card-cap">${p.caption}</figcaption>
          </figure>
        `;
      })
      .join('');
  }

  // 4. Overlapping Scrapbook Composition
  const scrapbookHost = document.getElementById('gallery-scrapbook');
  if (scrapbookHost) {
    scrapbookHost.innerHTML = bySection('scrapbook')
      .map((p) => {
        const idx = indexMap.get(p.id);
        return `
          <figure class="scrapbook-piece" data-media-index="${idx}" tabindex="0" role="button" aria-label="Open scrapbook photo: ${p.caption}">
            <img
              src="${p.src}"
              alt="${p.caption}"
              width="${p.width}"
              height="${p.height}"
              style="object-position: ${p.objectPosition || 'center 25%'}"
              loading="lazy"
              decoding="async"
            />
            <figcaption>${p.caption}</figcaption>
          </figure>
        `;
      })
      .join('');
  }

  // 5. Interactive Photo Cards (with delicate 3D pointer tilt)
  const cardsHost = document.getElementById('gallery-interactive-cards');
  if (cardsHost) {
    cardsHost.innerHTML = bySection('interactiveCards')
      .map((p) => {
        const idx = indexMap.get(p.id);
        return `
          <figure class="photo-interactive-card" data-media-index="${idx}" tabindex="0" role="button" aria-label="Open photo card: ${p.caption}">
            <img
              src="${p.src}"
              alt="${p.caption}"
              width="${p.width}"
              height="${p.height}"
              style="object-position: ${p.objectPosition || 'center 25%'}"
              loading="lazy"
              decoding="async"
            />
            <figcaption class="photo-interactive-overlay">
              <span class="photo-interactive-note">${p.note || 'Keepsake'}</span>
              <p class="photo-interactive-caption">${p.caption}</p>
            </figcaption>
          </figure>
        `;
      })
      .join('');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      cardsHost.querySelectorAll('.photo-interactive-card').forEach((card) => {
        card.addEventListener('pointermove', (e) => {
          const rect = card.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width - 0.5;
          const py = (e.clientY - rect.top) / rect.height - 0.5;
          card.style.transform = `perspective(900px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg) translateY(-4px)`;
        });
        card.addEventListener('pointerleave', () => {
          card.style.transform = '';
        });
      });
    }
  }

  // 6. Horizontal Memory Filmstrip
  const filmstripTrack = document.getElementById('gallery-filmstrip');
  const prevBtn = document.getElementById('filmstrip-prev');
  const nextBtn = document.getElementById('filmstrip-next');

  if (filmstripTrack) {
    filmstripTrack.innerHTML = bySection('filmstrip')
      .map((p) => {
        const idx = indexMap.get(p.id);
        return `
          <figure class="filmstrip-slide" data-media-index="${idx}" tabindex="0" role="button" aria-label="Open filmstrip photo: ${p.caption}">
            <div class="filmstrip-slide-media">
              <img
                src="${p.src}"
                alt="${p.caption}"
                width="${p.width}"
                height="${p.height}"
                style="object-position: ${p.objectPosition || 'center 25%'}"
                loading="lazy"
                decoding="async"
              />
            </div>
            <figcaption class="filmstrip-slide-cap">${p.caption}</figcaption>
          </figure>
        `;
      })
      .join('');

    const scrollStep = () => Math.min(340, filmstripTrack.clientWidth * 0.8);
    prevBtn?.addEventListener('click', () => {
      audioEngine.playGalleryClick();
      filmstripTrack.scrollBy({ left: -scrollStep(), behavior: 'smooth' });
    });
    nextBtn?.addEventListener('click', () => {
      audioEngine.playGalleryClick();
      filmstripTrack.scrollBy({ left: scrollStep(), behavior: 'smooth' });
    });
  }

  // 7. Living Memories — ALL 8 Videos from Google Drive (`bahan/`)
  const videoHost = document.getElementById('gallery-videos');
  if (videoHost && videos.length) {
    videoHost.innerHTML = videos
      .map((v) => {
        const idx = indexMap.get(v.id);
        return `
          <figure class="video-memory-card" data-media-index="${idx}" tabindex="0" role="button" aria-label="Putar video ${v.label}: ${v.caption}">
            <div class="video-memory-thumb">
              <img
                src="${v.poster}"
                alt="${v.caption}"
                loading="lazy"
                decoding="async"
              />
              <span class="video-memory-badge">${v.label} · Video</span>
              <span class="video-play-orb" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </span>
            </div>
            <figcaption class="video-memory-cap">${v.caption}</figcaption>
          </figure>
        `;
      })
      .join('');
  }

  // Unified click & keyboard activation for all 35 gallery items (27 photos + 8 videos)
  const gallerySection = document.getElementById('scene-gallery');
  const handleActivate = (target) => {
    const item = target.closest('[data-media-index]');
    if (!item) return;
    const idx = Number(item.dataset.mediaIndex);
    if (Number.isFinite(idx)) {
      lightbox.open(idx);
    }
  };

  gallerySection?.addEventListener('click', (e) => handleActivate(e.target));
  gallerySection?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const item = e.target.closest('[data-media-index]');
      if (item) {
        e.preventDefault();
        handleActivate(item);
      }
    }
  });
}

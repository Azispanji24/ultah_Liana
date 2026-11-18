import { birthdayConfig } from '../config/birthdayConfig.js';

/**
 * Scene 03 — The First Reveal
 * Cinematic blur-to-focus portrait reveal with gentle lighting and editorial typography.
 */
export function initScene03Reveal() {
  const section = document.getElementById('scene-reveal');
  const portraitImg = document.getElementById('reveal-portrait-img');
  const cfg = birthdayConfig.featuredPhotos.firstReveal;

  if (portraitImg && cfg) {
    portraitImg.src = cfg.src;
    portraitImg.alt = cfg.alt;
    portraitImg.style.objectPosition = cfg.objectPosition || 'center center';
  }

  if (!section) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          section.classList.add('is-focused');
        }
      });
    },
    { threshold: 0.25 }
  );

  observer.observe(section);
}

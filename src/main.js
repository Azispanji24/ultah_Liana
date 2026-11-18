import { birthdayConfig } from './config/birthdayConfig.js';
import { initAmbientCanvas } from './components/ambientCanvas.js';
import { initNavigation } from './components/navigation.js';
import { createLightbox } from './components/lightbox.js';
import { initScene01Envelope } from './scenes/scene01Envelope.js';
import { initScene02Countdown } from './scenes/scene02Countdown.js';
import { initScene03Reveal } from './scenes/scene03Reveal.js';
import { initScene04Gallery } from './scenes/scene04Gallery.js';
import { initScene05Reasons } from './scenes/scene05Reasons.js';
import { initScene06Letter } from './scenes/scene06Letter.js';
import { initScene07Cake } from './scenes/scene07Cake.js';
import { initScene08Finale } from './scenes/scene08Finale.js';

function initScrollReveals() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const delay = Number(entry.target.dataset.revealDelay || 0);
          if (delay > 0) {
            entry.target.style.transitionDelay = `${delay}ms`;
          }
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14, rootMargin: '0px 0px -40px 0px' }
  );

  els.forEach((el) => observer.observe(el));
}

function initSubtleParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const portraitWrap = document.querySelector('.reveal-portrait-wrap');
  if (!portraitWrap) return;

  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const rect = portraitWrap.getBoundingClientRect();
        const vh = window.innerHeight;
        if (rect.top < vh && rect.bottom > 0) {
          const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
          portraitWrap.style.transform = `translate3d(0, ${(progress * -22).toFixed(1)}px, 0)`;
        }
        ticking = false;
      });
    },
    { passive: true }
  );
}

function bootstrap() {
  const storyMain = document.getElementById('story-main');

  // Lock viewport scroll while Scene 01 Secret Envelope is closed
  document.body.classList.add('is-locked');
  window.scrollTo(0, 0);

  initAmbientCanvas();
  const nav = initNavigation();
  const allMedia = [...birthdayConfig.gallery, ...(birthdayConfig.videos || [])];
  const lightbox = createLightbox(allMedia);

  const scene02 = initScene02Countdown();
  initScene03Reveal();
  initScene04Gallery({ lightbox });
  const scene05 = initScene05Reasons();
  const scene06 = initScene06Letter();
  const scene07 = initScene07Cake();

  let scene01 = null;

  const scene08 = initScene08Finale({
    onReplay() {
      // Smoothly return to the beginning and reset interactive scenes while preserving music
      storyMain?.classList.remove('is-revealed');
      nav.hide();
      window.scrollTo({ top: 0, behavior: 'instant' });
      scene05.reset();
      scene06.reset();
      scene07.reset();
      scene01?.reset();
    },
  });

  scene01 = initScene01Envelope({
    onOpened() {
      storyMain?.classList.add('is-revealed');
      nav.show();
      scene02.celebratePulse();
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
  });

  initScrollReveals();
  initSubtleParallax();

  // Keep reference to avoid unused lint
  void scene08;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

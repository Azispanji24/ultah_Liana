import { birthdayConfig } from '../config/birthdayConfig.js';
import { audioEngine } from '../audio/audioEngine.js';

/**
 * Scene 05 — 21 Alasan Kenapa Kamu Begitu Istimewa
 * 21 kartu interaktif berbahasa Indonesia dengan sentuhan personal ("my papoy ❤️",
 * "lianoyyy kuu", "wanita hebat"), efek 3D tilt lembut, animasi balik kartu, dan sparkle SFX.
 */
export function initScene05Reasons() {
  const grid = document.getElementById('reasons-grid');
  const countEl = document.getElementById('reasons-discovered-count');
  const revealAllBtn = document.getElementById('reasons-reveal-all');
  if (!grid) return { reset() {} };

  const reasons = birthdayConfig.reasons;
  const openedSet = new Set();

  function updateCounter() {
    if (countEl) {
      countEl.textContent = String(openedSet.size);
    }
    if (revealAllBtn) {
      revealAllBtn.textContent = openedSet.size === reasons.length ? 'Tutup Semua Kartu' : 'Buka Semua 21';
    }
  }

  grid.innerHTML = reasons
    .map((message, i) => {
      const num = String(i + 1).padStart(2, '0');
      const isCapstone = i === reasons.length - 1;
      return `
        <article
          class="reason-card ${isCapstone ? 'reason-card--capstone' : ''}"
          data-reason-index="${i}"
          tabindex="0"
          role="button"
          aria-pressed="false"
          aria-label="Alasan ke-${num} dari 21. Ketuk untuk membuka."
        >
          <div class="reason-card-inner">
            <div class="reason-face reason-face--front">
              <span class="reason-num">${num}</span>
              <span class="reason-front-ornament" aria-hidden="true"></span>
              <span class="reason-prompt">${isCapstone ? 'Alasan Terakhir ❤️' : 'Ketuk untuk membuka'}</span>
            </div>
            <div class="reason-face reason-face--back">
              <span class="reason-back-num">NO. ${num}</span>
              <p class="reason-text">${message}</p>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  const cards = Array.from(grid.querySelectorAll('.reason-card'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function toggleCard(card, forceState) {
    const idx = Number(card.dataset.reasonIndex);
    const willOpen = typeof forceState === 'boolean' ? forceState : !card.classList.contains('is-open');

    card.classList.toggle('is-open', willOpen);
    card.setAttribute('aria-pressed', String(willOpen));

    if (willOpen) {
      openedSet.add(idx);
      audioEngine.playSparkle((idx % 7) * 0.6);
    } else {
      openedSet.delete(idx);
    }
    updateCounter();
  }

  cards.forEach((card) => {
    card.addEventListener('click', () => toggleCard(card));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCard(card);
      }
    });

    if (!reduced) {
      card.addEventListener('pointermove', (e) => {
        if (card.classList.contains('is-open')) return;
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateY(-3px)`;
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
      });
    }
  });

  revealAllBtn?.addEventListener('click', () => {
    const shouldOpenAll = openedSet.size < reasons.length;
    if (shouldOpenAll) {
      audioEngine.playCelebration();
      cards.forEach((card, idx) => {
        setTimeout(() => {
          card.classList.add('is-open');
          card.setAttribute('aria-pressed', 'true');
          card.style.transform = '';
          openedSet.add(idx);
          updateCounter();
        }, idx * 45);
      });
    } else {
      audioEngine.playSoftTransition();
      cards.forEach((card, idx) => {
        card.classList.remove('is-open');
        card.setAttribute('aria-pressed', 'false');
        openedSet.delete(idx);
      });
      updateCounter();
    }
  });

  updateCounter();

  return {
    reset() {
      openedSet.clear();
      cards.forEach((card) => {
        card.classList.remove('is-open');
        card.setAttribute('aria-pressed', 'false');
        card.style.transform = '';
      });
      updateCounter();
    },
  };
}

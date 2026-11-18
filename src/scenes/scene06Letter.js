import { birthdayConfig } from '../config/birthdayConfig.js';
import { audioEngine } from '../audio/audioEngine.js';

/**
 * Scene 06 — A Special Letter
 * Progressive handwritten/typewriter letter experience on warm ivory stationery.
 * Never reveals the entire letter immediately; visitor clicks to open and continue
 * reading line by line at their own emotional pace.
 */
export function initScene06Letter() {
  const sealedCover = document.getElementById('letter-sealed-cover');
  const openLetterSheetBtn = document.getElementById('letter-open-sheet-btn');
  const readingArea = document.getElementById('letter-reading-area');
  const bodyEl = document.getElementById('letter-body');
  const signatureBlock = document.getElementById('letter-signature-block');
  const continueBtn = document.getElementById('letter-continue-btn');
  const progressEl = document.getElementById('letter-progress');

  const paragraphs = birthdayConfig.letter.paragraphs;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let isOpened = false;
  let currentParaIndex = -1;
  let isTyping = false;
  let typingTimer = null;
  let activeSpan = null;
  let activeFullText = '';

  function updateControls() {
    const shown = Math.max(0, currentParaIndex + 1);
    if (progressEl) {
      progressEl.textContent = `Bagian ${shown} dari ${paragraphs.length}`;
    }
    if (!continueBtn) return;

    if (currentParaIndex >= paragraphs.length - 1 && !isTyping) {
      continueBtn.textContent = 'Lanjut ke Kue Ulang Tahun ↓';
      continueBtn.dataset.done = 'true';
    } else if (isTyping) {
      continueBtn.textContent = 'Tampilkan Paragraf';
      continueBtn.dataset.done = 'false';
    } else {
      continueBtn.textContent = 'Lanjut Membaca';
      continueBtn.dataset.done = 'false';
    }
  }

  function finishCurrentTyping() {
    if (!isTyping) return;
    clearTimeout(typingTimer);
    isTyping = false;
    if (activeSpan) {
      activeSpan.textContent = activeFullText;
    }
    const cursor = bodyEl?.querySelector('.typing-cursor');
    cursor?.remove();

    if (currentParaIndex >= paragraphs.length - 1) {
      signatureBlock?.classList.add('is-visible');
      audioEngine.playSparkle(4);
    }
    updateControls();
  }

  function revealNextParagraph() {
    if (!isOpened) return;

    // If user clicks while typing, finish current paragraph gracefully
    if (isTyping) {
      finishCurrentTyping();
      return;
    }

    // If all paragraphs done, scroll to Scene 07 (The Birthday Cake)
    if (currentParaIndex >= paragraphs.length - 1) {
      audioEngine.playSoftTransition();
      document.getElementById('scene-cake')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    currentParaIndex++;
    const text = paragraphs[currentParaIndex];
    const isHighlight = currentParaIndex === paragraphs.length - 1 || text.includes('I love you');

    const p = document.createElement('p');
    p.className = `letter-paragraph ${isHighlight ? 'letter-paragraph--highlight' : ''}`;
    const span = document.createElement('span');
    p.appendChild(span);
    bodyEl?.appendChild(p);

    activeSpan = span;
    activeFullText = text;

    if (reduced) {
      span.textContent = text;
      if (currentParaIndex >= paragraphs.length - 1) {
        signatureBlock?.classList.add('is-visible');
      }
      updateControls();
      return;
    }

    // Remove any lingering cursor
    bodyEl?.querySelector('.typing-cursor')?.remove();
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    p.appendChild(cursor);

    isTyping = true;
    updateControls();

    let charIdx = 0;
    const typeNext = () => {
      if (!isTyping) return;
      charIdx++;
      span.textContent = text.slice(0, charIdx);
      if (charIdx < text.length) {
        const ch = text[charIdx - 1];
        const delay = ch === '.' || ch === ',' || ch === ':' ? 95 : 22 + Math.random() * 14;
        typingTimer = setTimeout(typeNext, delay);
      } else {
        finishCurrentTyping();
      }
    };

    typeNext();
  }

  function openLetterSheet() {
    if (isOpened) return;
    isOpened = true;
    audioEngine.playLetterOpen();

    if (sealedCover) sealedCover.style.display = 'none';
    if (readingArea) readingArea.style.display = 'block';

    // Begin revealing the very first line progressively
    revealNextParagraph();
  }

  openLetterSheetBtn?.addEventListener('click', openLetterSheet);
  continueBtn?.addEventListener('click', () => {
    if (!isTyping && currentParaIndex < paragraphs.length - 1) {
      audioEngine.playGalleryClick();
    }
    revealNextParagraph();
  });

  // Clicking on the letter body itself also advances comfortably
  bodyEl?.addEventListener('click', () => {
    if (isOpened && (isTyping || currentParaIndex < paragraphs.length - 1)) {
      revealNextParagraph();
    }
  });

  return {
    reset() {
      clearTimeout(typingTimer);
      isOpened = false;
      isTyping = false;
      currentParaIndex = -1;
      activeSpan = null;
      activeFullText = '';
      if (bodyEl) bodyEl.innerHTML = '';
      signatureBlock?.classList.remove('is-visible');
      if (sealedCover) sealedCover.style.display = 'block';
      if (readingArea) readingArea.style.display = 'none';
      if (progressEl) progressEl.textContent = `Bagian 0 dari ${paragraphs.length}`;
      if (continueBtn) {
        continueBtn.textContent = 'Lanjut Membaca';
        continueBtn.dataset.done = 'false';
      }
    },
  };
}

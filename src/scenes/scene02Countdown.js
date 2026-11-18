import { birthdayConfig } from '../config/birthdayConfig.js';
import { audioEngine } from '../audio/audioEngine.js';

/**
 * Scene 02 — A Little Countdown (Asia/Jakarta WIB)
 *
 * - Target: November 19, 00:00:00 WIB (+07:00)
 * - Works identically across all visitor timezones & page refreshes
 * - Never displays negative numbers
 * - Transitions live at midnight WIB (or immediately if opened after midnight)
 * - Supports `?previewCountdown=8` query parameter for live midnight-transition testing
 */
export function initScene02Countdown() {
  const gridEl = document.getElementById('countdown-grid');
  const tzNoteEl = document.getElementById('countdown-tz-note');
  const celebrationEl = document.getElementById('celebration-state');
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minsEl = document.getElementById('cd-minutes');
  const secsEl = document.getElementById('cd-seconds');
  const canvas = document.getElementById('countdown-canvas');
  const continueBtn = document.getElementById('countdown-continue-btn');

  // Optional test preview parameter (?previewCountdown=8) — normal visits always use exact WIB target
  const params = new URLSearchParams(window.location.search);
  const previewSec = Number(params.get('previewCountdown'));
  const targetMs =
    Number.isFinite(previewSec) && previewSec > 0
      ? Date.now() + previewSec * 1000
      : new Date(birthdayConfig.date.targetIso).getTime();

  const wibFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: birthdayConfig.date.timezone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  let isCelebrating = false;
  let hasTriggeredBurst = false;
  let tickTimer = null;

  // Celebratory golden & blush particle burst on midnight / birthday state
  const particles = [];
  let ctx = canvas?.getContext('2d') || null;
  let rafId = null;

  function resizeCanvas() {
    if (!canvas || !ctx) return;
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function launchCelebrationParticles() {
    if (!canvas || !ctx) return;
    resizeCanvas();
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    const palette = ['#D6B77A', '#F3E6D0', '#F2C9D2', '#C9899D', '#FFF9F2'];

    for (let i = 0; i < 85; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 4.5;
      particles.push({
        x: w * (0.25 + Math.random() * 0.5),
        y: h * (0.3 + Math.random() * 0.25),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.8,
        size: 2 + Math.random() * 3.8,
        color: palette[Math.floor(Math.random() * palette.length)],
        alpha: 0.95,
        decay: 0.0045 + Math.random() * 0.006,
      });
    }

    if (!rafId) {
      const render = () => {
        const cw = canvas.clientWidth || window.innerWidth;
        const ch = canvas.clientHeight || window.innerHeight;
        ctx.clearRect(0, 0, cw, ch);

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.038;
          p.vx *= 0.992;
          p.alpha -= p.decay;
          if (p.alpha <= 0) {
            particles.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (particles.length > 0) {
          rafId = requestAnimationFrame(render);
        } else {
          rafId = null;
        }
      };
      rafId = requestAnimationFrame(render);
    }
  }

  function enterCelebration(liveTransition) {
    if (isCelebrating) return;
    isCelebrating = true;

    if (gridEl) gridEl.style.display = 'none';
    if (celebrationEl) celebrationEl.classList.add('is-active');
    if (tzNoteEl) {
      tzNoteEl.textContent = `Jakarta Time · ${wibFormatter.format(new Date())} WIB`;
    }

    if (!hasTriggeredBurst) {
      hasTriggeredBurst = true;
      launchCelebrationParticles();
      if (liveTransition) {
        audioEngine.playCelebration();
      }
    }
  }

  function update() {
    const now = Date.now();
    const diff = targetMs - now;

    if (tzNoteEl) {
      tzNoteEl.textContent = `Asia/Jakarta · ${wibFormatter.format(new Date(now))} WIB`;
    }

    if (diff <= 0) {
      // Never show negative numbers
      if (daysEl) daysEl.textContent = '00';
      if (hoursEl) hoursEl.textContent = '00';
      if (minsEl) minsEl.textContent = '00';
      if (secsEl) secsEl.textContent = '00';
      const liveTransition = gridEl && gridEl.style.display !== 'none' && !isCelebrating;
      enterCelebration(liveTransition);
      return;
    }

    const totalSec = Math.floor(diff / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minsEl) minsEl.textContent = String(minutes).padStart(2, '0');
    if (secsEl) secsEl.textContent = String(seconds).padStart(2, '0');
  }

  continueBtn?.addEventListener('click', () => {
    audioEngine.playSoftTransition();
    document.getElementById('scene-reveal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Check immediately on load (handles post-midnight visits instantaneously)
  if (Date.now() >= targetMs) {
    enterCelebration(false);
  }
  update();
  tickTimer = setInterval(update, 1000);

  return {
    celebratePulse() {
      if (isCelebrating) {
        launchCelebrationParticles();
      }
    },
    destroy() {
      clearInterval(tickTimer);
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resizeCanvas);
    },
  };
}

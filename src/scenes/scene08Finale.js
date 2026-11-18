import { birthdayConfig } from '../config/birthdayConfig.js';
import { audioEngine } from '../audio/audioEngine.js';

/**
 * Scene 08 — The Grand Finale
 * Full-screen birthday celebration with champagne-gold fireworks, floating hearts,
 * delicate confetti, Liana's twilight portrait, and Replay Story interaction.
 */
export function initScene08Finale({ onReplay }) {
  const section = document.getElementById('scene-finale');
  const canvas = document.getElementById('finale-canvas');
  const portraitImg = document.getElementById('finale-portrait-img');
  const replayBtn = document.getElementById('replay-story-btn');

  const cfg = birthdayConfig.featuredPhotos.grandFinale;
  if (portraitImg && cfg) {
    if (portraitImg.tagName.toLowerCase() === 'image') {
      portraitImg.setAttribute('href', cfg.src);
    } else {
      portraitImg.src = cfg.src;
      portraitImg.alt = cfg.alt;
      portraitImg.style.objectPosition = cfg.objectPosition || 'center 30%';
    }
  }

  const ctx = canvas?.getContext('2d') || null;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width = 0;
  let height = 0;
  let rafId = null;
  let isActive = false;
  let hasPlayedFinaleSound = false;
  let lastFireworkTime = 0;

  const sparks = [];
  const hearts = [];
  const confetti = [];
  const COLORS = ['#D6B77A', '#F3E6D0', '#F2C9D2', '#C9899D', '#FFF9F2'];

  function resize() {
    if (!canvas || !ctx) return;
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnFirework() {
    const cx = width * (0.14 + Math.random() * 0.72);
    const cy = height * (0.14 + Math.random() * 0.42);
    const baseColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const count = 34 + Math.floor(Math.random() * 20);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.14;
      const spd = 1.2 + Math.random() * 3.4;
      sparks.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        r: 1.2 + Math.random() * 2,
        color: Math.random() > 0.35 ? baseColor : '#FFF9F2',
        alpha: 0.95,
        decay: 0.011 + Math.random() * 0.01,
      });
    }
  }

  function seedAtmosphere() {
    hearts.length = 0;
    confetti.length = 0;
    for (let i = 0; i < 18; i++) {
      hearts.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 6 + Math.random() * 9,
        vy: -(0.28 + Math.random() * 0.48),
        phase: Math.random() * Math.PI * 2,
        alpha: 0.14 + Math.random() * 0.28,
        color: i % 2 === 0 ? '#F2C9D2' : '#D6B77A',
      });
    }
    for (let i = 0; i < 42; i++) {
      confetti.push({
        x: Math.random() * width,
        y: Math.random() * height,
        w: 4 + Math.random() * 5,
        h: 7 + Math.random() * 6,
        vy: 0.35 + Math.random() * 0.7,
        vx: (Math.random() - 0.5) * 0.35,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.04,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 0.22 + Math.random() * 0.45,
      });
    }
  }

  function drawHeart(x, y, size) {
    ctx.beginPath();
    const topCurve = size * 0.3;
    ctx.moveTo(x, y + topCurve);
    ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurve);
    ctx.bezierCurveTo(x - size / 2, y + (size + topCurve) / 2, x, y + (size + topCurve) / 1.25, x, y + size);
    ctx.bezierCurveTo(x, y + (size + topCurve) / 1.25, x + size / 2, y + (size + topCurve) / 2, x + size / 2, y + topCurve);
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurve);
    ctx.closePath();
    ctx.fill();
  }

  function tick(now) {
    if (!isActive || !ctx) return;
    rafId = requestAnimationFrame(tick);

    ctx.clearRect(0, 0, width, height);

    // Periodic elegant fireworks
    if (now - lastFireworkTime > 1550) {
      lastFireworkTime = now;
      spawnFirework();
    }

    // Update & draw sparks
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.025;
      s.vx *= 0.985;
      s.alpha -= s.decay;
      if (s.alpha <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Floating hearts
    for (const h of hearts) {
      h.phase += 0.02;
      h.y += h.vy;
      h.x += Math.sin(h.phase) * 0.32;
      if (h.y < -20) {
        h.y = height + 20;
        h.x = Math.random() * width;
      }
      ctx.globalAlpha = h.alpha;
      ctx.fillStyle = h.color;
      drawHeart(h.x, h.y, h.size);
    }

    // Soft confetti
    for (const c of confetti) {
      c.y += c.vy;
      c.x += c.vx + Math.sin(c.rot) * 0.25;
      c.rot += c.vRot;
      if (c.y > height + 16) {
        c.y = -16;
        c.x = Math.random() * width;
      }
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.globalAlpha = c.alpha;
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!isActive && !reduced) {
            isActive = true;
            resize();
            if (!hearts.length) seedAtmosphere();
            spawnFirework();
            rafId = requestAnimationFrame(tick);
          }
          if (!hasPlayedFinaleSound) {
            hasPlayedFinaleSound = true;
            audioEngine.playCelebration();
          }
        } else {
          isActive = false;
          cancelAnimationFrame(rafId);
        }
      });
    },
    { threshold: 0.22 }
  );

  if (section) observer.observe(section);
  window.addEventListener('resize', () => {
    resize();
    seedAtmosphere();
  });

  replayBtn?.addEventListener('click', () => {
    audioEngine.playSoftTransition();
    hasPlayedFinaleSound = false;
    onReplay?.();
  });

  return {
    reset() {
      hasPlayedFinaleSound = false;
    },
  };
}

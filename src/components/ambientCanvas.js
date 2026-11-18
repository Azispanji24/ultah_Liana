/**
 * AmbientCanvas — Floating golden dust motes & soft bokeh particles
 * Automatically respects prefers-reduced-motion and pauses when tab is hidden.
 */
export function initAmbientCanvas() {
  const canvas = document.getElementById('ambient-canvas');
  if (!canvas) return () => {};

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  let width = 0;
  let height = 0;
  let rafId = null;
  let particles = [];

  const COLORS = [
    'rgba(214, 183, 122, ', // Soft Gold
    'rgba(243, 230, 208, ', // Champagne
    'rgba(242, 201, 210, ', // Soft Blush
  ];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createParticles() {
    const count = Math.min(58, Math.max(24, Math.floor((width * height) / 28000)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.7 + Math.random() * 2.1,
      vx: (Math.random() - 0.5) * 0.16,
      vy: -(0.12 + Math.random() * 0.28),
      alpha: 0.14 + Math.random() * 0.44,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: 0.008 + Math.random() * 0.016,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
  }

  function drawFrame() {
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      p.phase += p.phaseSpeed;
      p.x += p.vx + Math.sin(p.phase) * 0.08;
      p.y += p.vy;

      if (p.y < -12) {
        p.y = height + 12;
        p.x = Math.random() * width;
      }
      if (p.x < -12) p.x = width + 12;
      if (p.x > width + 12) p.x = -12;

      const twinkle = 0.55 + 0.45 * Math.sin(p.phase);
      const a = p.alpha * twinkle;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}${a.toFixed(3)})`;
      ctx.fill();

      if (p.r > 1.7) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3.1, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${(a * 0.16).toFixed(3)})`;
        ctx.fill();
      }
    }
    rafId = requestAnimationFrame(drawFrame);
  }

  resize();
  createParticles();

  if (reduced) {
    // Draw a single serene static frame
    drawFrame();
    cancelAnimationFrame(rafId);
  } else {
    rafId = requestAnimationFrame(drawFrame);
  }

  const onResize = () => {
    resize();
    createParticles();
  };

  const onVisibility = () => {
    if (reduced) return;
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      rafId = requestAnimationFrame(drawFrame);
    }
  };

  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

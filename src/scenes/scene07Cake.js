import { createBirthdayCake3D } from '../components/cake3d.js';
import { audioEngine } from '../audio/audioEngine.js';

/**
 * Scene 07 — The Birthday Cake
 * Interactive 3D Birthday Cake with 21 candles.
 * Supports:
 *  - Reliable "BLOW THE CANDLES" button (primary, always available)
 *  - Optional Microphone blow detection (Web Audio AnalyserNode, never mandatory)
 *  - Dark-to-warm lighting shift, smoke wisps, golden particle celebration & wish message
 */
export function initScene07Cake() {
  const section = document.getElementById('scene-cake');
  const stageBox = document.getElementById('cake-stage-box');
  const badgeEl = document.getElementById('cake-candle-badge');
  const instructionEl = document.getElementById('cake-instruction');
  const blowBtn = document.getElementById('blow-candles-btn');
  const micBtn = document.getElementById('mic-blow-btn');
  const micWrap = document.getElementById('mic-meter-wrap');
  const micFill = document.getElementById('mic-meter-fill');
  const micStatus = document.getElementById('mic-status-text');
  const wishWrap = document.getElementById('cake-wish-message');
  const relightBtn = document.getElementById('relight-candles-btn');
  const toFinaleBtn = document.getElementById('cake-to-finale-btn');
  const particlesCanvas = document.getElementById('cake-particles-canvas');

  let cake = null;
  let isBlown = false;

  // Optional Microphone state
  let micStream = null;
  let micCtx = null;
  let micRaf = null;
  let micActive = false;

  // Celebratory particles on cake blow
  const pCtx = particlesCanvas?.getContext('2d') || null;
  const particles = [];
  let pRaf = null;

  function resizeParticleCanvas() {
    if (!particlesCanvas || !pCtx) return;
    const rect = particlesCanvas.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    particlesCanvas.width = Math.floor(rect.width * dpr);
    particlesCanvas.height = Math.floor(rect.height * dpr);
    pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function launchWishParticles() {
    if (!particlesCanvas || !pCtx) return;
    resizeParticleCanvas();
    const w = particlesCanvas.clientWidth || window.innerWidth;
    const h = particlesCanvas.clientHeight || window.innerHeight;
    const colors = ['#D6B77A', '#FFF9F2', '#F2C9D2', '#F3E6D0', '#C9899D'];

    for (let i = 0; i < 110; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.4 + Math.random() * 5.2;
      particles.push({
        x: w * 0.5 + (Math.random() - 0.5) * 140,
        y: h * 0.48 + (Math.random() - 0.5) * 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.2,
        r: 1.8 + Math.random() * 3.6,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.005 + Math.random() * 0.006,
      });
    }

    if (!pRaf) {
      const step = () => {
        const cw = particlesCanvas.clientWidth || window.innerWidth;
        const ch = particlesCanvas.clientHeight || window.innerHeight;
        pCtx.clearRect(0, 0, cw, ch);

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.04;
          p.vx *= 0.99;
          p.alpha -= p.decay;
          if (p.alpha <= 0) {
            particles.splice(i, 1);
            continue;
          }
          pCtx.globalAlpha = Math.max(0, p.alpha);
          pCtx.fillStyle = p.color;
          pCtx.beginPath();
          pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          pCtx.fill();
        }
        pCtx.globalAlpha = 1;

        if (particles.length > 0) {
          pRaf = requestAnimationFrame(step);
        } else {
          pRaf = null;
        }
      };
      pRaf = requestAnimationFrame(step);
    }
  }

  function stopMic() {
    micActive = false;
    cancelAnimationFrame(micRaf);
    micRaf = null;
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      micStream = null;
    }
    if (micCtx) {
      micCtx.close().catch(() => {});
      micCtx = null;
    }
    micWrap?.classList.remove('is-active');
    if (micFill) micFill.style.width = '0%';
    if (micBtn) micBtn.textContent = 'USE MICROPHONE TO BLOW';
  }

  async function toggleMicDetection() {
    if (isBlown) return;
    if (micActive) {
      stopMic();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      if (micStatus) micStatus.textContent = 'Microphone is unavailable here — tap "BLOW THE CANDLES" anytime.';
      micWrap?.classList.add('is-active');
      return;
    }

    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      micCtx = new AudioCtx();
      const source = micCtx.createMediaStreamSource(micStream);
      const analyser = micCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.65;
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      micActive = true;
      micWrap?.classList.add('is-active');
      if (micBtn) micBtn.textContent = 'STOP MICROPHONE';
      if (micStatus) micStatus.textContent = 'Listening... gently blow toward your microphone!';

      let sustainedFrames = 0;

      const listen = () => {
        if (!micActive || isBlown) return;
        analyser.getByteFrequencyData(data);

        // Compute broadband energy across low-mid frequencies typical of breath/wind
        let sum = 0;
        const bins = Math.min(48, data.length);
        for (let i = 2; i < bins; i++) sum += data[i];
        const avg = sum / (bins - 2);
        const pct = Math.min(100, Math.round((avg / 90) * 100));
        if (micFill) micFill.style.width = `${pct}%`;

        if (avg > 56) {
          sustainedFrames++;
          if (sustainedFrames >= 7) {
            triggerBlowCandles();
            return;
          }
        } else {
          sustainedFrames = Math.max(0, sustainedFrames - 1);
        }

        micRaf = requestAnimationFrame(listen);
      };
      micRaf = requestAnimationFrame(listen);
    } catch {
      if (micStatus) {
        micStatus.textContent = 'Microphone permission was not granted — use the "BLOW THE CANDLES" button above.';
      }
      micWrap?.classList.add('is-active');
      stopMicStreamOnly();
    }
  }

  function stopMicStreamOnly() {
    micActive = false;
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      micStream = null;
    }
  }

  function triggerBlowCandles() {
    if (isBlown) return;
    isBlown = true;
    stopMic();

    audioEngine.playCandleBlow();
    cake?.blowOut();

    section?.classList.add('is-wished');
    if (badgeEl) badgeEl.textContent = '21 Wishes Sent';
    if (instructionEl) instructionEl.style.opacity = '0.45';
    if (blowBtn) {
      blowBtn.disabled = true;
      blowBtn.textContent = 'WISH MADE ✨';
    }
    if (micBtn) {
      micBtn.style.display = 'none';
    }

    setTimeout(() => {
      launchWishParticles();
      wishWrap?.classList.add('is-visible');
    }, 620);
  }

  function resetCake() {
    isBlown = false;
    stopMic();
    cake?.relight();
    section?.classList.remove('is-wished');
    wishWrap?.classList.remove('is-visible');
    if (badgeEl) badgeEl.textContent = '21 Lit Candles';
    if (instructionEl) instructionEl.style.opacity = '1';
    if (blowBtn) {
      blowBtn.disabled = false;
      blowBtn.textContent = 'BLOW THE CANDLES';
    }
    if (micBtn) {
      micBtn.style.display = '';
    }
  }

  // Lazy-initialize 3D cake cleanly when page loads
  createBirthdayCake3D(stageBox).then((instance) => {
    cake = instance;
  });

  blowBtn?.addEventListener('click', triggerBlowCandles);
  micBtn?.addEventListener('click', toggleMicDetection);
  relightBtn?.addEventListener('click', () => {
    audioEngine.playSparkle(2);
    resetCake();
  });
  toFinaleBtn?.addEventListener('click', () => {
    audioEngine.playSoftTransition();
    document.getElementById('scene-finale')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  window.addEventListener('resize', resizeParticleCanvas);

  return {
    reset: resetCake,
    destroy() {
      stopMic();
      cancelAnimationFrame(pRaf);
      cake?.destroy();
      window.removeEventListener('resize', resizeParticleCanvas);
    },
  };
}

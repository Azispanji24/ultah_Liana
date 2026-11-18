/**
 * Cake3D — Interactive 3D Birthday Cake with 21 Lit Candles
 *
 * Uses Three.js WebGL when available (CDN ES Module) for true 3D geometry,
 * dynamic candlelight illumination, drag-to-orbit inspection, wave-extinguish flames,
 * and rising smoke wisps. Automatically falls back to a luminous shaded 2D Canvas
 * cake with 21 animated candles when offline or WebGL is unavailable.
 */

const TOTAL_CANDLES = 21;

export async function createBirthdayCake3D(container) {
  if (!container) {
    return { blowOut() {}, relight() {}, destroy() {} };
  }

  try {
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
    return mountThreeCake(container, THREE);
  } catch {
    return mountCanvasFallbackCake(container);
  }
}

function createGlowTexture(THREE, innerColor, outerColor) {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  g.addColorStop(0, innerColor);
  g.addColorStop(0.35, outerColor);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function mountThreeCake(container, THREE) {
  const width = container.clientWidth || 640;
  const height = container.clientHeight || 420;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
  const setResponsiveCamera = (w, h) => {
    const aspect = w / Math.max(1, h);
    camera.aspect = aspect;
    if (aspect < 1.05) {
      camera.position.set(0, 3.65, 9.6);
    } else if (aspect < 1.35) {
      camera.position.set(0, 3.5, 8.5);
    } else {
      camera.position.set(0, 3.35, 7.6);
    }
    camera.lookAt(0, 0.72, 0);
    camera.updateProjectionMatrix();
  };
  setResponsiveCamera(width, height);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // Lighting: starts intimate & candlelit, warms up when candles are blown out
  const ambientLight = new THREE.AmbientLight(0xffe6ee, 0.52);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xfff4e2, 0.72);
  keyLight.position.set(4, 7, 5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xf2c9d2, 0.55);
  rimLight.position.set(-5, 4, -4);
  scene.add(rimLight);

  const candleLightTop = new THREE.PointLight(0xffb85c, 2.8, 12, 1.5);
  candleLightTop.position.set(0, 2.55, 0.4);
  scene.add(candleLightTop);

  const candleLightRim = new THREE.PointLight(0xff9b45, 1.6, 10, 1.6);
  candleLightRim.position.set(0, 1.45, 1.6);
  scene.add(candleLightRim);

  // Master cake group for rotation
  const cakeGroup = new THREE.Group();
  cakeGroup.position.y = -0.35;
  scene.add(cakeGroup);

  // Materials
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd6b77a,
    metalness: 0.72,
    roughness: 0.28,
  });
  const blushCreamMat = new THREE.MeshStandardMaterial({
    color: 0xf2c9d2,
    roughness: 0.52,
    metalness: 0.04,
  });
  const ivoryCreamMat = new THREE.MeshStandardMaterial({
    color: 0xfff7ee,
    roughness: 0.48,
    metalness: 0.03,
  });
  const roseMat = new THREE.MeshStandardMaterial({
    color: 0xc9899d,
    roughness: 0.44,
    metalness: 0.06,
  });
  const pearlMat = new THREE.MeshStandardMaterial({
    color: 0xfff9f2,
    roughness: 0.22,
    metalness: 0.18,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0xf3e6d0,
    roughness: 0.25,
    metalness: 0.35,
  });

  // Pedestal Stand
  const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.28, 0.22, 48), goldMat);
  standBase.position.y = -0.78;
  cakeGroup.add(standBase);

  const standStem = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.44, 0.55, 36), goldMat);
  standStem.position.y = -0.44;
  cakeGroup.add(standStem);

  const standPlate = new THREE.Mesh(new THREE.CylinderGeometry(2.42, 2.25, 0.14, 64), plateMat);
  standPlate.position.y = -0.1;
  cakeGroup.add(standPlate);

  const plateRim = new THREE.Mesh(new THREE.TorusGeometry(2.38, 0.045, 16, 72), goldMat);
  plateRim.rotation.x = Math.PI / 2;
  plateRim.position.y = -0.05;
  cakeGroup.add(plateRim);

  // Tier 1 (Bottom Tier — Soft Blush Buttercream)
  const tier1Radius = 1.98;
  const tier1Height = 1.05;
  const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(tier1Radius, tier1Radius * 1.02, tier1Height, 64), blushCreamMat);
  tier1.position.y = 0.5;
  cakeGroup.add(tier1);

  // Soft gold ribbon around bottom of Tier 1
  const ribbon1 = new THREE.Mesh(new THREE.TorusGeometry(tier1Radius + 0.015, 0.05, 14, 72), goldMat);
  ribbon1.rotation.x = Math.PI / 2;
  ribbon1.position.y = 0.05;
  cakeGroup.add(ribbon1);

  // Ivory frosting crown + drips on Tier 1
  const tier1TopFrosting = new THREE.Mesh(new THREE.CylinderGeometry(tier1Radius + 0.03, tier1Radius + 0.03, 0.12, 64), ivoryCreamMat);
  tier1TopFrosting.position.y = 1.02;
  cakeGroup.add(tier1TopFrosting);

  const dripCount1 = 26;
  for (let i = 0; i < dripCount1; i++) {
    const angle = (i / dripCount1) * Math.PI * 2;
    const dripLen = 0.16 + ((i * 37) % 10) * 0.024;
    const drip = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, dripLen, 6, 12), ivoryCreamMat);
    drip.position.set(
      Math.cos(angle) * (tier1Radius + 0.01),
      0.98 - dripLen * 0.5,
      Math.sin(angle) * (tier1Radius + 0.01)
    );
    cakeGroup.add(drip);
  }

  // Pearl bead ring around Tier 1 top edge
  const pearlCount1 = 36;
  for (let i = 0; i < pearlCount1; i++) {
    const a = (i / pearlCount1) * Math.PI * 2;
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 12), i % 3 === 0 ? goldMat : pearlMat);
    pearl.position.set(Math.cos(a) * (tier1Radius - 0.03), 1.09, Math.sin(a) * (tier1Radius - 0.03));
    cakeGroup.add(pearl);
  }

  // Tier 2 (Top Tier — Warm Ivory Buttercream)
  const tier2Radius = 1.24;
  const tier2Height = 0.92;
  const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(tier2Radius, tier2Radius * 1.015, tier2Height, 64), ivoryCreamMat);
  tier2.position.y = 1.5;
  cakeGroup.add(tier2);

  // Delicate rose-blush frosting top + drips on Tier 2
  const tier2TopFrosting = new THREE.Mesh(new THREE.CylinderGeometry(tier2Radius + 0.025, tier2Radius + 0.025, 0.1, 64), blushCreamMat);
  tier2TopFrosting.position.y = 1.96;
  cakeGroup.add(tier2TopFrosting);

  const dripCount2 = 18;
  for (let i = 0; i < dripCount2; i++) {
    const angle = (i / dripCount2) * Math.PI * 2 + 0.15;
    const dripLen = 0.12 + ((i * 29) % 8) * 0.022;
    const drip = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, dripLen, 6, 12), blushCreamMat);
    drip.position.set(
      Math.cos(angle) * (tier2Radius + 0.01),
      1.92 - dripLen * 0.5,
      Math.sin(angle) * (tier2Radius + 0.01)
    );
    cakeGroup.add(drip);
  }

  // Decorative dusty-rose macarons / cream rosettes around Tier 2 base
  const rosetteCount = 14;
  for (let i = 0; i < rosetteCount; i++) {
    const a = (i / rosetteCount) * Math.PI * 2;
    const rosette = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 14), i % 2 === 0 ? roseMat : blushCreamMat);
    rosette.scale.set(1, 0.65, 1);
    rosette.position.set(Math.cos(a) * (tier2Radius + 0.06), 1.1, Math.sin(a) * (tier2Radius + 0.06));
    cakeGroup.add(rosette);
  }

  // Center Gold Halo Crown Emblem on Top Tier
  const centerCrown = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.026, 12, 48), goldMat);
  centerCrown.rotation.x = Math.PI / 2;
  centerCrown.position.y = 2.02;
  cakeGroup.add(centerCrown);

  // =========================================================================
  // 21 INDIVIDUAL BIRTHDAY CANDLES (13 on Tier 1 rim + 8 on Tier 2 top = 21!)
  // =========================================================================
  const candles = [];
  const candleWaxColors = [0xfff9f2, 0xf2c9d2, 0xf3e6d0, 0xd6b77a];
  const flameGlowTex = createGlowTexture(THREE, 'rgba(255, 246, 200, 0.95)', 'rgba(255, 168, 76, 0.42)');
  const smokeTex = createGlowTexture(THREE, 'rgba(243, 230, 208, 0.55)', 'rgba(201, 137, 157, 0.16)');

  const flameOuterMat = new THREE.MeshBasicMaterial({ color: 0xffa63d, transparent: true, opacity: 0.94 });
  const flameCoreMat = new THREE.MeshBasicMaterial({ color: 0xfff9db, transparent: true, opacity: 0.98 });
  const wickMat = new THREE.MeshBasicMaterial({ color: 0x2a1820 });

  const addCandle = (x, baseY, z, idx) => {
    const group = new THREE.Group();
    group.position.set(x, baseY, z);

    const h = 0.52 + (idx % 3) * 0.04;
    const waxMat = new THREE.MeshStandardMaterial({
      color: candleWaxColors[idx % candleWaxColors.length],
      roughness: 0.36,
      metalness: 0.08,
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.048, h, 16), waxMat);
    body.position.y = h / 2;
    group.add(body);

    // Delicate gold collar band on each candle
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.045, 16), goldMat);
    collar.position.y = h * 0.72;
    group.add(collar);

    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.07, 8), wickMat);
    wick.position.y = h + 0.03;
    group.add(wick);

    // Flame assembly
    const flameGroup = new THREE.Group();
    flameGroup.position.y = h + 0.095;

    const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.16, 12), flameOuterMat.clone());
    outerFlame.position.y = 0.04;
    flameGroup.add(outerFlame);

    const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.095, 10), flameCoreMat.clone());
    innerFlame.position.y = 0.025;
    flameGroup.add(innerFlame);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: flameGlowTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.85,
      })
    );
    halo.scale.set(0.42, 0.42, 1);
    halo.position.y = 0.04;
    flameGroup.add(halo);

    group.add(flameGroup);
    cakeGroup.add(group);

    candles.push({
      group,
      flameGroup,
      halo,
      topY: baseY + h + 0.09,
      x,
      z,
      phase: Math.random() * Math.PI * 2,
      lit: 1,
      blowDelay: 0,
      smokeSpawned: false,
    });
  };

  // Ring 1: 13 candles along Tier 1 shoulder
  for (let i = 0; i < 13; i++) {
    const a = (i / 13) * Math.PI * 2;
    const r = 1.62;
    addCandle(Math.cos(a) * r, 1.06, Math.sin(a) * r, i);
  }
  // Ring 2: 8 candles crowning Tier 2 top (13 + 8 = 21!)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.22;
    const r = 0.82;
    addCandle(Math.cos(a) * r, 2.0, Math.sin(a) * r, 13 + i);
  }

  // Floating golden sparkles around cake
  const sparkleCount = 65;
  const sparklePos = new Float32Array(sparkleCount * 3);
  const sparkleSeeds = [];
  for (let i = 0; i < sparkleCount; i++) {
    const rad = 2.0 + Math.random() * 2.4;
    const ang = Math.random() * Math.PI * 2;
    const y = -0.3 + Math.random() * 3.4;
    sparklePos[i * 3] = Math.cos(ang) * rad;
    sparklePos[i * 3 + 1] = y;
    sparklePos[i * 3 + 2] = Math.sin(ang) * rad;
    sparkleSeeds.push({ rad, ang, y, speed: 0.12 + Math.random() * 0.25, drift: 0.002 + Math.random() * 0.004 });
  }
  const sparkleGeo = new THREE.BufferGeometry();
  sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePos, 3));
  const sparkleMat = new THREE.PointsMaterial({
    size: 0.14,
    map: flameGlowTex,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
  scene.add(sparkles);

  // Smoke puffs spawned on extinguish
  const smokePuffs = [];
  function spawnSmoke(c) {
    for (let k = 0; k < 3; k++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: smokeTex,
          transparent: true,
          opacity: 0.52,
          depthWrite: false,
        })
      );
      sp.position.set(c.x + (Math.random() - 0.5) * 0.05, c.topY + k * 0.05, c.z + (Math.random() - 0.5) * 0.05);
      sp.scale.set(0.16, 0.16, 1);
      cakeGroup.add(sp);
      smokePuffs.push({
        sprite: sp,
        vx: (Math.random() - 0.5) * 0.004,
        vy: 0.011 + Math.random() * 0.007,
        vz: (Math.random() - 0.5) * 0.004,
        life: 1,
      });
    }
  }

  // Pointer drag orbit
  let isDragging = false;
  let lastX = 0;
  let rotVel = 0.0032;
  let targetRotY = 0;

  const onDown = (e) => {
    isDragging = true;
    lastX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
  };
  const onMove = (e) => {
    if (!isDragging) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX ?? lastX;
    const dx = x - lastX;
    lastX = x;
    targetRotY += dx * 0.0085;
  };
  const onUp = () => {
    isDragging = false;
  };

  renderer.domElement.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  // State
  let isBlowingOut = false;
  let blowStartTime = 0;
  let allOut = false;
  let rafId = null;
  const clock = new THREE.Clock();

  function animate() {
    rafId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (!isDragging) {
      targetRotY += rotVel;
    }
    cakeGroup.rotation.y += (targetRotY - cakeGroup.rotation.y) * 0.08;

    // Animate 21 candle flames
    let litSum = 0;
    for (const c of candles) {
      if (isBlowingOut) {
        const elapsed = t - blowStartTime - c.blowDelay;
        if (elapsed > 0) {
          c.lit = Math.max(0, 1 - elapsed * 2.6);
          if (c.lit <= 0.12 && !c.smokeSpawned) {
            c.smokeSpawned = true;
            spawnSmoke(c);
          }
        }
      }
      litSum += c.lit;

      if (c.lit > 0.01) {
        c.flameGroup.visible = true;
        const flick = 1 + Math.sin(t * 14 + c.phase) * 0.1 + Math.cos(t * 23 + c.phase * 1.7) * 0.06;
        const sway = Math.sin(t * 8 + c.phase) * 0.08;
        c.flameGroup.scale.set(c.lit * (0.94 + 0.06 * flick), c.lit * flick, c.lit * (0.94 + 0.06 * flick));
        c.flameGroup.rotation.z = sway + (isBlowingOut ? 0.35 * (1 - c.lit) : 0);
        c.halo.material.opacity = 0.72 * c.lit * flick;
      } else {
        c.flameGroup.visible = false;
      }
    }

    const litRatio = litSum / TOTAL_CANDLES;
    const candleFlicker = 1 + Math.sin(t * 11) * 0.06 + Math.cos(t * 19) * 0.04;
    candleLightTop.intensity = 2.85 * litRatio * candleFlicker;
    candleLightRim.intensity = 1.65 * litRatio * candleFlicker;

    // Dark-to-warm lighting shift after blowing candles out
    const warmShift = 1 - litRatio;
    ambientLight.intensity = 0.52 + warmShift * 0.78;
    keyLight.intensity = 0.72 + warmShift * 0.65;
    keyLight.color.setHex(warmShift > 0.5 ? 0xffe4c4 : 0xfff4e2);

    // Update smoke wisps
    for (let i = smokePuffs.length - 1; i >= 0; i--) {
      const p = smokePuffs[i];
      p.sprite.position.x += p.vx + Math.sin(t * 3 + i) * 0.0018;
      p.sprite.position.y += p.vy;
      p.sprite.position.z += p.vz;
      p.sprite.scale.multiplyScalar(1.014);
      p.life -= 0.0085;
      p.sprite.material.opacity = Math.max(0, p.life * 0.45);
      if (p.life <= 0) {
        cakeGroup.remove(p.sprite);
        p.sprite.material.dispose();
        smokePuffs.splice(i, 1);
      }
    }

    // Float golden sparkles
    const pos = sparkleGeo.attributes.position;
    for (let i = 0; i < sparkleCount; i++) {
      const s = sparkleSeeds[i];
      s.ang += s.speed * 0.004;
      s.y += s.drift;
      if (s.y > 3.2) s.y = -0.4;
      pos.setXYZ(i, Math.cos(s.ang) * s.rad, s.y, Math.sin(s.ang) * s.rad);
    }
    pos.needsUpdate = true;

    renderer.render(scene, camera);
  }

  animate();

  const onResize = () => {
    const w = container.clientWidth || 640;
    const h = container.clientHeight || 420;
    setResponsiveCamera(w, h);
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  return {
    blowOut() {
      if (allOut) return;
      allOut = true;
      isBlowingOut = true;
      blowStartTime = clock.getElapsedTime();
      candles.forEach((c, idx) => {
        c.blowDelay = (idx / TOTAL_CANDLES) * 0.58 + Math.random() * 0.15;
        c.smokeSpawned = false;
      });
    },
    relight() {
      allOut = false;
      isBlowingOut = false;
      candles.forEach((c) => {
        c.lit = 1;
        c.smokeSpawned = false;
      });
    },
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      renderer.dispose();
    },
  };
}

/**
 * Graceful offline / non-WebGL shaded Canvas 2D Cake with 21 flickering candles
 */
function mountCanvasFallbackCake(container) {
  const canvas = document.createElement('canvas');
  container.innerHTML = '';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let lit = true;
  let rafId = null;
  const smokes = [];

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = (container.clientWidth || 600) * dpr;
    canvas.height = (container.clientHeight || 400) * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const draw = (time) => {
    const w = container.clientWidth || 600;
    const h = container.clientHeight || 400;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const baseY = h * 0.78;
    const t = time * 0.001;

    // Pedestal
    ctx.fillStyle = '#D6B77A';
    ctx.beginPath();
    ctx.ellipse(cx, baseY + 12, 138, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bottom tier (blush)
    const g1 = ctx.createLinearGradient(cx - 120, baseY - 75, cx + 120, baseY);
    g1.addColorStop(0, '#eab9c5');
    g1.addColorStop(0.5, '#F2C9D2');
    g1.addColorStop(1, '#d89fb0');
    ctx.fillStyle = g1;
    ctx.fillRect(cx - 120, baseY - 78, 240, 82);
    ctx.beginPath();
    ctx.ellipse(cx, baseY - 78, 120, 22, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF9F2';
    ctx.fill();

    // Top tier (ivory)
    const g2 = ctx.createLinearGradient(cx - 78, baseY - 148, cx + 78, baseY - 78);
    g2.addColorStop(0, '#f3e6d0');
    g2.addColorStop(0.5, '#FFF9F2');
    g2.addColorStop(1, '#ecd9c2');
    ctx.fillStyle = g2;
    ctx.fillRect(cx - 78, baseY - 146, 156, 68);
    ctx.beginPath();
    ctx.ellipse(cx, baseY - 146, 78, 16, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#F2C9D2';
    ctx.fill();

    // Draw 21 candles (12 lower + 9 upper)
    const drawCandle = (x, y, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? '#FFF9F2' : '#F2C9D2';
      ctx.fillRect(x - 3, y - 34, 6, 34);
      ctx.fillStyle = '#D6B77A';
      ctx.fillRect(x - 3, y - 24, 6, 4);
      if (lit) {
        const flick = Math.sin(t * 14 + idx) * 2;
        const glow = ctx.createRadialGradient(x, y - 42, 1, x, y - 42, 22);
        glow.addColorStop(0, 'rgba(255,244,195,0.95)');
        glow.addColorStop(0.4, 'rgba(255,165,70,0.45)');
        glow.addColorStop(1, 'rgba(255,165,70,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y - 42, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffae42';
        ctx.beginPath();
        ctx.ellipse(x + flick * 0.3, y - 43, 4, 8 + flick * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff9df';
        ctx.beginPath();
        ctx.ellipse(x, y - 41, 2, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    for (let i = 0; i < 12; i++) {
      const x = cx - 102 + (i / 11) * 204;
      drawCandle(x, baseY - 82, i);
    }
    for (let i = 0; i < 9; i++) {
      const x = cx - 60 + (i / 8) * 120;
      drawCandle(x, baseY - 148, 12 + i);
    }

    // Smoke wisps
    for (let i = smokes.length - 1; i >= 0; i--) {
      const s = smokes[i];
      s.y -= 0.7;
      s.x += Math.sin(t * 2 + i) * 0.3;
      s.a -= 0.008;
      s.r += 0.12;
      if (s.a <= 0) {
        smokes.splice(i, 1);
        continue;
      }
      ctx.fillStyle = `rgba(243,230,208,${s.a.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    rafId = requestAnimationFrame(draw);
  };
  rafId = requestAnimationFrame(draw);

  return {
    blowOut() {
      lit = false;
      const w = container.clientWidth || 600;
      const h = container.clientHeight || 400;
      const cx = w / 2;
      const baseY = h * 0.78;
      for (let i = 0; i < 21; i++) {
        smokes.push({ x: cx - 80 + i * 8, y: baseY - 140, r: 5, a: 0.5 });
      }
    },
    relight() {
      lit = true;
    },
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    },
  };
}

/* =========================================================
   GALAXY GALLERY — app.js
   Una galaxia espiral de partículas converge en un corazón
   a medida que se hace scroll, con un latido sutil y una
   cámara que se acerca lentamente. Todo dibujado con
   Three.js puro (sin build tools) para que funcione tal
   cual en GitHub Pages.
   ========================================================= */

/* ---------------------------------------------------------
   PARTE A — Interfaz que NO depende de Three.js:
   el botón de música y el revelado de tarjetas al hacer
   scroll. Va en su propio bloque, separado del bloque de
   abajo, para que sigan funcionando aunque el lienzo 3D
   falle por cualquier motivo (WebGL bloqueado, CDN caída, etc).
   --------------------------------------------------------- */
(function () {
  "use strict";

  // Revelado de tarjetas al hacer scroll
  const revealEls = document.querySelectorAll(
    ".entry-card, .reveal-text, .gallery-grid"
  );
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in-view"));
  }

  // Reproductor de música
  const audio = document.getElementById("bg-audio");
  const musicBtn = document.getElementById("music-toggle");
  const musicHint = document.getElementById("music-hint");
  let isPlaying = false;
  let hintTimeout = null;

  function showHint() {
    if (!musicHint) return;
    musicHint.classList.add("show");
    clearTimeout(hintTimeout);
    hintTimeout = setTimeout(() => musicHint.classList.remove("show"), 4500);
  }

  if (musicBtn && audio) {
    musicBtn.addEventListener("click", () => {
      if (!isPlaying) {
        audio
          .play()
          .then(() => {
            isPlaying = true;
            musicBtn.classList.add("playing");
            musicBtn.setAttribute("aria-pressed", "true");
            musicBtn.setAttribute("aria-label", "Pausar música");
          })
          .catch((err) => {
            console.warn("No se pudo reproducir el audio:", err);
            showHint();
          });
      } else {
        audio.pause();
        isPlaying = false;
        musicBtn.classList.remove("playing");
        musicBtn.setAttribute("aria-pressed", "false");
        musicBtn.setAttribute("aria-label", "Reproducir música");
      }
    });
  } else {
    console.warn("No se encontró el botón de música o el audio en el HTML.");
  }
})();

/* ---------------------------------------------------------
   PARTE B — El lienzo 3D (Three.js): galaxia que converge
   en un corazón. Si algo aquí falla, la PARTE A de arriba
   ya corrió y sigue funcionando sin problema.
   --------------------------------------------------------- */
(function () {
  "use strict";

  // -----------------------------------------------------
  // 0. Salvaguarda: si Three.js o WebGL no están disponibles,
  //    el fondo CSS (radial-gradient en body) sigue funcionando
  //    y el contenido se lee perfectamente sin el lienzo.
  // -----------------------------------------------------
  if (typeof THREE === "undefined") {
    console.warn("Three.js no se cargó; se muestra solo el fondo CSS.");
    return;
  }

  const canvas = document.getElementById("cosmos");
  if (!canvas) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
    });
  } catch (err) {
    console.warn("WebGL no disponible; se muestra solo el fondo CSS.", err);
    return;
  }

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // -----------------------------------------------------
  // 1. Config — toca aquí si quieres ajustar el look
  // -----------------------------------------------------
  const CONFIG = {
    particleCount: 4200,
    starCount: 700,
    heartScale: 6,
    galaxyRadius: 150,
    spiralArms: 3,
    spiralTightness: 0.32,
    camNear: 300,
    camFar: 430,
    formationViewportMultiplier: 0.85, // cuántas "pantallas" de scroll tarda en formarse el corazón
    beatPeriod: 1.15, // segundos entre latidos (~52 bpm, calmo)
    beatAmplitude: 0.05,
    colors: {
      core: 0xff2d92,
      mid: 0xb347ff,
      edge: 0x4b2980,
      star: 0xd9c7ff,
    },
  };

  // -----------------------------------------------------
  // 2. Utilidades
  // -----------------------------------------------------
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const easeInOutCubic = (x) =>
    x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

  function heartPoint(t) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);
    return { x, y };
  }

  function makeGlowTexture() {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.7)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  function makeRingTexture() {
    const size = 128;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.28,
      size / 2,
      size / 2,
      size * 0.5
    );
    grad.addColorStop(0, "rgba(255,127,208,0)");
    grad.addColorStop(0.55, "rgba(255,127,208,0.55)");
    grad.addColorStop(1, "rgba(255,127,208,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  // -----------------------------------------------------
  // 3. Escena, cámara y render
  // -----------------------------------------------------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 0, CONFIG.camFar);

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  let aspectFactor = 1;
  function updateAspectFactor() {
    const aspect = window.innerWidth / window.innerHeight;
    // pantallas angostas (celulares en vertical) necesitan más distancia
    // para que el corazón no se corte a los lados.
    aspectFactor = clamp(1.1 / aspect, 1, 2.1);
  }
  updateAspectFactor();

  // -----------------------------------------------------
  // 4. Estrellas lejanas (fondo estático, solo rota el grupo)
  // -----------------------------------------------------
  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(CONFIG.starCount * 3);
  for (let i = 0; i < CONFIG.starCount; i++) {
    const radius = 600 + Math.random() * 500;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = radius * Math.cos(phi);
  }
  starGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(starPositions, 3)
  );
  const starMaterial = new THREE.PointsMaterial({
    size: 2.4,
    map: makeGlowTexture(),
    transparent: true,
    opacity: 0.55,
    color: CONFIG.colors.star,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const starField = new THREE.Points(starGeometry, starMaterial);
  scene.add(starField);

  // -----------------------------------------------------
  // 5. Sistema principal: galaxia <-> corazón
  // -----------------------------------------------------
  const count = CONFIG.particleCount;
  const origins = new Float32Array(count * 3); // posición "galaxia" (caos)
  const targets = new Float32Array(count * 3); // posición "corazón" (orden)
  const positions = new Float32Array(count * 3); // posición en pantalla, cada frame
  const colors = new Float32Array(count * 3);

  const coreColor = new THREE.Color(CONFIG.colors.core);
  const midColor = new THREE.Color(CONFIG.colors.mid);
  const edgeColor = new THREE.Color(CONFIG.colors.edge);
  const sparkle = new THREE.Color(0xffffff);

  for (let i = 0; i < count; i++) {
    // --- destino: punto dentro del corazón (relleno, no solo contorno) ---
    const t = Math.random() * Math.PI * 2;
    const boundary = heartPoint(t);
    const k = Math.sqrt(Math.random()); // distribución más uniforme en área
    const hx = boundary.x * k * CONFIG.heartScale;
    const hy = boundary.y * k * CONFIG.heartScale;
    const depth = 22 * (0.3 + 0.7 * (1 - k));
    const hz = (Math.random() - 0.5) * depth;
    const jitter = 2.2;

    targets[i * 3] = hx + (Math.random() - 0.5) * jitter;
    targets[i * 3 + 1] = hy + (Math.random() - 0.5) * jitter;
    targets[i * 3 + 2] = hz;

    // --- color según distancia al centro del corazón ---
    let col;
    if (k < 0.5) {
      col = coreColor.clone().lerp(midColor, k / 0.5);
    } else {
      col = midColor.clone().lerp(edgeColor, (k - 0.5) / 0.5);
    }
    if (Math.random() < 0.06) col = col.clone().lerp(sparkle, 0.5);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;

    // --- origen: galaxia espiral (caos inicial) ---
    const arm = Math.floor(Math.random() * CONFIG.spiralArms);
    const baseRadius = Math.sqrt(Math.random()) * CONFIG.galaxyRadius;
    const spiralAngle =
      baseRadius * CONFIG.spiralTightness +
      arm * ((Math.PI * 2) / CONFIG.spiralArms) +
      (Math.random() - 0.5) * 0.6;
    const gx = Math.cos(spiralAngle) * baseRadius;
    const gyFlat = Math.sin(spiralAngle) * baseRadius;
    const tilt = 0.9; // inclinación del disco galáctico

    origins[i * 3] = gx;
    origins[i * 3 + 1] = gyFlat * Math.cos(tilt) + (Math.random() - 0.5) * 10;
    origins[i * 3 + 2] = gyFlat * Math.sin(tilt);

    positions[i * 3] = origins[i * 3];
    positions[i * 3 + 1] = origins[i * 3 + 1];
    positions[i * 3 + 2] = origins[i * 3 + 2];
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 3.4,
    map: makeGlowTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const cosmos = new THREE.Points(geometry, material);
  scene.add(cosmos);

  // -----------------------------------------------------
  // 6. Anillo de latido (pulso que nace del centro del corazón)
  // -----------------------------------------------------
  const ringMaterial = new THREE.SpriteMaterial({
    map: makeRingTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ringSprite = new THREE.Sprite(ringMaterial);
  ringSprite.scale.set(40, 40, 1);
  scene.add(ringSprite);
  let ringScale = 0.4;
  let ringOpacity = 0;

  // -----------------------------------------------------
  // 7. Bucle de animación
  // -----------------------------------------------------
  const startTime = performance.now();
  let prevPhase = 0;

  function getFormProgress() {
    const formationDistance =
      window.innerHeight * CONFIG.formationViewportMultiplier;
    const frac = formationDistance > 0 ? window.scrollY / formationDistance : 0;
    return easeInOutCubic(clamp(frac, 0, 1));
  }

  function heartbeat(elapsedSec, formProgress) {
    const phase = (elapsedSec % CONFIG.beatPeriod) / CONFIG.beatPeriod;
    const bump = (x, center, width) =>
      Math.exp(-((x - center) * (x - center)) / (2 * width * width));
    const raw = bump(phase, 0.08, 0.035) * 1.0 + bump(phase, 0.24, 0.05) * 0.6;
    const triggeredRing = phase < prevPhase && formProgress > 0.5;
    prevPhase = phase;
    return {
      scale: 1 + raw * CONFIG.beatAmplitude * formProgress,
      newBeat: triggeredRing,
    };
  }

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const elapsedSec = (now - startTime) / 1000;
    const formProgress = getFormProgress();

    const hb = reducedMotion
      ? { scale: 1, newBeat: false }
      : heartbeat(elapsedSec, formProgress);

    // --- mezclar posiciones: galaxia (caos) -> corazón (orden) ---
    const posAttr = geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      const ox = origins[i * 3];
      const oy = origins[i * 3 + 1];
      const oz = origins[i * 3 + 2];
      const tx = targets[i * 3] * hb.scale;
      const ty = targets[i * 3 + 1] * hb.scale;
      const tz = targets[i * 3 + 2];

      positions[i * 3] = lerp(ox, tx, formProgress);
      positions[i * 3 + 1] = lerp(oy, ty, formProgress);
      positions[i * 3 + 2] = lerp(oz, tz, formProgress);
    }
    posAttr.needsUpdate = true;

    // --- rotación ambiental: rápida como galaxia, calma como corazón ---
    if (!reducedMotion) {
      const rotSpeed = lerp(0.12, 0.025, formProgress);
      cosmos.rotation.y += rotSpeed * 0.016;
      starField.rotation.y += 0.0015;
    }

    // --- anillo de pulso ---
    if (hb.newBeat) {
      ringScale = 0.4;
      ringOpacity = 0.6;
    }
    if (ringOpacity > 0) {
      ringScale += 0.9;
      ringOpacity -= 0.018;
      ringSprite.scale.set(ringScale * 14, ringScale * 14, 1);
      ringMaterial.opacity = Math.max(0, ringOpacity);
    }

    // --- cámara: se acerca a medida que el corazón se forma ---
    const camDist = lerp(CONFIG.camFar, CONFIG.camNear, formProgress) * aspectFactor;
    const drift = reducedMotion ? 0 : Math.sin(elapsedSec * 0.2) * 6;
    camera.position.x = drift;
    camera.position.y = reducedMotion ? 0 : Math.cos(elapsedSec * 0.15) * 4;
    camera.position.z = camDist;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();

  // -----------------------------------------------------
  // 8. Redimensionamiento dinámico
  // -----------------------------------------------------
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateAspectFactor();
  });
})();

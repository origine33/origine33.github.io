// Glowing Particles — adapted from an OriginKit (originkit.dev) React/Three.js
// component into vanilla JS for this no-build-step static site. The
// BurstScene class below is a straight port of the original's rendering
// logic (shaders unchanged); only the React wrapper was replaced with plain
// DOM/ResizeObserver wiring.
//
// Tuned for a LIGHT page background (see CONFIG below) rather than the
// dark backdrop the original demo assumes — additive-blended glow reads as
// a soft tinted haze here instead of a bright burst, which is the intended,
// more subtle look for this site.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const PERSPECTIVE = 0.15;
const REACH = 2.7;

const CONFIG = {
  color: "#123a66",     // sustained particle color — dark accent, stays visible on light bg
  hot: "#2f8fe0",       // birth-flash color — site accent
  density: 10,
  streak: 6,
  speed: 12,
  size: 3,
  bloom: 0,
  rim: 20,
  haze: 6,
  spin: 10,
  direction: "right",
  sizePercent: 90,
};

function clamp(v, lo, hi, fallback) {
  const n = typeof v === "number" && isFinite(v) ? v : fallback;
  return Math.max(lo, Math.min(hi, n));
}

function settingsFor(cfg) {
  const density = clamp(cfg.density, 1, 20, CONFIG.density);
  const streak = clamp(cfg.streak, 1, 20, CONFIG.streak);
  return {
    rays: Math.round(50 + density * density * 7),
    perRay: Math.round(1 + streak * 1.7),
    speed: clamp(cfg.speed, 0, 20, CONFIG.speed) * 0.05,
    size: 1.2 + clamp(cfg.size, 1, 20, CONFIG.size) * 1.4,
    bloom: clamp(cfg.bloom, 0, 20, CONFIG.bloom) * 0.075,
    rim: clamp(cfg.rim, 0, 20, CONFIG.rim) / 20,
    haze: clamp(cfg.haze, 0, 20, CONFIG.haze) * 0.075,
    spin: clamp(cfg.spin, 0, 20, CONFIG.spin) * 0.05,
    heading: cfg.direction === "left" ? -1 : 1,
  };
}

function buildCloud(rays, perRay) {
  const count = rays * perRay;
  const dir = new Float32Array(count * 3);
  const offset = new Float32Array(count);
  const seed = new Float32Array(count);

  const golden = Math.PI * (3 - Math.sqrt(5));
  let i = 0;

  for (let r = 0; r < rays; r++) {
    const y = 1 - (r / Math.max(1, rays - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * r;
    let dx = Math.cos(theta) * ring;
    let dy = y;
    let dz = Math.sin(theta) * ring;
    dx += (Math.random() - 0.5) * 0.1;
    dy += (Math.random() - 0.5) * 0.1;
    dz += (Math.random() - 0.5) * 0.1;
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len;
    dy /= len;
    dz /= len;
    const rayLife = 0.6 + Math.random() * 0.4;
    const phase = Math.random();

    for (let p = 0; p < perRay; p++) {
      dir[i * 3] = dx;
      dir[i * 3 + 1] = dy;
      dir[i * 3 + 2] = dz;
      offset[i] = phase + (p / perRay) * 0.2;
      seed[i] = rayLife;
      i++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(dir, 3));
  geometry.setAttribute("aOffset", new THREE.BufferAttribute(offset, 1));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  return geometry;
}

const PARTICLE_VERTEX = `
  attribute float aOffset;
  attribute float aSeed;

  uniform float uTime;
  uniform float uSpeed;
  uniform float uRadius;
  uniform float uSize;
  uniform float uRim;
  uniform float uPixelRatio;

  varying float vLife;
  varying float vBright;

  void main() {
    float t = fract(aOffset + uTime * uSpeed * (0.65 + aSeed * 0.7));
    float life = mix(aSeed, 1.0, uRim);
    float r = uRadius * life * (1.0 - pow(1.0 - t, 3.0));

    vec4 mv = modelViewMatrix * vec4(position * r, 1.0);
    gl_Position = projectionMatrix * mv;

    float shrink = 1.0 - t * 0.45;
    gl_PointSize = uSize * shrink * uPixelRatio * (10.0 / max(0.001, -mv.z));

    float birth = smoothstep(0.0, 0.05, t);
    float death = 1.0 - smoothstep(0.82, 1.0, t);
    float flick = 0.5 + 0.5 * sin(uTime * 9.0 + aSeed * 43.0 + aOffset * 61.0);
    vBright = birth * death * flick;
    vLife = t;
  }
`;

const PARTICLE_FRAGMENT = `
  uniform vec3 uColor;
  uniform vec3 uHot;

  varying float vLife;
  varying float vBright;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float fall = 1.0 - d;
    float shape = pow(fall, 5.0) + pow(fall, 1.6) * 0.3;
    vec3 col = mix(uHot, uColor, smoothstep(0.0, 0.55, vLife));
    float a = shape * vBright;

    gl_FragColor = vec4(col * a, a);
  }
`;

const HAZE_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const HAZE_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uHaze;

  varying vec2 vUv;

  void main() {
    float d = length(vUv - 0.5) * 2.0;
    if (d > 1.0) discard;

    float haze = pow(1.0 - d, 1.5);
    float a = clamp(haze * uHaze, 0.0, 1.0);
    gl_FragColor = vec4(uColor * a, a);
  }
`;

const QUAD_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const BLUR_FRAGMENT = `
  uniform sampler2D tDiffuse;
  uniform vec2 uStep;
  varying vec2 vUv;

  void main() {
    vec4 sum = texture2D(tDiffuse, vUv) * 0.227027;
    sum += texture2D(tDiffuse, vUv + uStep * 1.3846) * 0.3162162;
    sum += texture2D(tDiffuse, vUv - uStep * 1.3846) * 0.3162162;
    sum += texture2D(tDiffuse, vUv + uStep * 3.2307) * 0.0702702;
    sum += texture2D(tDiffuse, vUv - uStep * 3.2307) * 0.0702702;
    gl_FragColor = sum;
  }
`;

const COMPOSITE_FRAGMENT = `
  uniform sampler2D tBase;
  uniform sampler2D tNear;
  uniform sampler2D tWide;
  uniform float uBloom;
  varying vec2 vUv;

  void main() {
    vec4 base = texture2D(tBase, vUv);
    vec4 glow = texture2D(tNear, vUv) * 0.85 + texture2D(tWide, vUv) * 1.15;
    vec4 col = base + glow * uBloom;
    gl_FragColor = vec4(col.rgb, clamp(col.a, 0.0, 1.0));
  }
`;

class BurstScene {
  constructor(container, cfg) {
    this.container = container;
    this.cfg = cfg;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000);
    this.group = new THREE.Group();
    this.hazeGeometry = new THREE.PlaneGeometry(1, 1);
    this.rtBase = null;
    this.rtHalfA = null;
    this.rtHalfB = null;
    this.rtQuarterA = null;
    this.rtQuarterB = null;
    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.Camera();
    this.quadGeometry = new THREE.PlaneGeometry(2, 2);
    this.time = 0;
    this.spinAngle = 0;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.frameId = 0;
    this.lastT = 0;
    this.disposed = false;

    const S = settingsFor(cfg);

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
    });
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    const el = this.renderer.domElement;
    el.style.position = "absolute";
    el.style.inset = "0";
    el.style.width = "100%";
    el.style.height = "100%";
    container.appendChild(el);

    this.material = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: S.speed },
        uRadius: { value: REACH },
        uSize: { value: S.size },
        uRim: { value: S.rim },
        uPixelRatio: { value: this.dpr },
        uColor: { value: new THREE.Color(cfg.color) },
        uHot: { value: new THREE.Color(cfg.hot) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });

    this.geometry = buildCloud(S.rays, S.perRay);
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.group.add(this.points);

    this.hazeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(cfg.color) },
        uHaze: { value: S.haze },
      },
      vertexShader: HAZE_VERTEX,
      fragmentShader: HAZE_FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    this.haze = new THREE.Mesh(this.hazeGeometry, this.hazeMaterial);
    this.scene.add(this.haze);
    this.scene.add(this.group);
    this.applyScales();

    this.blurMaterial = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERTEX,
      fragmentShader: BLUR_FRAGMENT,
      uniforms: {
        tDiffuse: { value: null },
        uStep: { value: new THREE.Vector2() },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.compositeMaterial = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERTEX,
      fragmentShader: COMPOSITE_FRAGMENT,
      uniforms: {
        tBase: { value: null },
        tNear: { value: null },
        tWide: { value: null },
        uBloom: { value: S.bloom },
      },
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });

    this.quad = new THREE.Mesh(this.quadGeometry, this.blurMaterial);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }

  applyScales() {
    this.haze.scale.setScalar(REACH * 2.6);
  }

  makeTargets(w, h) {
    this.disposeTargets();
    const type = this.renderer.capabilities.isWebGL2
      ? THREE.HalfFloatType
      : THREE.UnsignedByteType;
    const opts = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type,
      depthBuffer: false,
      stencilBuffer: false,
    };
    const half = (n) => Math.max(1, Math.floor(n / 2));
    const quarter = (n) => Math.max(1, Math.floor(n / 4));
    this.rtBase = new THREE.WebGLRenderTarget(w, h, opts);
    this.rtHalfA = new THREE.WebGLRenderTarget(half(w), half(h), opts);
    this.rtHalfB = new THREE.WebGLRenderTarget(half(w), half(h), opts);
    this.rtQuarterA = new THREE.WebGLRenderTarget(quarter(w), quarter(h), opts);
    this.rtQuarterB = new THREE.WebGLRenderTarget(quarter(w), quarter(h), opts);
  }

  disposeTargets() {
    for (const rt of [this.rtBase, this.rtHalfA, this.rtHalfB, this.rtQuarterA, this.rtQuarterB]) {
      rt?.dispose();
    }
    this.rtBase = null;
    this.rtHalfA = null;
    this.rtHalfB = null;
    this.rtQuarterA = null;
    this.rtQuarterB = null;
  }

  blurPass(source, target, dx, dy) {
    this.blurMaterial.uniforms.tDiffuse.value = source;
    this.blurMaterial.uniforms.uStep.value.set(dx / target.width, dy / target.height);
    this.quad.material = this.blurMaterial;
    this.renderer.setRenderTarget(target);
    this.renderer.clear();
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  start() {
    this.lastT = performance.now();
    const loop = () => {
      this.frameId = requestAnimationFrame(loop);
      this.step();
    };
    loop();
  }

  setSize(width, height) {
    if (this.disposed || width <= 0 || height <= 0) return;
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.makeTargets(
      Math.max(1, Math.floor(width * this.dpr)),
      Math.max(1, Math.floor(height * this.dpr))
    );
    this.updateCamera();
  }

  updateCamera() {
    const w = Math.max(1, this.width);
    const h = Math.max(1, this.height);
    const aspect = w / h;
    const distance = 1 / PERSPECTIVE;
    const sizePct = clamp(this.cfg.sizePercent, 20, 200, 90);
    const span = 7.4 * (100 / sizePct);
    const visibleHeight = aspect < 1 ? span / aspect : span;

    this.camera.aspect = aspect;
    this.camera.position.set(0, 0, distance);
    this.camera.lookAt(0, 0, 0);
    this.camera.fov = 2 * Math.atan(visibleHeight / 2 / distance) * (180 / Math.PI);
    this.camera.near = Math.max(0.1, distance - 20);
    this.camera.far = distance + 20;
    this.camera.updateProjectionMatrix();
  }

  step() {
    if (this.disposed) return;
    const now = performance.now();
    let dt = (now - this.lastT) / 1000;
    this.lastT = now;
    if (!isFinite(dt) || dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;

    const S = settingsFor(this.cfg);
    this.time += dt;
    this.spinAngle += S.spin * S.heading * dt;

    this.material.uniforms.uTime.value = this.time;
    this.group.rotation.y = this.spinAngle;
    this.group.rotation.x = Math.sin(this.spinAngle * 0.6) * 0.35;

    const base = this.rtBase;
    const hA = this.rtHalfA;
    const hB = this.rtHalfB;
    const qA = this.rtQuarterA;
    const qB = this.rtQuarterB;
    if (!base || !hA || !hB || !qA || !qB) {
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.renderer.setRenderTarget(base);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.blurPass(base.texture, hA, 1, 0);
    this.blurPass(hA.texture, hB, 0, 1);
    this.blurPass(hB.texture, qA, 1, 0);
    this.blurPass(qA.texture, qB, 0, 1);

    const c = this.compositeMaterial.uniforms;
    c.tBase.value = base.texture;
    c.tNear.value = hB.texture;
    c.tWide.value = qB.texture;
    this.quad.material = this.compositeMaterial;
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.geometry.dispose();
    this.material.dispose();
    this.hazeGeometry.dispose();
    this.hazeMaterial.dispose();
    this.quadGeometry.dispose();
    this.blurMaterial.dispose();
    this.compositeMaterial.dispose();
    this.disposeTargets();
    this.renderer.dispose();
    const el = this.renderer.domElement;
    if (el.parentNode === this.container) this.container.removeChild(el);
  }
}

(function init() {
  const container = document.querySelector("[data-particles]");
  if (!container) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let scene;
  try {
    scene = new BurstScene(container, CONFIG);
  } catch {
    return; // no WebGL — leave the light background as-is rather than error
  }

  scene.setSize(container.clientWidth, container.clientHeight);
  scene.start();

  const ro = new ResizeObserver(() => {
    scene.setSize(container.clientWidth, container.clientHeight);
  });
  ro.observe(container);
})();

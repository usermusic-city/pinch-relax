// 场景管理器 — Three.js 黏土风渲染核心
import * as THREE from 'three';

export const PALETTE = {
  cream: 0xF5EFE6, creamDeep: 0xEDE4D3,
  blue: 0x8FA8BF, pink: 0xD9A5A0, green: 0x9CAF9C, yellow: 0xD4B85C,
  ink: 0x4A443D, white: 0xFFFDF8, lilac: 0xB0A8C9, terra: 0xC98B7F
};

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.cream);
    this.scene.fog = new THREE.Fog(PALETTE.cream, 14, 30);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(0, 4.4, 7.2);
    this.camera.lookAt(0, 0.4, 0);

    // 黏土风光照：大柔环境光 + 一盏暖主光 + 弱阴影
    const hemi = new THREE.HemisphereLight(0xFFFBF2, 0xD8CFC0, 1.05);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xFFE8CF, 1.35);
    key.position.set(3.2, 6.5, 3.8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -8; key.shadow.camera.right = 8;
    key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
    key.shadow.radius = 6;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xC8D8E8, 0.35);
    fill.position.set(-4, 3, -2);
    this.scene.add(fill);

    // 地面
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(16, 48),
      new THREE.MeshStandardMaterial({ color: PALETTE.creamDeep, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.toysGroup = new THREE.Group();
    this.scene.add(this.toysGroup);

    this.clock = new THREE.Clock();
    this.updateFns = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.renderer.setAnimationLoop(() => this.tick());
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    for (const fn of this.updateFns) fn(dt, this.clock.elapsedTime);
    this.renderer.render(this.scene, this.camera);
  }

  onUpdate(fn) { this.updateFns.push(fn); }
  offUpdate(fn) { const i = this.updateFns.indexOf(fn); if (i >= 0) this.updateFns.splice(i, 1); }

  clearToys() {
    const kill = [];
    this.toysGroup.traverse(o => kill.push(o));
    kill.forEach(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      }
    });
    this.toysGroup.clear();
  }
}

// 黏土材质工厂：哑光 + 微颗粒
export function clayMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.92,
    metalness: 0,
    flatShading: opts.flat ?? false,
    ...opts.extra
  });
}

// 圆润盒子几何（倒角）
export function roundedBox(w, h, d, r = 0.06, seg = 3) {
  // 简化圆角：用略多的分段球化处理太贵，直接标准盒子+高段球角
  const geo = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  const pos = geo.attributes.position;
  const hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const cx = Math.max(-hw, Math.min(hw, x));
    const cy = Math.max(-hh, Math.min(hh, y));
    const cz = Math.max(-hd, Math.min(hd, z));
    const dx = x - cx, dy = y - cy, dz = z - cz;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len > r) {
      const s = r / len;
      pos.setXYZ(i, cx + dx * s, cy + dy * s, cz + dz * s);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

// 缓动函数库
export const Ease = {
  backOut: t => { const c = 1.70158; const t1 = t - 1; return 1 + (c + 1) * t1 * t1 * t1 + c * t1 * t1; },
  elasticOut: t => {
    if (t === 0 || t === 1) return t;
    const c = (2 * Math.PI) / 0.42;
    return Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * c) + 1;
  },
  cubicOut: t => 1 - Math.pow(1 - t, 3),
  cubicInOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  quadOut: t => 1 - (1 - t) * (1 - t)
};

// 简易补间系统
export function tween({ from = 0, to = 1, dur = 0.3, ease = Ease.cubicOut, onUpdate, onDone }) {
  let t = 0, alive = true;
  return {
    update(dt) {
      if (!alive) return;
      t += dt / dur;
      const k = t >= 1 ? 1 : ease(Math.max(0, t));
      onUpdate(from + (to - from) * k);
      if (t >= 1) { alive = false; onDone && onDone(); }
    },
    cancel() { alive = false; }
  };
}

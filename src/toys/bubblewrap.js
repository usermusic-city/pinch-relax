// 泡泡纸 — 点击按破，顶点下陷+变色，全部破完自动换新
import * as THREE from 'three';
import { ToyBase } from '../core/toyBase.js';
import { clayMat, PALETTE, Ease, roundedBox } from '../core/scene.js';
import { audio } from '../core/audio.js';
import { haptic } from '../core/haptic.js';

const COLS = 6, ROWS = 8;

export class BubbleWrap extends ToyBase {
  constructor() {
    super('bubblewrap', '泡泡纸', '戳破所有泡泡', '🫧', PALETTE.blue);
    this.bubbles = [];
    this.popped = 0;
  }

  build(sm) {
    // 底板
    const board = new THREE.Mesh(
      roundedBox(4.6, 0.3, 6.2, 0.12),
      clayMat(PALETTE.creamDeep)
    );
    board.position.y = 0.15;
    board.receiveShadow = true;
    board.castShadow = true;
    this.group.add(board);

    // 泡泡阵列
    const geo = new THREE.SphereGeometry(0.26, 18, 14);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const mat = clayMat(0xFDF9F0, { roughness: 0.55 });
        const b = new THREE.Mesh(geo, mat);
        b.position.set((c - (COLS - 1) / 2) * 0.72, 0.34, (r - (ROWS - 1) / 2) * 0.75);
        b.scale.y = 0.62;
        b.castShadow = true;
        b.userData = { popped: false, baseY: b.position.y, baseColor: 0xFDF9F0 };
        this.group.add(b);
        this.bubbles.push(b);
      }
    }
    sm.toysGroup.add(this.group);
    return this.bubbles.concat([board]);
  }

  popBubble(b, sm) {
    b.userData.popped = true;
    this.popped++;
    // 视觉：下陷 + 变色（Back.Out 80ms）
    const mat = b.material;
    const y0 = b.userData.baseY, y1 = 0.22;
    const c0 = new THREE.Color(0xFDF9F0), c1 = new THREE.Color(PALETTE.blue);
    const tw = makeTween(0, 1, 0.09, Ease.backOut, k => {
      b.position.y = y0 + (y1 - y0) * k;
      mat.color.copy(c0).lerp(c1, k);
      b.scale.y = 0.62 - 0.35 * k;
    });
    this.addTween(tw);
    // 音效：随机变体（内置3种滤波变体）
    audio.pop();
    // 震动：延迟一帧更自然
    setTimeout(() => haptic.light(), 16);
    // 全破完 → 换新
    if (this.popped >= this.bubbles.length) {
      this.emit('popAll');
      setTimeout(() => this.resetAll(), 900);
    }
  }

  resetAll() {
    this.popped = 0;
    this.bubbles.forEach(b => {
      b.userData.popped = false;
      const mat = b.material;
      const y1 = b.position.y, y0 = b.userData.baseY;
      const c1 = mat.color.clone(), c0 = new THREE.Color(0xFDF9F0);
      const tw = makeTween(0, 1, 0.5, Ease.elasticOut, k => {
        b.position.y = y1 + (y0 - y1) * k;
        mat.color.copy(c1).lerp(c0, k);
        b.scale.y = 0.27 + 0.35 * k;
      });
      this.addTween(tw);
    });
    audio.swoosh();
  }

  onDown(hit, sm) {
    if (!hit) return;
    const b = hit.object;
    if (b.userData && b.userData.popped !== undefined && !b.userData.popped) {
      this.popBubble(b, sm);
    }
  }
}

// 内联补间（避免循环依赖 tween）
function makeTween(from, to, dur, ease, onUpdate) {
  let t = 0, done = false;
  return {
    update(dt) {
      if (done) return;
      t += dt / dur;
      onUpdate(from + (to - from) * ease(Math.min(1, Math.max(0, t))));
      if (t >= 1) done = true;
    },
    isDone() { return done; }
  };
}

// 弹簧 — 拖拽拉伸松手回弹，弹性震荡 + 金属余音
import * as THREE from 'three';
import { ToyBase } from '../core/toyBase.js';
import { clayMat, PALETTE, Ease, roundedBox } from '../core/scene.js';
import { audio } from '../core/audio.js';
import { haptic } from '../core/haptic.js';

const COILS = 7;
const BASE_H = 1.6;

export class SpringToy extends ToyBase {
  constructor() {
    super('spring', '弹簧', '拉长松手，duang~', '🪀', PALETTE.yellow);
    this.dragging = false;
    this.pull = 0;        // 0~1.4
    this.vel = 0;
    this.springs = [];
  }

  build(sm) {
    // 底盘
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.1, 0.35, 26),
      clayMat(PALETTE.creamDeep)
    );
    base.position.y = 0.18;
    base.receiveShadow = true;
    this.group.add(base);

    // 弹簧圈（堆叠圆环）
    const ringGeo = new THREE.TorusGeometry(0.62, 0.14, 12, 26);
    for (let i = 0; i < COILS; i++) {
      const ring = new THREE.Mesh(ringGeo, clayMat(PALETTE.yellow, { roughness: 0.55 }));
      ring.rotation.x = Math.PI / 2;
      ring.castShadow = true;
      this.group.add(ring);
      this.springs.push(ring);
    }
    // 顶帽
    this.cap = new THREE.Mesh(
      roundedBox(1.15, 0.45, 1.15, 0.16),
      clayMat(PALETTE.terra, { roughness: 0.7 })
    );
    this.cap.castShadow = true;
    this.cap.userData.isCap = true;
    this.group.add(this.cap);

    this.layout();
    sm.toysGroup.add(this.group);
    return [base, this.cap, ...this.springs];
  }

  layout() {
    const h = BASE_H + this.pull * 2.2;
    for (let i = 0; i < COILS; i++) {
      const t = i / (COILS - 1);
      this.springs[i].position.y = 0.36 + t * (h - 0.36);
      // 拉伸时半径收窄
      const r = 0.62 - this.pull * 0.16 * Math.sin(t * Math.PI);
      this.springs[i].scale.setScalar(r / 0.62);
    }
    this.cap.position.y = h + 0.28;
  }

  onTick(dt, t, sm) {
    if (!this.dragging) {
      // 震荡物理：弹簧-阻尼
      const k = 46, damp = 3.4;
      this.vel += (-k * this.pull - damp * this.vel) * dt;
      this.pull += this.vel * dt;
      this.layout();
    }
  }

  onDown(hit, sm) {
    if (!hit) return;
    this.dragging = true;
    this.startY = hit.point.y;
    this.startPull = this.pull;
  }

  onMove(hit, sm) {
    if (!this.dragging || !hit) return;
    const dy = hit.point.y - this.startY;
    this.pull = Math.max(0, Math.min(1.4, this.startPull + dy / 2.2));
    if (this.pull >= 1.35) this.emit('springMax');
    this.layout();
    // 拉伸音（间隔）
    if (Math.random() < 0.12) audio.stretch(this.pull * 0.5);
  }

  onUp(hit, sm) {
    if (!this.dragging) return;
    this.dragging = false;
    // 弹！金属余音
    if (this.pull > 0.15) {
      audio.boing(Math.min(1, this.pull));
      haptic.medium();
      // 震荡中的周期震动
      let n = 0;
      const iv = setInterval(() => {
        haptic.light();
        if (++n > 4) clearInterval(iv);
      }, 180);
    }
  }
}

// 拉链 — 上下拖动拉头，齿合摩擦音 + 阻力曲线 + 齿开合动画
import * as THREE from 'three';
import { ToyBase } from '../core/toyBase.js';
import { clayMat, PALETTE, Ease, roundedBox } from '../core/scene.js';
import { audio } from '../core/audio.js';
import { haptic } from '../core/haptic.js';

const TRACK = 4.4; // 拉链长度

export class Zipper extends ToyBase {
  constructor() {
    super('zipper', '拉链', '上下拉动拉链头', '🧥', PALETTE.terra);
    this.pos = 0;      // 0~1
    this.dragging = false;
    this.teethL = [];
    this.teethR = [];
  }

  build(sm) {
    // 布料底
    const cloth = new THREE.Mesh(
      roundedBox(3.4, 0.22, TRACK + 0.8, 0.1),
      clayMat(PALETTE.blue)
    );
    cloth.position.y = 0.11;
    cloth.receiveShadow = true;
    cloth.castShadow = true;
    this.group.add(cloth);

    // 齿列
    const toothGeo = roundedBox(0.3, 0.26, 0.24, 0.06);
    const n = 14;
    for (let i = 0; i < n; i++) {
      const z = (i / (n - 1) - 0.5) * TRACK;
      // 左齿
      const tl = new THREE.Mesh(toothGeo, clayMat(0xFFFDF8, { roughness: 0.5 }));
      tl.position.set(-0.19, 0.3, z);
      tl.castShadow = true;
      this.group.add(tl);
      this.teethL.push(tl);
      // 右齿
      const tr = new THREE.Mesh(toothGeo, clayMat(0xFFFDF8, { roughness: 0.5 }));
      tr.position.set(0.19, 0.3, z);
      tr.castShadow = true;
      this.group.add(tr);
      this.teethR.push(tr);
    }

    // 拉头
    this.slider = new THREE.Group();
    const body = new THREE.Mesh(
      roundedBox(0.85, 0.55, 0.6, 0.16),
      clayMat(PALETTE.terra, { roughness: 0.6 })
    );
    body.castShadow = true;
    this.slider.add(body);
    const pullTab = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.075, 12, 22),
      clayMat(0xE8C97A, { roughness: 0.5 })
    );
    pullTab.position.set(0, 0.15, 0.48);
    pullTab.rotation.x = Math.PI / 2.4;
    this.slider.add(pullTab);
    this.slider.position.set(0, 0.55, -TRACK / 2);
    this.group.add(this.slider);

    sm.toysGroup.add(this.group);
    return [cloth, this.slider, ...this.teethL, ...this.teethR];
  }

  onTick(dt, t, sm) {
    // 拉头位置
    const z = -TRACK / 2 + this.pos * TRACK;
    this.slider.position.z = z;
    // 齿开合：拉头以下闭合（靠拢），以上张开
    for (let i = 0; i < this.teethL.length; i++) {
      const tz = this.teethL[i].position.z;
      const below = tz < z - 0.05;
      const targetX = below ? 0.08 : 0.19;
      const cur = this.teethL[i].position.x;
      this.teethL[i].position.x += (targetX - cur) * Math.min(1, dt * 8);
      this.teethR[i].position.x += (-targetX - this.teethR[i].position.x) * Math.min(1, dt * 8);
    }
  }

  onDown(hit, sm) {
    if (!hit) return;
    this.dragging = true;
    this.lastZ = hit.point.z;
  }

  onMove(hit, sm) {
    if (!this.dragging || !hit) return;
    const dz = hit.point.z - this.lastZ;
    // 阻力曲线：中间快、两端慢
    const np = Math.max(0, Math.min(1, this.pos + dz / TRACK));
    if (Math.abs(np - this.pos) > 0.004) {
      this.pos = np;
      // 齿合摩擦音（随机变体内置）
      audio.zip();
      if (Math.random() < 0.4) haptic.light();
    }
    this.lastZ = hit.point.z;
  }

  onUp(hit, sm) {
    this.dragging = false;
    // 到端点时咔哒
    if (this.pos > 0.985 || this.pos < 0.015) {
      audio.click(false);
      haptic.medium();
      if (this.pos < 0.015) this.emit('zipEnd');
    }
  }
}

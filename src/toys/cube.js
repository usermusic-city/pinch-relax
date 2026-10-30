// 解压魔方 — 拨盘段落感，每30°咔哒 + 段落音 + 震动
import * as THREE from 'three';
import { ToyBase } from '../core/toyBase.js';
import { clayMat, PALETTE, Ease, roundedBox } from '../core/scene.js';
import { audio } from '../core/audio.js';
import { haptic } from '../core/haptic.js';

const SEG = Math.PI / 6; // 30° 段落

export class FidgetCube extends ToyBase {
  constructor() {
    super('cube', '解压魔方', '拨动转盘，听咔哒声', '🎲', PALETTE.yellow);
    this.angle = 0;
    this.vel = 0;
    this.lastSeg = 0;
    this.dragging = false;
  }

  build(sm) {
    // 底座
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(2.15, 2.35, 0.35, 36),
      clayMat(PALETTE.creamDeep)
    );
    base.position.y = 0.18;
    base.receiveShadow = true;
    this.group.add(base);

    // 转盘
    this.disk = new THREE.Group();
    const diskBody = new THREE.Mesh(
      new THREE.CylinderGeometry(1.95, 1.95, 0.5, 36),
      clayMat(PALETTE.yellow)
    );
    diskBody.position.y = 0.6;
    diskBody.castShadow = true;
    diskBody.userData.isDisk = true;
    this.disk.add(diskBody);

    // 表面小方块装饰（魔方格）
    const cellGeo = roundedBox(0.52, 0.2, 0.52, 0.05);
    const cellColors = [PALETTE.blue, PALETTE.pink, PALETTE.green, PALETTE.terra, PALETTE.lilac, PALETTE.cream];
    let ci = 0;
    for (let ring = 0; ring < 2; ring++) {
      const n = ring === 0 ? 6 : 12;
      const rad = ring === 0 ? 0.95 : 1.55;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ring * 0.26;
        const cell = new THREE.Mesh(cellGeo, clayMat(cellColors[ci++ % cellColors.length]));
        cell.position.set(Math.cos(a) * rad, 0.9, Math.sin(a) * rad);
        cell.rotation.y = -a;
        cell.castShadow = true;
        cell.userData.isDisk = true;
        this.disk.add(cell);
      }
    }
    // 中心旋钮
    const knob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.55, 0.42, 24),
      clayMat(0xFFFDF8, { roughness: 0.6 })
    );
    knob.position.y = 1.0;
    knob.castShadow = true;
    knob.userData.isDisk = true;
    this.disk.add(knob);

    // 指针标记（底座上的固定点）
    const mark = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.34, 12),
      clayMat(PALETTE.ink)
    );
    mark.position.set(0, 0.42, 2.05);
    mark.rotation.x = Math.PI;
    this.group.add(mark);

    this.group.add(this.disk);
    sm.toysGroup.add(this.group);
    return [base, this.disk, mark];
  }

  onTick(dt, t, sm) {
    if (!this.dragging) {
      // 段落吸附：向最近段落缓动
      const target = Math.round(this.angle / SEG) * SEG;
      const diff = target - this.angle;
      this.angle += diff * Math.min(1, dt * 10);
      this.disk.rotation.y = this.angle;
    }
  }

  segCheck() {
    const seg = Math.round(this.angle / SEG);
    if (seg !== this.lastSeg) {
      this.lastSeg = seg;
      // 咔哒段落音（硬）
      audio.click(true);
      haptic.medium();
    }
    // 累计转过360°
    this.totalTurn = (this.totalTurn || 0) + Math.abs(seg - (this._prevSeg ?? seg));
    this._prevSeg = seg;
    if (this.totalTurn >= 12) this.emit('cubeRound');
  }

  onDown(hit, sm) {
    if (!hit) return;
    this.dragging = true;
    this.lastA = Math.atan2(hit.point.z - this.group.position.z, hit.point.x - this.group.position.x);
  }

  onMove(hit, sm) {
    if (!this.dragging || !hit) return;
    const a = Math.atan2(hit.point.z - this.group.position.z, hit.point.x - this.group.position.x);
    let da = a - this.lastA;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    this.angle += da;
    this.disk.rotation.y = this.angle;
    this.lastA = a;
    this.segCheck();
  }

  onUp(hit, sm) {
    this.dragging = false;
    this.segCheck();
  }
}

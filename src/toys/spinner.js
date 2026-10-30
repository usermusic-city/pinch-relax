// 指尖陀螺 — 滑动旋转，惯性减速 + 轴承嗡鸣 + 微震
import * as THREE from 'three';
import { ToyBase } from '../core/toyBase.js';
import { clayMat, PALETTE, Ease, roundedBox } from '../core/scene.js';
import { audio } from '../core/audio.js';
import { haptic } from '../core/haptic.js';

export class Spinner extends ToyBase {
  constructor() {
    super('spinner', '指尖陀螺', '快速滑动让它转起来', '🌀', PALETTE.green);
    this.angVel = 0;
    this.angle = 0;
    this.humCtl = null;
    this.lastTickAt = 0;
  }

  build(sm) {
    // 轴承座
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.7, 0.3, 24),
      clayMat(PALETTE.creamDeep)
    );
    base.position.y = 0.15;
    base.receiveShadow = true;
    this.group.add(base);

    this.rotor = new THREE.Group();
    // 三叶陀螺
    const colors = [PALETTE.green, PALETTE.blue, PALETTE.yellow];
    for (let i = 0; i < 3; i++) {
      const lobe = new THREE.Mesh(
        roundedBox(1.7, 0.22, 0.62, 0.1),
        clayMat(colors[i])
      );
      const a = (i / 3) * Math.PI * 2;
      lobe.position.set(Math.cos(a) * 1.15, 0.42, Math.sin(a) * 1.15);
      lobe.rotation.y = -a;
      lobe.castShadow = true;
      this.rotor.add(lobe);
      // 端部圆珠
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 18, 14),
        clayMat(colors[i], { roughness: 0.7 })
      );
      ball.position.set(Math.cos(a) * 2.0, 0.42, Math.sin(a) * 2.0);
      ball.castShadow = true;
      this.rotor.add(ball);
    }
    // 中心盖
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.34, 24),
      clayMat(0xFFFDF8, { roughness: 0.6 })
    );
    cap.position.y = 0.42;
    cap.castShadow = true;
    this.rotor.add(cap);
    const capDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 14, 10),
      clayMat(PALETTE.ink, { roughness: 0.5 })
    );
    capDot.position.y = 0.66;
    this.rotor.add(capDot);

    this.group.add(this.rotor);
    sm.toysGroup.add(this.group);
    return [base, this.rotor];
  }

  onTick(dt, t, sm) {
    // 惯性减速（摩擦 + 轻微空气阻力）
    this.angVel *= Math.pow(0.35, dt);
    this.angle += this.angVel * dt;
    this.rotor.rotation.y = this.angle;

    // 嗡鸣音调随转速
    const speed = Math.abs(this.angVel);
    if (speed > 0.8) {
      if (!this.humCtl) this.humCtl = audio.hum();
      this.humCtl.set(90 + speed * 26, Math.min(0.14, speed * 0.02));
      // 转速过阈值时周期微震
      if (speed > 5 && t - this.lastTickAt > 0.22) {
        this.lastTickAt = t;
        haptic.light();
      }
    } else if (this.humCtl) {
      this.humCtl.stop();
      this.humCtl = null;
    }
  }

  onDown(hit, sm) {
    // 记录起始角度
    this.startAngle = Math.atan2(
      (hit ? hit.point : new THREE.Vector3()).z - this.group.position.z,
      (hit ? hit.point : new THREE.Vector3()).x - this.group.position.x
    );
    this.startT = performance.now();
    this.lastAngle = this.startAngle;
    this.lastT = this.startT;
  }

  onMove(hit, sm) {
    if (!hit) return;
    const a = Math.atan2(hit.point.z - this.group.position.z, hit.point.x - this.group.position.x);
    const now = performance.now();
    const dt = Math.max(1, now - this.lastT) / 1000;
    let da = a - this.lastAngle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    // 直接跟手
    this.angle += da;
    this.rotor.rotation.y = this.angle;
    this.angVel = da / dt;
    this.lastAngle = a;
    this.lastT = now;
  }

  onUp(hit, sm) {
    // 甩出去的角速度保留（限幅）
    this.angVel = Math.max(-40, Math.min(40, this.angVel));
    if (Math.abs(this.angVel) > 3) haptic.medium();
    if (Math.abs(this.angVel) > 25) this.emit('spinFast');
  }

  onExit() {
    if (this.humCtl) { this.humCtl.stop(); this.humCtl = null; }
  }
}

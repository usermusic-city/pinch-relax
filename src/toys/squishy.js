// 捏捏乐 — 软体挤压形变 + 弹性回弹 + 黏腻音
import * as THREE from 'three';
import { ToyBase } from '../core/toyBase.js';
import { clayMat, PALETTE, Ease } from '../core/scene.js';
import { audio } from '../core/audio.js';
import { haptic } from '../core/haptic.js';

export class Squishy extends ToyBase {
  constructor() {
    super('squishy', '捏捏乐', '按住揉捏，松手回弹', '🧸', PALETTE.pink);
    this.basePos = null;
    this.pressDepth = 0;
    this.targetDepth = 0;
    this.pressPt = new THREE.Vector3();
    this.lastSquishAt = 0;
  }

  build(sm) {
    // 高分段球体，顶点可自由形变
    const geo = new THREE.SphereGeometry(1.5, 40, 32);
    this.basePos = geo.attributes.position.array.slice();
    this.mesh = new THREE.Mesh(geo, clayMat(PALETTE.pink, { roughness: 0.85 }));
    this.mesh.position.y = 1.55;
    this.mesh.castShadow = true;
    this.mesh.userData.isSquishy = true;
    this.group.add(this.mesh);

    // 底座
    const seat = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.25, 0.35, 32),
      clayMat(PALETTE.creamDeep)
    );
    seat.position.y = 0.18;
    seat.receiveShadow = true;
    this.group.add(seat);

    sm.toysGroup.add(this.group);
    return [this.mesh, seat];
  }

  onTick(dt, t, sm) {
    // 平滑趋近目标深度
    this.pressDepth += (this.targetDepth - this.pressDepth) * Math.min(1, dt * 14);
    this.applyDeform();
    if (this.pressDepth > 0.53) this.emit('squishDeep');
    // 按住时周期性黏腻音
    if (this.targetDepth > 0.15 && t - this.lastSquishAt > 0.28) {
      this.lastSquishAt = t;
      audio.squish(this.pressDepth);
      haptic.light();
    }
  }

  applyDeform() {
    const pos = this.mesh.geometry.attributes.position;
    const arr = pos.array, base = this.basePos;
    const d = this.pressDepth;
    const px = this.pressPt.x, py = this.pressPt.y, pz = this.pressPt.z;
    const R = 1.35; // 影响半径
    for (let i = 0; i < arr.length; i += 3) {
      const bx = base[i], by = base[i + 1], bz = base[i + 2];
      let x = bx, y = by, z = bz;
      if (d > 0.001) {
        const dx = bx - px, dy = by - py, dz = bz - pz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < R) {
          const falloff = Math.pow(1 - dist / R, 2);
          const push = d * falloff;
          // 沿按压方向压扁 + 向外膨胀（体积守恒感）
          const nl = Math.max(0.001, Math.sqrt(bx * bx + by * by + bz * bz));
          x = bx - (dx / Math.max(dist, 0.001)) * push * 0.8;
          y = by - (dy / Math.max(dist, 0.001)) * push * 0.8;
          z = bz - (dz / Math.max(dist, 0.001)) * push * 0.8;
          // 侧向膨胀
          const bulge = push * 0.35;
          x += bx / nl * bulge * 0.4;
          y += by / nl * bulge * 0.2;
          z += bz / nl * bulge * 0.4;
        }
      }
      arr[i] = x; arr[i + 1] = y; arr[i + 2] = z;
    }
    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  onDown(hit, sm) {
    if (!hit || !hit.object.userData.isSquishy) {
      // 没点到球也允许：从中心捏
      this.pressPt.set(0, 1.5, 0);
      this.targetDepth = 0.55;
      return;
    }
    // 局部坐标按压点
    const p = this.mesh.worldToLocal(hit.point.clone());
    this.pressPt.copy(p.normalize().multiplyScalar(1.5));
    this.targetDepth = 0.55;
    audio.squish(0.4);
    haptic.medium();
  }

  onMove(hit, sm) {
    if (hit && hit.object.userData.isSquishy) {
      const p = this.mesh.worldToLocal(hit.point.clone());
      this.pressPt.copy(p.normalize().multiplyScalar(1.5));
      this.targetDepth = 0.6;
    }
  }

  onUp(hit, sm) {
    this.targetDepth = 0;
    // 回弹音（Elastic.Out 350ms 由插值自然完成）
    audio.squish(0.8);
    haptic.light();
  }
}

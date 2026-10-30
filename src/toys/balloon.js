// 气球 — 拖拽拉伸，张力音调升高，松手回弹，拉过头会爆
import * as THREE from 'three';
import { ToyBase } from '../core/toyBase.js';
import { clayMat, PALETTE, Ease } from '../core/scene.js';
import { audio } from '../core/audio.js';
import { haptic } from '../core/haptic.js';

export class Balloon extends ToyBase {
  constructor() {
    super('balloon', '气球', '捏住拉扯，小心爆掉', '🎈', PALETTE.pink);
    this.dragging = false;
    this.stretch = 0;       // 0~1 张力
    this.lastStretchSound = 0;
    this.popped = false;
  }

  build(sm) {
    // 气球主体
    this.body = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 28, 24),
      clayMat(PALETTE.pink, { roughness: 0.45 })
    );
    this.body.position.y = 1.8;
    this.body.scale.set(1, 1.18, 1);
    this.body.castShadow = true;
    this.body.userData.isBalloon = true;
    this.group.add(this.body);

    // 气球结
    const knot = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.22, 10),
      clayMat(PALETTE.pink, { roughness: 0.5 })
    );
    knot.position.y = 0.55;
    knot.rotation.x = Math.PI;
    this.body.add(knot);

    // 线绳
    this.stringPts = [];
    this.string = new THREE.Mesh(
      new THREE.TubeGeometry(this.makeStringCurve(), 12, 0.028, 6),
      clayMat(0xFFFDF8, { roughness: 0.8 })
    );
    this.string.position.y = 0.62;
    this.body.add(this.string);

    // 底座小台
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.45, 0.28, 28),
      clayMat(PALETTE.creamDeep)
    );
    pad.position.y = 0.14;
    pad.receiveShadow = true;
    this.group.add(pad);

    sm.toysGroup.add(this.group);
    return [this.body, pad];
  }

  makeStringCurve() {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.1, -0.5, 0.08),
      new THREE.Vector3(-0.08, -1.0, -0.05)
    ]);
  }

  onTick(dt, t, sm) {
    // 形变：拉伸时变长变瘦
    const s = this.stretch;
    const targetSX = 1 - s * 0.45;
    const targetSY = 1 + s * 0.85;
    const targetSZ = 1 - s * 0.45;
    this.body.scale.x += (targetSX - this.body.scale.x) * Math.min(1, dt * 12);
    this.body.scale.y += ((1.18 * targetSY) - this.body.scale.y) * Math.min(1, dt * 12);
    this.body.scale.z += (targetSZ - this.body.scale.z) * Math.min(1, dt * 12);
    // 高张力时颤抖
    if (s > 0.7 && !this.popped) {
      this.body.position.x = Math.sin(t * 40) * 0.02 * s;
    } else {
      this.body.position.x = 0;
    }
  }

  pop(sm) {
    this.popped = true;
    this.emit('balloonBurst');
    audio.burst();
    haptic.heavy();
    // 碎片粒子（用小球体飞散）
    this.spawnShards();
    // 气球消失
    const tw = this.makeTw(1, 0, 0.14, Ease.cubicOut, k => {
      this.body.scale.setScalar(Math.max(0.001, k));
      this.body.rotation.z = (1 - k) * 0.8;
    }, () => {
      setTimeout(() => this.respawn(), 700);
    });
    this.addTween(tw);
  }

  spawnShards() {
    const n = 14;
    this.shards = [];
    const geo = new THREE.SphereGeometry(0.09, 8, 6);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, clayMat(PALETTE.pink, { roughness: 0.5 }));
      m.position.copy(this.body.position);
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 7,
        Math.random() * 6 + 1,
        (Math.random() - 0.5) * 7
      );
      this.group.add(m);
      this.shards.push({ m, v, life: 0 });
    }
    const tickFn = (dt) => {
      for (const s of this.shards) {
        s.life += dt;
        s.v.y -= 14 * dt;
        s.m.position.addScaledVector(s.v, dt);
        s.m.scale.setScalar(Math.max(0.001, 1 - s.life * 1.8));
      }
      this.shards = this.shards.filter(s => s.life < 0.6);
      if (!this.shards.length && this._shardTick) {
        sm.offUpdate(this._shardTick);
        this.shards.forEach(s => this.group.remove(s.m));
        this._shardTick = null;
      }
    };
    this._shardTick = tickFn;
    sm.onUpdate(tickFn);
  }

  respawn() {
    this.popped = false;
    this.stretch = 0;
    this.body.visible = true;
    this.body.rotation.z = 0;
    const tw = this.makeTw(0, 1, 0.45, Ease.elasticOut, k => {
      this.body.scale.set(k, 1.18 * k, k);
    });
    this.addTween(tw);
    audio.swoosh();
  }

  makeTw(from, to, dur, ease, fn, done) {
    let t = 0, isDone = false;
    return {
      update(dt) {
        if (isDone) return;
        t += dt / dur;
        fn(from + (to - from) * ease(Math.max(0, Math.min(1, t))));
        if (t >= 1) { isDone = true; done && done(); }
      },
      isDone() { return isDone; }
    };
  }

  onDown(hit, sm) {
    if (!hit || this.popped) return;
    this.dragging = true;
  }

  onMove(hit, sm) {
    if (!this.dragging || !hit || this.popped) return;
    // 拉得离中心越远张力越大
    const d = Math.hypot(hit.point.x - this.group.position.x, hit.point.y - 1.8);
    const prev = this.stretch;
    this.stretch = Math.max(0, Math.min(1, (d - 0.9) / 2.2));
    // 张力音调升高（间隔播放）
    if (this.stretch > prev + 0.06) {
      audio.stretch(this.stretch);
      haptic.light();
    }
    // 爆！
    if (this.stretch >= 0.99) {
      this.dragging = false;
      this.pop(sm);
    }
  }

  onUp(hit, sm) {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.popped) return;
    // 弹性回弹（Elastic.Out 由插值完成）
    const s0 = this.stretch;
    this.stretch = 0;
    if (s0 > 0.2) {
      audio.stretch(0.3);
      haptic.light();
    }
  }
}

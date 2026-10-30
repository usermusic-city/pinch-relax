// 玩具基类 + 输入拾取系统
import * as THREE from 'three';

export class ToyBase {
  constructor(id, name, desc, icon, color) {
    this.id = id; this.name = name; this.desc = desc;
    this.icon = icon; this.color = color;
    this.group = new THREE.Group();
    this.tweens = [];
    this.sessionMs = 0;
  }

  // 子类实现
  build(sm) {}
  onDown(hit, sm) {}
  onMove(hit, sm) {}
  onUp(hit, sm) {}
  onTick(dt, t, sm) {}
  onExit() {}

  // 事件上报（解锁收集册用）
  emit(event) {
    if (this.onEvent) this.onEvent(event);
  }

  // 补间注册（自动跟随场景tick）
  addTween(tw) { this.tweens.push(tw); return tw; }

  tick(dt, t, sm) {
    this.sessionMs += dt * 1000;
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.update(dt);
      if (tw.isDone()) this.tweens.splice(i, 1);
    }
    this.onTick(dt, t, sm);
  }

  dispose(sm) {
    this.tweens.length = 0;
    this.onExit();
  }
}

// 指针管理：统一 pointer 事件 → raycast → 玩具分发
export class InputRouter {
  constructor(sm) {
    this.sm = sm;
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.toy = null;
    this.targets = [];
    this.down = false;
    this.lastHit = null;

    const cv = sm.renderer.domElement;
    cv.addEventListener('pointerdown', e => this.handle(e, 'down'));
    cv.addEventListener('pointermove', e => this.handle(e, 'move'));
    cv.addEventListener('pointerup', e => this.handle(e, 'up'));
    cv.addEventListener('pointercancel', e => this.handle(e, 'up'));
  }

  setToy(toy, targets) {
    this.toy = toy;
    this.targets = targets || [];
  }

  clear() {
    if (this.toy && this.down) this.toy.onUp(this.lastHit, this.sm);
    this.toy = null; this.targets = []; this.down = false;
  }

  cast(e) {
    const r = this.sm.renderer.domElement.getBoundingClientRect();
    this.ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    this.raycaster.setFromCamera(this.ndc, this.sm.camera);
    const hits = this.raycaster.intersectObjects(this.targets, true);
    return hits.length ? hits[0] : null;
  }

  handle(e, phase) {
    if (!this.toy) return;
    const hit = this.cast(e);
    if (phase === 'down') {
      this.down = true;
      this.lastHit = hit;
      this.toy.onDown(hit, this.sm, e);
    } else if (phase === 'move') {
      if (!this.down) return;
      this.lastHit = hit;
      this.toy.onMove(hit, this.sm, e);
    } else {
      this.down = false;
      this.toy.onUp(this.lastHit, this.sm, e);
    }
  }
}

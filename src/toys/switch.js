// 按钮开关 — 按压段落行程 + 清脆咔声 + 强震，长条开关阵列
import * as THREE from 'three';
import { ToyBase } from '../core/toyBase.js';
import { clayMat, PALETTE, Ease, roundedBox } from '../core/scene.js';
import { audio } from '../core/audio.js';
import { haptic } from '../core/haptic.js';

const N = 5;

export class ToggleSwitch extends ToyBase {
  constructor() {
    super('switch', '按钮开关', '啪嗒啪嗒，拨动开关', '🔘', PALETTE.lilac);
    this.switches = [];
  }

  build(sm) {
    // 面板
    const panel = new THREE.Mesh(
      roundedBox(4.2, 0.5, 2.6, 0.14),
      clayMat(PALETTE.creamDeep)
    );
    panel.position.y = 0.25;
    panel.receiveShadow = true;
    panel.castShadow = true;
    this.group.add(panel);

    const colors = [PALETTE.lilac, PALETTE.blue, PALETTE.pink, PALETTE.green, PALETTE.yellow];
    for (let i = 0; i < N; i++) {
      const sw = new THREE.Group();
      // 轨道槽
      const slot = new THREE.Mesh(
        roundedBox(1.15, 0.24, 0.62, 0.08),
        clayMat(0xE0D6C4)
      );
      slot.position.y = 0.52;
      slot.userData.isSlot = true;
      slot.userData.idx = i;
      sw.add(slot);
      // 滑块（拨钮）
      const knob = new THREE.Mesh(
        roundedBox(0.52, 0.5, 0.52, 0.14),
        clayMat(colors[i], { roughness: 0.75 })
      );
      knob.castShadow = true;
      knob.userData.isSlot = true;
      knob.userData.idx = i;
      sw.add(knob);
      sw.position.set((i - (N - 1) / 2) * 0.85, 0, 0);
      this.group.add(sw);
      this.switches.push({ group: sw, knob, on: false, anim: 0 });
      this.placeKnob(this.switches[i], false, true);
    }
    sm.toysGroup.add(this.group);
    const targets = [panel];
    this.switches.forEach(s => targets.push(s.knob, s.group.children[0]));
    return targets;
  }

  placeKnob(s, on, instant) {
    const x = on ? 0.32 : -0.32;
    if (instant) {
      s.knob.position.set(x, 0.78, 0);
      s.anim = on ? 1 : 0;
      return;
    }
    // 段落行程：快滑 + 末端顿挫（Back.Out）
    const x0 = s.knob.position.x;
    const tw = this.makeTw(0, 1, 0.12, Ease.backOut, k => {
      s.knob.position.x = x0 + (x - x0) * k;
      s.anim = k;
    });
    this.addTween(tw);
  }

  makeTw(from, to, dur, ease, fn) {
    let t = 0, done = false;
    return {
      update(dt) {
        if (done) return;
        t += dt / dur;
        fn(from + (to - from) * ease(Math.max(0, Math.min(1, t))));
        if (t >= 1) done = true;
      },
      isDone() { return done; }
    };
  }

  toggle(i) {
    const s = this.switches[i];
    s.on = !s.on;
    this.placeKnob(s, s.on);
    // 清脆咔声（硬）+ 强震
    audio.click(true);
    haptic.heavy();
    if (this.switches.every(x => x.on)) this.emit('switchAllOn');
  }

  onDown(hit, sm) {
    if (!hit) return;
    const idx = hit.object.userData.idx;
    if (idx !== undefined) this.toggle(idx);
  }
}

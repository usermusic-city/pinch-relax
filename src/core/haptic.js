// 震动引擎 — navigator.vibrate 封装，连续操作强度递增（第5次比第1次强20%）
class Haptic {
  constructor() {
    this.count = 0;
    this.lastTime = 0;
    this.enabled = 'vibrate' in navigator;
  }

  reset() { this.count = 0; }

  // 连续操作计数（2秒内视为连续）
  bump() {
    const now = Date.now();
    if (now - this.lastTime > 2000) this.count = 0;
    this.count++;
    this.lastTime = now;
  }

  // 轻触：10ms 基准，随连续次数递增至 1.2 倍封顶
  light() {
    if (!this.enabled) return;
    this.bump();
    const scale = Math.min(1 + (this.count - 1) * 0.05, 1.2);
    try { navigator.vibrate(Math.round(10 * scale)); } catch (e) {}
  }

  // 中等
  medium() {
    if (!this.enabled) return;
    this.bump();
    const scale = Math.min(1 + (this.count - 1) * 0.05, 1.2);
    try { navigator.vibrate(Math.round(20 * scale)); } catch (e) {}
  }

  // 强震（破裂/解锁）
  heavy() {
    if (!this.enabled) return;
    this.bump();
    const scale = Math.min(1 + (this.count - 1) * 0.05, 1.2);
    try { navigator.vibrate([Math.round(30 * scale), 24, Math.round(18 * scale)]); } catch (e) {}
  }

  // 成功解锁节奏
  success() {
    if (!this.enabled) return;
    try { navigator.vibrate([16, 40, 16, 40, 30]); } catch (e) {}
  }
}

export const haptic = new Haptic();

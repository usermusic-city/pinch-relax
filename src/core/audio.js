// Web Audio 程序化音效引擎 — 全部合成，无外部资产
// 铁律：延迟≤16ms（预创建节点池）、每音效≥3变体、音高±5%
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
    this.unlocked = false;
  }

  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;
    // 轻混响尾音，制造空间感（文档：混响尾音0.4s）
    this.conv = this.ctx.createConvolver();
    this.conv.buffer = this.makeIR(0.42);
    this.wet = this.ctx.createGain();
    this.wet.gain.value = 0.16;
    this.master.connect(this.ctx.destination);
    this.wet.connect(this.conv);
    this.conv.connect(this.ctx.destination);
    this.noiseBuf = this.makeNoise(1.0);
  }

  unlock() {
    this.ensure();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.unlocked = true;
  }

  makeIR(sec) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * sec);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6) * 0.5;
      }
    }
    return buf;
  }

  makeNoise(sec) {
    const rate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, rate * sec, rate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // 节点快速接线：源 → (滤波) → 主总线 + 湿总线
  bus(node, wet = 1) {
    node.connect(this.master);
    if (wet > 0) {
      const w = this.ctx.createGain();
      w.gain.value = wet;
      node.connect(w);
      w.connect(this.wet);
    }
  }

  rand(a, b) { return a + Math.random() * (b - a); }
  pickPitch() { return this.rand(0.95, 1.05); } // ±5% 音高

  // ============ 音效合成器 ============

  // 泡泡破裂：短噪声脉冲 + 带通 + 低频"啵"腔体
  pop() {
    if (!this.unlocked) return;
    const t0 = this.ctx.currentTime;
    const p = this.pickPitch();
    // 变体：滤波中心频率随机偏移
    const variant = this.rand(900, 1600);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = p;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = variant;
    bp.Q.value = this.rand(1.2, 2.2);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.9, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + this.rand(0.06, 0.1));
    src.connect(bp); bp.connect(g);
    this.bus(g, 0.7);
    src.start(t0); src.stop(t0 + 0.12);
    // 腔体"啵"音
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.rand(280, 420) * p, t0);
    osc.frequency.exponentialRampToValueAtTime(90, t0 + 0.07);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.5, t0);
    og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
    this.bus(og, 0.5);
    osc.connect(og); osc.start(t0); osc.stop(t0 + 0.09);
  }

  // 捏捏乐黏腻声：低通噪声 + 慢包络 + 频率滑动
  squish(intensity = 0.5) {
    if (!this.unlocked) return;
    const t0 = this.ctx.currentTime;
    const p = this.pickPitch();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = this.rand(0.5, 0.8);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(this.rand(500, 900) * p, t0);
    lp.frequency.exponentialRampToValueAtTime(this.rand(150, 260), t0 + 0.22);
    lp.Q.value = 2.5;
    const g = this.ctx.createGain();
    const vol = 0.28 + intensity * 0.3;
    g.gain.setValueAtTime(0.001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + this.rand(0.2, 0.3));
    src.connect(lp); lp.connect(g);
    this.bus(g, 0.4);
    src.start(t0); src.stop(t0 + 0.35);
  }

  // 咔哒（按钮/魔方段落）：方波脉冲 + 高频瞬态
  click(hard = false) {
    if (!this.unlocked) return;
    const t0 = this.ctx.currentTime;
    const p = this.pickPitch();
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    const base = hard ? this.rand(1500, 2100) : this.rand(900, 1400);
    osc.frequency.setValueAtTime(base * p, t0);
    osc.frequency.exponentialRampToValueAtTime(base * 0.4, t0 + 0.03);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(hard ? 0.32 : 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.045);
    osc.connect(g);
    this.bus(g, 0.55);
    osc.start(t0); osc.stop(t0 + 0.05);
    // 瞬态噪声增加"脆"感
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = this.rand(2, 3);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 3000;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(hard ? 0.24 : 0.13, t0);
    ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.03);
    src.connect(hp); hp.connect(ng);
    this.bus(ng, 0.5);
    src.start(t0); src.stop(t0 + 0.04);
  }

  // 陀螺嗡鸣：持续正弦+调频，返回控制器
  hum(startFreq = 140) {
    if (!this.unlocked) return { set() {}, stop() {} };
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc.type = 'triangle'; osc2.type = 'sine';
    const g = this.ctx.createGain();
    g.gain.value = 0;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    osc.connect(g); osc2.connect(g); g.connect(lp);
    this.bus(lp, 0.3);
    osc.start(); osc2.start();
    let running = true;
    return {
      set(freq, vol) {
        if (!running) return;
        const t = this_ctx.currentTime;
        osc.frequency.setTargetAtTime(freq, t, 0.05);
        osc2.frequency.setTargetAtTime(freq * 2.01, t, 0.05);
        g.gain.setTargetAtTime(vol, t, 0.06);
      },
      stop() {
        if (!running) return;
        running = false;
        const t = this_ctx.currentTime;
        g.gain.setTargetAtTime(0, t, 0.15);
        setTimeout(() => { try { osc.stop(); osc2.stop(); } catch (e) {} }, 600);
      }
    };
  }

  // 拉链齿合：高频噪声短擦
  zip() {
    if (!this.unlocked) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = this.rand(1.6, 2.4);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = this.rand(2600, 4200);
    bp.Q.value = 3;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t0);
    g.gain.linearRampToValueAtTime(0.22, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + this.rand(0.05, 0.09));
    src.connect(bp); bp.connect(g);
    this.bus(g, 0.5);
    src.start(t0); src.stop(t0 + 0.1);
  }

  // 气球拉伸：音调随张力升高
  stretch(level = 0) {
    if (!this.unlocked) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    const f = 120 + level * 480;
    osc.frequency.setValueAtTime(f * this.pickPitch(), t0);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t0);
    g.gain.linearRampToValueAtTime(0.06 + level * 0.05, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
    osc.connect(lp); lp.connect(g);
    this.bus(g, 0.35);
    osc.start(t0); osc.stop(t0 + 0.14);
  }

  // 气球破裂：大 pop
  burst() {
    if (!this.unlocked) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = this.rand(0.8, 1.2);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = this.rand(400, 800);
    bp.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(1.0, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
    src.connect(bp); bp.connect(g);
    this.bus(g, 0.9);
    src.start(t0); src.stop(t0 + 0.3);
  }

  // 弹簧：金属余音，衰减震荡
  boing(force = 0.5) {
    if (!this.unlocked) return;
    const t0 = this.ctx.currentTime;
    const p = this.pickPitch();
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    const base = this.rand(220, 300);
    osc.frequency.setValueAtTime(base * p * (1 + force * 0.5), t0);
    osc.frequency.exponentialRampToValueAtTime(base * 0.5, t0 + 0.35);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.35, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + this.rand(0.35, 0.5));
    osc.connect(g);
    this.bus(g, 0.8);
    osc.start(t0); osc.stop(t0 + 0.55);
    // 金属泛音
    const o2 = this.ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(base * 3.02 * p, t0);
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.08, t0);
    g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
    o2.connect(g2);
    this.bus(g2, 0.8);
    o2.start(t0); o2.stop(t0 + 0.22);
  }

  // 解锁风铃：双音正弦
  chime() {
    if (!this.unlocked) return;
    const t0 = this.ctx.currentTime;
    [523.25, 783.99, 1046.5].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = this.ctx.createGain();
      const st = t0 + i * 0.09;
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.22, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.6);
      osc.connect(g);
      this.bus(g, 1);
      osc.start(st); osc.stop(st + 0.65);
    });
  }

  // 页面切换轻扫
  swoosh() {
    if (!this.unlocked) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.7;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(400, t0);
    bp.frequency.exponentialRampToValueAtTime(2400, t0 + 0.25);
    bp.Q.value = 1.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t0);
    g.gain.linearRampToValueAtTime(0.14, t0 + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
    src.connect(bp); bp.connect(g);
    this.bus(g, 0.6);
    src.start(t0); src.stop(t0 + 0.32);
  }
}

// hum() 闭包内需要访问引擎实例
let this_ctx = null;
const origEnsure = AudioEngine.prototype.ensure;
AudioEngine.prototype.ensure = function () {
  const wasNull = !this.ctx;
  origEnsure.call(this);
  if (wasNull) this_ctx = this.ctx;
};

export const audio = new AudioEngine();

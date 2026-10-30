// 捏一下 Pinch — 入口
import { SceneManager } from './core/scene.js';
import { InputRouter } from './core/toyBase.js';
import { UIManager } from './core/ui.js';
import { audio } from './core/audio.js';
import { touchStreak } from './core/storage.js';

const canvas = document.getElementById('gl');
const sm = new SceneManager(canvas);
const router = new InputRouter(sm);
const ui = new UIManager(sm, router);

// 首次交互解锁音频
const unlock = () => {
  audio.unlock();
  window.removeEventListener('pointerdown', unlock);
};
window.addEventListener('pointerdown', unlock);

// 启动：更新连续天数 + 显示主页
touchStreak();
ui.showHome();

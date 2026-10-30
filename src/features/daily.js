// 今日玩具 — 每日轮换（按日期确定性随机）
import { getData, todayStr } from '../core/storage.js';

const TOY_IDS = ['bubblewrap', 'squishy', 'spinner', 'cube', 'switch', 'zipper', 'balloon', 'spring'];

function dayIndex(dateStr) {
  // 简单字符串哈希 → 确定性
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
  return h;
}

export function todayToyId() {
  const save = getData();
  const d = todayStr();
  return TOY_IDS[dayIndex(save.firstOpen + d) % TOY_IDS.length];
}

export function allToyIds() {
  return TOY_IDS.slice();
}

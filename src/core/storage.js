// 存档系统 — localStorage JSON
const KEY = 'pinch_save_v1';

const DEFAULT = {
  // 玩具使用统计
  toyStats: {},        // id: { count, totalMs, lastDate }
  // 情绪日记
  diary: [],           // { date: 'YYYY-MM-DD', ts, mood, text, toyId }
  // 连续使用
  streak: { last: '', days: 0 },
  // 收集册解锁状态
  unlocked: {},        // collectId: true
  // 每日玩具轮换种子
  firstOpen: null
};

let data = null;

function load() {
  if (data) return data;
  try {
    const raw = localStorage.getItem(KEY);
    data = raw ? { ...DEFAULT, ...JSON.parse(raw) } : { ...DEFAULT };
  } catch (e) {
    data = { ...DEFAULT };
  }
  if (!data.firstOpen) data.firstOpen = todayStr();
  return data;
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
}

export function todayStr(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 更新连续使用天数
export function touchStreak() {
  const d = load();
  const today = todayStr();
  if (d.streak.last === today) return d.streak.days;
  const yesterday = todayStr(new Date(Date.now() - 86400000));
  if (d.streak.last === yesterday) d.streak.days += 1;
  else d.streak.days = 1;
  d.streak.last = today;
  save();
  return d.streak.days;
}

// 记录玩具使用
export function trackToy(toyId, ms) {
  const d = load();
  if (!d.toyStats[toyId]) d.toyStats[toyId] = { count: 0, totalMs: 0, lastDate: '' };
  const s = d.toyStats[toyId];
  s.count += 1;
  s.totalMs += ms;
  s.lastDate = todayStr();
  save();
}

export function addDiary(entry) {
  const d = load();
  d.diary.push({ date: todayStr(), ts: Date.now(), ...entry });
  // 只保留最近 500 条
  if (d.diary.length > 500) d.diary = d.diary.slice(-500);
  save();
}

export function unlockCollect(id) {
  const d = load();
  if (d.unlocked[id]) return false;
  d.unlocked[id] = true;
  save();
  return true; // 新解锁
}

export function getData() { return load(); }
export function persist() { save(); }
export { save };

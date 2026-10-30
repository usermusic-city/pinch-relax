// 情绪周报 — 最近7天数据汇总
import { getData, todayStr } from '../core/storage.js';

export function weeklyReport() {
  const save = getData();
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const ds = todayStr(d);
    days.push({
      date: ds,
      diary: save.diary.filter(e => e.date === ds),
      toys: Object.entries(save.toyStats).filter(([id, s]) => s.lastDate === ds)
    });
  }
  const totalEntries = days.reduce((a, d) => a + d.diary.length, 0);
  const totalSessions = days.reduce((a, d) => a + d.toys.length, 0);
  // 心情统计
  const moodCount = {};
  days.forEach(d => d.diary.forEach(e => {
    if (e.mood) moodCount[e.mood] = (moodCount[e.mood] || 0) + 1;
  }));
  const topMood = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0];
  // 最常用玩具
  const toyCount = {};
  days.forEach(d => d.toys.forEach(([id]) => {
    toyCount[id] = (toyCount[id] || 0) + 1;
  }));
  const topToy = Object.entries(toyCount).sort((a, b) => b[1] - a[1])[0];
  return { days, totalEntries, totalSessions, moodCount, topMood, topToy };
}

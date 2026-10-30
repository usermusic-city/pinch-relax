// 收集册 — 24个隐藏玩具，按连续天数/心情标签/特定行为解锁
import { getData, unlockCollect } from '../core/storage.js';

// unlockCond(save) 返回 true 时解锁
export const COLLECTION = [
  // —— 连续使用天数系列（8个）——
  { id: 'c_streak1', icon: '🌱', name: '初来乍到', cond: '连续使用1天', type: 'streak', v: 1 },
  { id: 'c_streak2', icon: '🌿', name: '习惯发芽', cond: '连续使用2天', type: 'streak', v: 2 },
  { id: 'c_streak3', icon: '🍀', name: '三日之约', cond: '连续使用3天', type: 'streak', v: 3 },
  { id: 'c_streak5', icon: '🌳', name: '五日常客', cond: '连续使用5天', type: 'streak', v: 5 },
  { id: 'c_streak7', icon: '🔥', name: '一周之约', cond: '连续使用7天', type: 'streak', v: 7 },
  { id: 'c_streak10', icon: '⭐', name: '十日老友', cond: '连续使用10天', type: 'streak', v: 10 },
  { id: 'c_streak15', icon: '🌟', name: '半月知己', cond: '连续使用15天', type: 'streak', v: 15 },
  { id: 'c_streak30', icon: '👑', name: '月度挚友', cond: '连续使用30天', type: 'streak', v: 30 },
  // —— 心情标签系列（8个）——
  { id: 'c_mood_happy', icon: '☀️', name: '阳光心情', cond: '记录「开心」心情', type: 'mood', v: '开心' },
  { id: 'c_mood_calm', icon: '🌙', name: '心如止水', cond: '记录「平静」心情', type: 'mood', v: '平静' },
  { id: 'c_mood_tired', icon: '😴', name: '疲惫时刻', cond: '记录「疲惫」心情', type: 'mood', v: '疲惫' },
  { id: 'c_mood_sad', icon: '🌧️', name: '雨过天晴', cond: '记录「难过」心情', type: 'mood', v: '难过' },
  { id: 'c_mood_anxious', icon: '🌊', name: '乘风破浪', cond: '记录「焦虑」心情', type: 'mood', v: '焦虑' },
  { id: 'c_mood_angry', icon: '🌋', name: '怒气消散', cond: '记录「烦躁」心情', type: 'mood', v: '烦躁' },
  { id: 'c_mood_all', icon: '🌈', name: '七彩人生', cond: '记录过全部6种心情', type: 'moodAll' },
  { id: 'c_diary10', icon: '📔', name: '日记新手', cond: '写满10篇日记', type: 'diaryCount', v: 10 },
  // —— 特定行为系列（8个）——
  { id: 'c_pop_all', icon: '🫧', name: '全灭泡泡', cond: '一次戳完全部泡泡', type: 'event', v: 'popAll' },
  { id: 'c_spin_fast', icon: '💫', name: '极速旋转', cond: '让陀螺转速拉满', type: 'event', v: 'spinFast' },
  { id: 'c_balloon_burst', icon: '💥', name: '砰！', cond: '弄爆一个气球', type: 'event', v: 'balloonBurst' },
  { id: 'c_switch_all', icon: '🎛️', name: '全开模式', cond: '同时打开全部开关', type: 'event', v: 'switchAllOn' },
  { id: 'c_zip_end', icon: '🔗', name: '一拉到底', cond: '把拉链拉到最底', type: 'event', v: 'zipEnd' },
  { id: 'c_squish_deep', icon: '🫠', name: '深度揉捏', cond: '把捏捏乐压扁到极限', type: 'event', v: 'squishDeep' },
  { id: 'c_spring_big', icon: '🚀', name: '弹簧发射', cond: '把弹簧拉到最长', type: 'event', v: 'springMax' },
  { id: 'c_cube_round', icon: '🔁', name: '转满一圈', cond: '拨盘累计转过360°', type: 'event', v: 'cubeRound' }
];

export const MOODS = ['开心', '平静', '疲惫', '难过', '焦虑', '烦躁'];

// 检查解锁（事件触发时调用），返回新解锁的收集品数组
export function checkUnlocks(event) {
  const save = getData();
  const newly = [];
  for (const c of COLLECTION) {
    if (save.unlocked[c.id]) continue;
    let ok = false;
    if (c.type === 'streak') ok = save.streak.days >= c.v;
    else if (c.type === 'mood') ok = save.diary.some(d => d.mood === c.v);
    else if (c.type === 'moodAll') ok = MOODS.every(m => save.diary.some(d => d.mood === m));
    else if (c.type === 'diaryCount') ok = save.diary.length >= c.v;
    else if (c.type === 'event') ok = event === c.v;
    if (ok && unlockCollect(c.id)) newly.push(c);
  }
  return newly;
}

// 收集册进度
export function collProgress() {
  const save = getData();
  const n = COLLECTION.filter(c => save.unlocked[c.id]).length;
  return { n, total: COLLECTION.length };
}

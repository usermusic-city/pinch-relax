// UI 管理器 — 主页/玩具场景/日记/周报/收集册
import { createToy } from '../toys/index.js';
import { todayToyId, allToyIds } from '../features/daily.js';
import { COLLECTION, MOODS, checkUnlocks, collProgress } from '../features/collection.js';
import { weeklyReport } from '../features/weekly.js';
import { getData, addDiary, touchStreak, trackToy } from '../core/storage.js';
import { audio } from '../core/audio.js';
import { haptic } from '../core/haptic.js';

const TOY_META = {
  bubblewrap: { icon: '🫧', name: '泡泡纸', desc: '戳破所有泡泡', bg: '#8FA8BF' },
  squishy: { icon: '🧸', name: '捏捏乐', desc: '按住揉捏，松手回弹', bg: '#D9A5A0' },
  spinner: { icon: '🌀', name: '指尖陀螺', desc: '快速滑动让它转起来', bg: '#9CAF9C' },
  cube: { icon: '🎲', name: '解压魔方', desc: '拨动转盘，听咔哒声', bg: '#D4B85C' },
  switch: { icon: '🔘', name: '按钮开关', desc: '啪嗒啪嗒，拨动开关', bg: '#B0A8C9' },
  zipper: { icon: '🧥', name: '拉链', desc: '上下拉动拉链头', bg: '#C98B7F' },
  balloon: { icon: '🎈', name: '气球', desc: '捏住拉扯，小心爆掉', bg: '#D9A5A0' },
  spring: { icon: '🪀', name: '弹簧', desc: '拉长松手，duang~', bg: '#D4B85C' }
};

export class UIManager {
  constructor(sm, router) {
    this.sm = sm;
    this.router = router;
    this.root = document.getElementById('ui-root');
    this.currentToy = null;
    this.toyEnterT = 0;
    this.buildChrome();
  }

  buildChrome() {
    // toast
    this.toastEl = document.createElement('div');
    this.toastEl.className = 'toast';
    this.root.appendChild(this.toastEl);
  }

  toast(msg, ms = 2200) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }

  // ==================== 主页 ====================
  showHome() {
    this.exitToy(true);
    this.clearPanels();
    const save = getData();
    const days = touchStreak();
    const todayId = todayToyId();

    const grid = document.createElement('div');
    grid.className = 'toy-grid';
    let html = `
      <div class="today-banner">
        <div class="label">今日推荐</div>
        <div class="name">${TOY_META[todayId].icon} ${TOY_META[todayId].name}</div>
      </div>
      <div class="grid-wrap">`;
    for (const id of allToyIds()) {
      const m = TOY_META[id];
      const s = save.toyStats[id];
      const count = s ? s.count : 0;
      html += `
        <button class="toy-card ${id === todayId ? 'is-today' : ''}" data-toy="${id}">
          <div class="toy-icon" style="background:${m.bg}22">${m.icon}</div>
          <div class="toy-name">${m.name}</div>
          <div class="toy-desc">${m.desc}</div>
        </button>`;
    }
    html += `</div>`;
    grid.innerHTML = html;
    this.root.appendChild(grid);

    // 顶栏
    const top = document.createElement('div');
    top.className = 'top-bar';
    top.innerHTML = `
      <div class="top-title">捏一下</div>
      <div class="top-chip">🔥 连续 ${days} 天</div>`;
    this.root.appendChild(top);

    // 底部导航
    const nav = document.createElement('div');
    nav.className = 'bottom-nav';
    nav.innerHTML = `
      <button class="nav-btn active">玩具箱</button>
      <button class="nav-btn" data-act="diary">情绪日记</button>
      <button class="nav-btn" data-act="weekly">周报</button>
      <button class="nav-btn" data-act="coll">收集册</button>`;
    this.root.appendChild(nav);

    // 绑定
    grid.querySelectorAll('.toy-card').forEach(btn => {
      btn.addEventListener('click', () => {
        audio.unlock();
        audio.swoosh();
        this.enterToy(btn.dataset.toy);
      });
    });
    nav.querySelectorAll('[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        audio.unlock();
        audio.swoosh();
        const act = btn.dataset.act;
        if (act === 'diary') this.openDiary();
        else if (act === 'weekly') this.openWeekly();
        else if (act === 'coll') this.openCollection();
      });
    });

    this.homeEl = grid;
    // 启动时检查连续天数解锁
    const newly = checkUnlocks(null);
    if (newly.length) this.announceUnlocks(newly);
  }

  clearPanels() {
    this.root.querySelectorAll('.toy-grid, .top-bar, .bottom-nav, .full-panel, .back-btn, .scene-title, .mood-btn, .scene-hint').forEach(el => el.remove());
  }

  // ==================== 玩具场景 ====================
  enterToy(id) {
    this.exitToy(true);
    this.clearPanels();
    audio.unlock();

    const toy = createToy(id);
    if (!toy) return;
    toy.onEvent = (ev) => {
      const newly = checkUnlocks(ev);
      if (newly.length) this.announceUnlocks(newly);
    };
    this.currentToy = toy;
    this.toyEnterT = performance.now();
    const targets = toy.build(this.sm);
    this.sm.toysGroup.add(toy.group);
    this.router.setToy(toy, targets);
    haptic.reset();

    // 场景 UI
    const back = document.createElement('button');
    back.className = 'back-btn';
    back.textContent = '←';
    back.addEventListener('click', () => {
      audio.swoosh();
      this.showHome();
    });
    this.root.appendChild(back);

    const title = document.createElement('div');
    title.className = 'scene-title';
    title.textContent = TOY_META[id].name;
    this.root.appendChild(title);

    const moodBtn = document.createElement('button');
    moodBtn.className = 'mood-btn';
    moodBtn.textContent = '😊 记心情';
    moodBtn.addEventListener('click', () => this.openMoodSheet(id));
    this.root.appendChild(moodBtn);

    // 操作提示（3秒后淡出）
    const hint = document.createElement('div');
    hint.className = 'scene-hint show';
    hint.textContent = TOY_META[id].desc;
    this.root.appendChild(hint);
    setTimeout(() => hint.classList.remove('show'), 3000);

    // tick 挂载
    this._toyTick = (dt, t) => toy.tick(dt, t, this.sm);
    this.sm.onUpdate(this._toyTick);
  }

  exitToy(silent) {
    if (this._toyTick) {
      this.sm.offUpdate(this._toyTick);
      this._toyTick = null;
    }
    if (this.currentToy) {
      const toy = this.currentToy;
      // 记录使用
      const ms = performance.now() - this.toyEnterT;
      if (ms > 3000) trackToy(toy.id, ms);
      this.router.clear();
      toy.dispose(this.sm);
      this.sm.clearToys();
      this.currentToy = null;
    }
  }

  // ==================== 情绪记录 ====================
  openMoodSheet(toyId) {
    this.closeSheet();
    const mask = document.createElement('div');
    mask.className = 'sheet-mask show';
    mask.addEventListener('click', () => this.closeSheet());
    this.root.appendChild(mask);

    const sheet = document.createElement('div');
    sheet.className = 'sheet show';
    sheet.innerHTML = `
      <div class="sheet-head">
        <div class="sheet-title">现在感觉如何？</div>
        <button class="sheet-close">✕</button>
      </div>
      <div class="mood-tags">
        ${MOODS.map(m => `<button class="mood-tag" data-mood="${m}">${m}</button>`).join('')}
      </div>
      <textarea class="mood-input" rows="3" placeholder="想说点什么（可不填）…"></textarea>
      <button class="save-btn">保存心情</button>`;
    this.root.appendChild(sheet);

    let selected = null;
    sheet.querySelectorAll('.mood-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        sheet.querySelectorAll('.mood-tag').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selected = btn.dataset.mood;
        haptic.light();
      });
    });
    sheet.querySelector('.sheet-close').addEventListener('click', () => this.closeSheet());
    sheet.querySelector('.save-btn').addEventListener('click', () => {
      if (!selected) { this.toast('先选一个心情标签吧'); return; }
      const text = sheet.querySelector('.mood-input').value.trim();
      addDiary({ mood: selected, text, toyId });
      audio.chime();
      haptic.success();
      this.closeSheet();
      this.toast('心情已记录 🌱');
      // 心情标签可能触发解锁
      const newly = checkUnlocks(null);
      if (newly.length) this.announceUnlocks(newly);
    });

    this._sheet = sheet;
    this._mask = mask;
  }

  closeSheet() {
    if (this._sheet) { this._sheet.remove(); this._sheet = null; }
    if (this._mask) { this._mask.remove(); this._mask = null; }
  }

  // ==================== 情绪日记 ====================
  openDiary() {
    this.closeSheet();
    const save = getData();
    const list = save.diary.slice(-30).reverse();

    const panel = document.createElement('div');
    panel.className = 'full-panel';
    panel.innerHTML = `
      <div class="sheet-head">
        <div class="sheet-title">情绪日记</div>
        <button class="sheet-close">✕</button>
      </div>
      ${list.length ? `<div class="diary-list">${list.map(e => `
        <div class="diary-item">
          <div class="meta"><span>${e.date}</span><span class="tag">${e.mood}</span></div>
          ${e.text ? e.text : '<span style="color:var(--ink-soft)">（没有留言）</span>'}
        </div>`).join('')}</div>` : `<div class="weekly-empty">还没有日记，去玩个玩具再记录心情吧</div>`}
    `;
    this.root.appendChild(panel);
    panel.querySelector('.sheet-close').addEventListener('click', () => panel.remove());
    this._panel = panel;
  }

  // ==================== 周报 ====================
  openWeekly() {
    this.closeSheet();
    const r = weeklyReport();
    const save = getData();
    const totalMs = Object.values(save.toyStats).reduce((a, s) => a + s.totalMs, 0);
    const totalPlay = Math.round(totalMs / 60000);

    const panel = document.createElement('div');
    panel.className = 'full-panel';
    panel.innerHTML = `
      <div class="sheet-head">
        <div class="sheet-title">情绪周报</div>
        <button class="sheet-close">✕</button>
      </div>
      <div class="stat-row">
        <div class="stat-box"><div class="num">${save.streak.days}</div><div class="lbl">连续天数</div></div>
        <div class="stat-box"><div class="num">${totalPlay}</div><div class="lbl">累计分钟</div></div>
        <div class="stat-box"><div class="num">${save.diary.length}</div><div class="lbl">日记篇数</div></div>
      </div>
      <div class="weekly-card">
        <h3>最近7天</h3>
        <div class="weekly-row"><span>记录心情</span><b>${r.totalEntries} 次</b></div>
        <div class="weekly-row"><span>活跃天数</span><b>${r.days.filter(d => d.diary.length || d.toys.length).length} 天</b></div>
        <div class="weekly-row"><span>最常见心情</span><b>${r.topMood ? r.topMood[0] : '—'}</b></div>
        <div class="weekly-row"><span>最爱玩具</span><b>${r.topToy ? (TOY_META[r.topToy[0]]?.name || '—') : '—'}</b></div>
      </div>
      ${r.totalEntries === 0 ? '<div class="weekly-empty">这周还没有心情记录，玩完玩具记得记一笔</div>' : ''}
    `;
    this.root.appendChild(panel);
    panel.querySelector('.sheet-close').addEventListener('click', () => panel.remove());
    this._panel = panel;
  }

  // ==================== 收集册 ====================
  openCollection() {
    this.closeSheet();
    const save = getData();
    const prog = collProgress();

    const panel = document.createElement('div');
    panel.className = 'full-panel';
    panel.innerHTML = `
      <div class="sheet-head">
        <div class="sheet-title">收集册</div>
        <button class="sheet-close">✕</button>
      </div>
      <div class="stat-row">
        <div class="stat-box"><div class="num">${prog.n} / ${prog.total}</div><div class="lbl">已解锁</div></div>
      </div>
      <div class="coll-grid">
        ${COLLECTION.map(c => {
          const un = !!save.unlocked[c.id];
          return `<div class="coll-item ${un ? 'unlocked' : 'locked'}">
            <div class="ci-icon">${un ? c.icon : '❔'}</div>
            <div class="ci-name">${un ? c.name : '？？？'}</div>
            <div class="ci-cond">${c.cond}</div>
          </div>`;
        }).join('')}
      </div>
    `;
    this.root.appendChild(panel);
    panel.querySelector('.sheet-close').addEventListener('click', () => panel.remove());
    this._panel = panel;
  }

  // ==================== 解锁通知 ====================
  announceUnlocks(newly) {
    for (const c of newly) {
      audio.chime();
      haptic.success();
      this.toast(`${c.icon} 解锁「${c.name}」！`, 3000);
    }
  }
}

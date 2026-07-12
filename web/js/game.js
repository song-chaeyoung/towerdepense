/* Tower Rush — 메인 게임 로직 (바닐라 JS + Canvas)
 * 상태 머신: MENU → PLAYING → RESULT  (docs/11)
 */
(function () {
  'use strict';

  // ── DOM 참조 ────────────────────────────────────────
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  canvas.width = MAP_W;
  canvas.height = MAP_H;

  const el = {
    menu: document.getElementById('menu'),
    gameWrap: document.getElementById('game-wrap'),
    result: document.getElementById('result'),
    gold: document.getElementById('stat-gold'),
    lives: document.getElementById('stat-lives'),
    wave: document.getElementById('stat-wave'),
    score: document.getElementById('stat-score'),
    towerButtons: document.getElementById('tower-buttons'),
    waveBtn: document.getElementById('wave-btn'),
    speedBtn: document.getElementById('speed-btn'),
    towerPanel: document.getElementById('tower-panel'),
    startBtn: document.getElementById('start-btn'),
    difficulty: document.getElementById('difficulty'),
    menuBest: document.getElementById('menu-best'),
    resultTitle: document.getElementById('result-title'),
    resultSummary: document.getElementById('result-summary'),
    retryBtn: document.getElementById('retry-btn'),
    shareBtn: document.getElementById('share-btn'),
    toast: document.getElementById('toast'),
  };

  // ── 경로 좌표 계산 ──────────────────────────────────
  const tileCenter = (c, r) => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 });
  const WP = PATH_WAYPOINTS.map(([c, r]) => tileCenter(c, r));

  // 경로가 지나는 타일 집합 → 설치 불가 (F-04)
  const pathCells = new Set();
  (function computePathCells() {
    for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
      let [c0, r0] = PATH_WAYPOINTS[i];
      const [c1, r1] = PATH_WAYPOINTS[i + 1];
      const dc = Math.sign(c1 - c0);
      const dr = Math.sign(r1 - r0);
      let c = c0, r = r0;
      pathCells.add(c + ',' + r);
      while (c !== c1 || r !== r1) {
        if (c !== c1) c += dc;
        else if (r !== r1) r += dr;
        pathCells.add(c + ',' + r);
      }
    }
  })();
  const isBuildable = (c, r) =>
    c >= 0 && c < COLS && r >= 0 && r < ROWS && !pathCells.has(c + ',' + r);

  // ── 게임 상태 ───────────────────────────────────────
  const AUTO_NEXT_DELAY = 4; // 웨이브 클리어 후 다음 웨이브 자동 시작까지 대기(초)
  let state = 'MENU';
  let gold, lives, waveIndex, kills, waveActive, spawnQueue, spawnElapsed, gameSpeed;
  let nextWaveTimer; // >0 이면 카운트다운 중
  let difficulty = DIFFICULTIES.normal;      // 현재 난이도
  let selectedDiffKey = 'normal';            // 메인에서 고른 난이도
  let towers, enemies, projectiles, popups;
  let selectedTowerType = null; // 설치 모드
  let selectedTower = null;      // 선택된 설치 타워
  let hoverCell = null;
  let lastTime = 0;

  function resetGame() {
    difficulty = DIFFICULTIES[selectedDiffKey] || DIFFICULTIES.normal;
    gold = difficulty.gold;
    lives = difficulty.lives;
    waveIndex = 0;
    kills = 0;
    waveActive = false;
    spawnQueue = [];
    spawnElapsed = 0;
    nextWaveTimer = 0;
    gameSpeed = 1;
    towers = [];
    enemies = [];
    projectiles = [];
    popups = [];
    selectedTowerType = null;
    selectedTower = null;
    el.speedBtn.textContent = '⏩ 1배속';
  }

  // ── 최고 기록 (F-30) — 난이도별로 저장 ──────────────
  const BEST_KEY = 'towerRushBestByDiff';
  function loadAllBest() {
    try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function bestFor(diffKey) {
    return loadAllBest()[diffKey] || { wave: 0, score: 0, cleared: false };
  }
  function saveBest(diffKey, wave, score, cleared) {
    const all = loadAllBest();
    const prev = all[diffKey] || { wave: 0, score: 0, cleared: false };
    all[diffKey] = {
      wave: Math.max(prev.wave, wave),
      score: Math.max(prev.score, score),
      cleared: prev.cleared || cleared,
    };
    try { localStorage.setItem(BEST_KEY, JSON.stringify(all)); } catch (e) {}
    return all[diffKey];
  }
  function computeScore() {
    return kills * 10 + waveIndex * 100 + Math.max(0, lives) * 20;
  }

  // ── 화면 전환 ───────────────────────────────────────
  function show(next) {
    state = next;
    el.menu.classList.toggle('hidden', next !== 'MENU');
    el.gameWrap.classList.toggle('hidden', next === 'MENU');
    el.result.classList.toggle('hidden', next !== 'RESULT');
    if (next === 'MENU') {
      buildDifficultyButtons();
      updateMenuBest();
    }
  }

  // 난이도 선택 UI (메인)
  function buildDifficultyButtons() {
    el.difficulty.innerHTML = '';
    DIFFICULTY_ORDER.forEach((key) => {
      const d = DIFFICULTIES[key];
      const rec = bestFor(key);
      const status = rec.cleared ? '클리어 ✓' : rec.wave > 0 ? `최고 ${rec.wave}웨이브` : '미클리어';
      const btn = document.createElement('button');
      btn.className = 'diff-btn' + (key === selectedDiffKey ? ' active' : '');
      btn.dataset.key = key;
      btn.innerHTML =
        `<span class="df-name">${d.emoji} ${d.name}</span>` +
        `<span class="df-meta">목숨 ${d.lives} · 골드 ${d.gold} · 적 ${Math.round(d.hpMul * 100)}%</span>` +
        `<span class="df-status ${rec.cleared ? 'done' : ''}">${status}</span>`;
      btn.addEventListener('click', () => {
        selectedDiffKey = key;
        buildDifficultyButtons();
        updateMenuBest();
      });
      el.difficulty.appendChild(btn);
    });
  }
  function updateMenuBest() {
    const d = DIFFICULTIES[selectedDiffKey];
    const rec = bestFor(selectedDiffKey);
    el.menuBest.textContent = rec.wave > 0
      ? `${d.emoji} ${d.name} 최고 기록: ${rec.wave}웨이브 · ${rec.score}점${rec.cleared ? ' · 클리어 ✓' : ''}`
      : `${d.emoji} ${d.name} — 아직 기록이 없어요. 도전해 보세요!`;
  }

  // ── 토스트 알림 ─────────────────────────────────────
  let toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 1400);
  }

  // ── 타워 선택 버튼 UI (F-06) ────────────────────────
  function buildTowerButtons() {
    el.towerButtons.innerHTML = '';
    TOWER_ORDER.forEach((key) => {
      const t = TOWER_TYPES[key];
      const btn = document.createElement('button');
      btn.className = 'tower-btn';
      btn.dataset.key = key;
      btn.innerHTML =
        `<span class="tb-dot" style="background:${t.color}"></span>` +
        `<span class="tb-name">${t.name}</span>` +
        `<span class="tb-cost">💰${t.cost}</span>` +
        `<span class="tb-desc">${t.desc}</span>`;
      btn.addEventListener('click', () => {
        selectedTower = null;
        selectedTowerType = (selectedTowerType === key) ? null : key;
        refreshTowerButtons();
        refreshTowerPanel();
      });
      el.towerButtons.appendChild(btn);
    });
  }
  function refreshTowerButtons() {
    [...el.towerButtons.children].forEach((btn) => {
      const key = btn.dataset.key;
      btn.classList.toggle('active', key === selectedTowerType);
      btn.classList.toggle('cant-afford', gold < TOWER_TYPES[key].cost);
    });
  }

  // ── 선택 타워 패널: 강화/판매 (F-21, F-22) ──────────
  function refreshTowerPanel() {
    if (!selectedTower) { el.towerPanel.classList.add('hidden'); return; }
    const t = selectedTower;
    const def = TOWER_TYPES[t.type];
    const canUpgrade = t.level < MAX_LEVEL;
    const upCost = canUpgrade ? upgradeCost(t.type, t.level) : 0;
    const sellValue = Math.round(t.invested * SELL_RATIO);
    el.towerPanel.classList.remove('hidden');
    el.towerPanel.innerHTML =
      `<div class="tp-head"><span class="tb-dot" style="background:${def.color}"></span>` +
      `${def.name} <span class="tp-lv">Lv.${t.level}</span></div>` +
      (canUpgrade
        ? `<button id="tp-up" ${gold < upCost ? 'disabled' : ''}>⬆ 강화 (💰${upCost})</button>`
        : `<button disabled>최대 레벨</button>`) +
      `<button id="tp-sell">💵 판매 (+${sellValue})</button>`;
    const up = document.getElementById('tp-up');
    if (up) up.addEventListener('click', () => upgradeTower(t));
    document.getElementById('tp-sell').addEventListener('click', () => sellTower(t));
  }

  function upgradeTower(t) {
    if (t.level >= MAX_LEVEL) return;
    const cost = upgradeCost(t.type, t.level);
    if (gold < cost) { toast('골드가 부족해요'); return; }
    gold -= cost;
    t.invested += cost;
    t.level += 1;
    applyTowerStats(t);
    toast(`${TOWER_TYPES[t.type].name} 강화! Lv.${t.level}`);
    refreshTowerPanel();
    updateHUD();
  }
  function sellTower(t) {
    const refund = Math.round(t.invested * SELL_RATIO);
    gold += refund;
    towers = towers.filter((x) => x !== t);
    selectedTower = null;
    refreshTowerPanel();
    updateHUD();
    toast(`판매 +${refund}골드`);
  }

  function applyTowerStats(t) {
    const s = towerStat(t.type, t.level);
    t.damage = s.damage; t.range = s.range; t.fireInterval = s.fireInterval;
    t.projSpeed = s.projSpeed; t.splash = s.splash; t.slow = s.slow;
    t.slowDur = s.slowDur; t.color = s.color;
  }

  // ── 타워 설치 (F-05, F-19) ──────────────────────────
  function placeTower(c, r) {
    const def = TOWER_TYPES[selectedTowerType];
    if (!def) return;
    if (!isBuildable(c, r)) { toast('여기엔 설치할 수 없어요'); return; }
    if (towers.some((t) => t.col === c && t.row === r)) { toast('이미 타워가 있어요'); return; }
    if (gold < def.cost) { toast('골드가 부족해요'); return; }
    gold -= def.cost;
    const center = tileCenter(c, r);
    const t = {
      type: selectedTowerType, col: c, row: r, x: center.x, y: center.y,
      level: 1, invested: def.cost, cooldown: 0, angle: 0,
    };
    applyTowerStats(t);
    towers.push(t);
    updateHUD();
    refreshTowerButtons();
  }

  // ── 적 스폰 (F-12, F-16) ────────────────────────────
  function startWave() {
    if (waveActive || state !== 'PLAYING') return;
    if (waveIndex >= TOTAL_WAVES) return;
    const wave = WAVES[waveIndex];
    // 난이도 체력 배율은 초반엔 약하게, 웨이브 5(index4)부터 100% 적용 → 어려움도 초반은 클리어 가능
    const diffRamp = Math.min(1, waveIndex / 4);
    const diffHp = 1 + (difficulty.hpMul - 1) * diffRamp;
    const mods = {
      hp: hpScaleForWave(waveIndex) * diffHp,
      speed: speedScaleForWave(waveIndex),
      reward: rewardScaleForWave(waveIndex),
    };
    // 어려움: 웨이브 3부터 빠른 적 추가 편성 (fastPack)
    const groups = wave.slice();
    if (difficulty.fastPack && waveIndex >= 2) {
      groups.push({ type: 'runner', count: 3 + Math.floor(waveIndex * 0.8), gap: 0.35 });
    }
    spawnQueue = [];
    let t = 0;
    groups.forEach((group) => {
      for (let i = 0; i < group.count; i++) {
        spawnQueue.push({ type: group.type, at: t, mods });
        t += group.gap;
      }
      t += 0.6; // 그룹 사이 간격
    });
    spawnElapsed = 0;
    nextWaveTimer = 0;
    waveActive = true;
    updateHUD();
  }

  function spawnEnemy(type, mods) {
    const def = ENEMY_TYPES[type];
    const hp = def.hp * mods.hp; // 웨이브 지수 스케일 × 난이도 체력 배율(램프 반영)
    enemies.push({
      type, color: def.color, radius: def.radius,
      x: WP[0].x, y: WP[0].y,
      hp, maxHp: hp,
      speed: def.speed * difficulty.speedMul * mods.speed,
      reward: Math.max(1, Math.round(def.reward * difficulty.rewardMul * mods.reward)),
      wpIndex: 0, dist: 0,
      slowTimer: 0, slowFactor: 1,
    });
  }

  // ── 업데이트 루프 ───────────────────────────────────
  function update(dt) {
    // 다음 웨이브 자동 시작 카운트다운
    if (!waveActive && nextWaveTimer > 0) {
      nextWaveTimer -= dt;
      if (nextWaveTimer <= 0) { nextWaveTimer = 0; startWave(); }
    }

    // 스폰
    if (waveActive && spawnQueue.length) {
      spawnElapsed += dt;
      while (spawnQueue.length && spawnQueue[0].at <= spawnElapsed) {
        const s = spawnQueue.shift();
        spawnEnemy(s.type, s.mods);
      }
    }

    // 적 이동 (F-12, F-23)
    for (const e of enemies) {
      let spd = e.speed;
      if (e.slowTimer > 0) { e.slowTimer -= dt; spd *= e.slowFactor; }
      else { e.slowFactor = 1; }
      let move = spd * dt;
      while (move > 0 && e.wpIndex < WP.length - 1) {
        const target = WP[e.wpIndex + 1];
        const dx = target.x - e.x, dy = target.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d <= move) {
          e.x = target.x; e.y = target.y; e.dist += d; move -= d; e.wpIndex++;
        } else {
          e.x += (dx / d) * move; e.y += (dy / d) * move; e.dist += move; move = 0;
        }
      }
      if (e.wpIndex >= WP.length - 1) { e.reachedEnd = true; }
    }
    // 경로 끝 도달 → 목숨 감소
    for (const e of enemies) {
      if (e.reachedEnd) { lives -= 1; e.dead = true; }
    }

    // 타워 조준·발사 (F-07 대상선정, F-10)
    for (const t of towers) {
      t.cooldown -= dt;
      const target = pickTarget(t);
      if (target) {
        t.angle = Math.atan2(target.y - t.y, target.x - t.x);
        if (t.cooldown <= 0) {
          fireProjectile(t, target);
          t.cooldown = t.fireInterval;
        }
      }
    }

    // 발사체 이동·명중 (F-11, F-15)
    for (const p of projectiles) {
      if (!p.target || p.target.dead) { p.dead = true; continue; }
      const dx = p.target.x - p.x, dy = p.target.y - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (d <= step + p.target.radius) {
        applyHit(p);
        p.dead = true;
      } else {
        p.x += (dx / d) * step; p.y += (dy / d) * step;
      }
    }

    // 처치 정리 + 보상 (F-18)
    for (const e of enemies) {
      if (e.hp <= 0 && !e.dead) {
        e.dead = true;
        gold += e.reward;
        kills += 1;
        popups.push({ x: e.x, y: e.y, text: '+' + e.reward, life: 0.8, color: '#ffd93d' });
      }
    }
    enemies = enemies.filter((e) => !e.dead);
    projectiles = projectiles.filter((p) => !p.dead);

    // 팝업 수명
    for (const pu of popups) { pu.life -= dt; pu.y -= 24 * dt; }
    popups = popups.filter((pu) => pu.life > 0);

    // 웨이브 클리어 / 승패 판정 (F-20, F-26, F-27)
    if (lives <= 0) { endGame(false); return; }
    if (waveActive && spawnQueue.length === 0 && enemies.length === 0) {
      waveActive = false;
      waveIndex += 1;
      if (waveIndex >= TOTAL_WAVES) { endGame(true); return; }
      const bonus = WAVE_CLEAR_BONUS + waveIndex * 5;
      gold += bonus;
      nextWaveTimer = AUTO_NEXT_DELAY; // 다음 웨이브 자동 시작 카운트다운
      toast(`웨이브 클리어! 보너스 +${bonus}골드 · 곧 다음 웨이브`);
    }
    updateHUD();
  }

  // 사거리 내 가장 앞선(경로 진행이 많은) 적 선택
  function pickTarget(t) {
    let best = null, bestDist = -1;
    for (const e of enemies) {
      const d = Math.hypot(e.x - t.x, e.y - t.y);
      if (d <= t.range && e.dist > bestDist) { best = e; bestDist = e.dist; }
    }
    return best;
  }

  function fireProjectile(t, target) {
    projectiles.push({
      x: t.x, y: t.y, target, speed: t.projSpeed, damage: t.damage,
      splash: t.splash, slow: t.slow, slowDur: t.slowDur, color: t.color,
    });
  }

  function applyHit(p) {
    const hit = (e) => {
      e.hp -= p.damage;
      if (p.slow > 0) {
        e.slowTimer = Math.max(e.slowTimer, p.slowDur);
        e.slowFactor = Math.min(e.slowFactor, 1 - p.slow);
      }
    };
    if (p.splash > 0) {
      for (const e of enemies) {
        if (Math.hypot(e.x - p.target.x, e.y - p.target.y) <= p.splash) hit(e);
      }
      popups.push({ x: p.target.x, y: p.target.y, text: '💥', life: 0.4, color: '#ff9f43' });
    } else {
      hit(p.target);
    }
  }

  function endGame(won) {
    const score = computeScore();
    const best = saveBest(difficulty.key, waveIndex, score, won);
    el.resultTitle.textContent = won
      ? `🏆 ${difficulty.name} 클리어!`
      : '💀 게임 오버';
    el.resultTitle.className = won ? 'win' : 'lose';
    el.resultSummary.innerHTML =
      `<div class="rs-row"><span>난이도</span><b>${difficulty.emoji} ${difficulty.name}</b></div>` +
      `<div class="rs-row"><span>도달 웨이브</span><b>${Math.min(waveIndex + (won ? 0 : 1), TOTAL_WAVES)} / ${TOTAL_WAVES}</b></div>` +
      `<div class="rs-row"><span>처치한 적</span><b>${kills}</b></div>` +
      `<div class="rs-row"><span>남은 목숨</span><b>${Math.max(0, lives)}</b></div>` +
      `<div class="rs-row score"><span>점수</span><b>${score}</b></div>` +
      `<div class="rs-best">${difficulty.emoji} ${difficulty.name} 최고: ${best.wave}웨이브 · ${best.score}점${best.cleared ? ' · 클리어 ✓' : ''}</div>`;
    el._lastScore = score;
    show('RESULT');
  }

  // ── HUD (F-24) ──────────────────────────────────────
  function updateHUD() {
    el.gold.textContent = Math.floor(gold);
    el.lives.textContent = Math.max(0, lives);
    el.wave.textContent = `${Math.min(waveIndex + 1, TOTAL_WAVES)} / ${TOTAL_WAVES}`;
    el.score.textContent = computeScore();
    if (waveActive) {
      el.waveBtn.textContent = '⚔ 진행 중...';
      el.waveBtn.disabled = true;
    } else if (waveIndex >= TOTAL_WAVES) {
      el.waveBtn.textContent = '완료';
      el.waveBtn.disabled = true;
    } else if (nextWaveTimer > 0) {
      el.waveBtn.textContent = `▶ 다음 웨이브 (${Math.ceil(nextWaveTimer)}s · 바로 시작)`;
      el.waveBtn.disabled = false;
    } else {
      el.waveBtn.textContent = `▶ 웨이브 ${waveIndex + 1} 시작`;
      el.waveBtn.disabled = false;
    }
    refreshTowerButtons();
  }

  // ── 렌더 ────────────────────────────────────────────
  function render() {
    // 배경(잔디)
    ctx.fillStyle = '#243b1e';
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    // 설치 가능 타일 격자 (F-04)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (isBuildable(c, r)) {
          ctx.fillStyle = ((c + r) % 2 === 0) ? '#2e4a26' : '#2a4522';
          ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
        }
      }
    }

    // 경로 (F-03)
    ctx.strokeStyle = '#5a4a34';
    ctx.lineWidth = TILE * 0.82;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(WP[0].x, WP[0].y);
    for (let i = 1; i < WP.length; i++) ctx.lineTo(WP[i].x, WP[i].y);
    ctx.stroke();
    ctx.strokeStyle = '#6b5941';
    ctx.lineWidth = TILE * 0.62;
    ctx.stroke();

    // 시작/도착 표시 (가장자리에서 잘리지 않게 안쪽 정렬)
    const end = WP[WP.length - 1];
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#8fd18f';
    ctx.textAlign = 'left';
    ctx.fillText('▶ START', 8, WP[0].y - 14);
    ctx.fillStyle = '#ff8f8f';
    ctx.textAlign = 'right';
    ctx.fillText('END ▶', MAP_W - 8, end.y - 14);
    ctx.textAlign = 'center';

    // 호버 하이라이트 (F-08)
    if (hoverCell && selectedTowerType && state === 'PLAYING') {
      const { c, r } = hoverCell;
      const ok = isBuildable(c, r) && !towers.some((t) => t.col === c && t.row === r);
      ctx.fillStyle = ok ? 'rgba(120,220,120,0.35)' : 'rgba(230,80,80,0.35)';
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      // 사거리 미리보기 (F-07)
      if (ok) {
        const def = TOWER_TYPES[selectedTowerType];
        const center = tileCenter(c, r);
        drawRange(center.x, center.y, def.range * TILE, def.color);
      }
    }
    // 선택된 타워 사거리 (F-07)
    if (selectedTower) {
      drawRange(selectedTower.x, selectedTower.y, selectedTower.range, selectedTower.color);
    }

    // 타워
    for (const t of towers) drawTower(t);

    // 발사체 (F-11)
    for (const p of projectiles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.splash > 0 ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 적 (F-12, F-14)
    for (const e of enemies) drawEnemy(e);

    // 팝업 텍스트
    ctx.textAlign = 'center';
    for (const pu of popups) {
      ctx.globalAlpha = Math.max(0, pu.life);
      ctx.fillStyle = pu.color;
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(pu.text, pu.x, pu.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawRange(x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawTower(t) {
    const def = TOWER_TYPES[t.type];
    // 받침
    ctx.fillStyle = '#1b1b22';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 17, 0, Math.PI * 2);
    ctx.fill();
    // 포신
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);
    ctx.fillStyle = def.color;
    ctx.fillRect(0, -4, 20, 8);
    ctx.restore();
    // 본체
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 12, 0, Math.PI * 2);
    ctx.fill();
    // 레벨 점 (F-21)
    ctx.fillStyle = '#fff';
    for (let i = 0; i < t.level; i++) {
      ctx.beginPath();
      ctx.arc(t.x - 6 + i * 6, t.y + 15, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // 선택 표시
    if (t === selectedTower) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(t.col * TILE + 2, t.row * TILE + 2, TILE - 4, TILE - 4);
    }
  }

  function drawEnemy(e) {
    // 둔화 시 파란 테두리
    if (e.slowTimer > 0) {
      ctx.strokeStyle = '#7ec8ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.lineWidth = 0;
    // 체력바 (F-14)
    const w = e.radius * 2, h = 4;
    const hpRatio = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = '#000';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 9, w, h);
    ctx.fillStyle = hpRatio > 0.5 ? '#4dd599' : hpRatio > 0.25 ? '#ffd93d' : '#ff5d5d';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 9, w * hpRatio, h);
  }

  // ── 메인 루프 ───────────────────────────────────────
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - lastTime) / 1000) || 0;
    lastTime = now;
    if (state === 'PLAYING') {
      for (let i = 0; i < gameSpeed; i++) update(dt);
      render();
    }
  }

  // ── 입력 (F-05, F-08) ───────────────────────────────
  function canvasPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return { x: (evt.clientX - rect.left) * sx, y: (evt.clientY - rect.top) * sy };
  }
  canvas.addEventListener('mousemove', (e) => {
    const p = canvasPos(e);
    hoverCell = { c: Math.floor(p.x / TILE), r: Math.floor(p.y / TILE) };
  });
  canvas.addEventListener('mouseleave', () => { hoverCell = null; });

  // 타일 탭/클릭 처리 (마우스·터치 공통)
  function handleTap(c, r) {
    if (state !== 'PLAYING') return;
    const existing = towers.find((t) => t.col === c && t.row === r);
    if (selectedTowerType) {
      placeTower(c, r);
    } else if (existing) {
      selectedTower = (selectedTower === existing) ? null : existing;
      refreshTowerPanel();
    } else {
      selectedTower = null;
      refreshTowerPanel();
    }
  }
  canvas.addEventListener('click', (e) => {
    const p = canvasPos(e);
    handleTap(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
  });

  // 터치 조작: 손가락 위치에 사거리 미리보기/하이라이트 표시 후, 떼면 설치·선택 (F-05, F-07, F-08)
  function touchCell(touch) {
    const p = canvasPos({ clientX: touch.clientX, clientY: touch.clientY });
    return { c: Math.floor(p.x / TILE), r: Math.floor(p.y / TILE) };
  }
  canvas.addEventListener('touchstart', (e) => {
    if (state !== 'PLAYING') return;
    e.preventDefault();
    hoverCell = touchCell(e.touches[0]);
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    if (state !== 'PLAYING') return;
    e.preventDefault();
    hoverCell = touchCell(e.touches[0]);
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    if (state !== 'PLAYING') return;
    e.preventDefault();
    const cell = touchCell(e.changedTouches[0]);
    handleTap(cell.c, cell.r);
    hoverCell = null; // 손을 떼면 미리보기 해제
  }, { passive: false });
  // 우클릭으로 선택 해제
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    selectedTowerType = null;
    selectedTower = null;
    refreshTowerButtons();
    refreshTowerPanel();
  });

  // ── 버튼 이벤트 ─────────────────────────────────────
  el.startBtn.addEventListener('click', () => {
    resetGame();
    buildTowerButtons();
    updateHUD();
    refreshTowerPanel();
    show('PLAYING');
  });
  el.waveBtn.addEventListener('click', startWave);
  el.speedBtn.addEventListener('click', () => {
    gameSpeed = gameSpeed === 1 ? 2 : 1;
    el.speedBtn.textContent = gameSpeed === 1 ? '⏩ 1배속' : '⏩ 2배속';
  });
  el.retryBtn.addEventListener('click', () => {
    resetGame();
    buildTowerButtons();
    updateHUD();
    refreshTowerPanel();
    show('PLAYING');
  });
  // 결과 공유 (F-31)
  el.shareBtn.addEventListener('click', async () => {
    const score = el._lastScore || 0;
    const text = `Tower Rush [${difficulty.name}]에서 ${waveIndex}웨이브 · ${score}점 달성! 🏰`;
    const url = location.href.split('?')[0];
    const shareData = { title: 'Tower Rush', text, url };
    try {
      if (navigator.share) { await navigator.share(shareData); return; }
    } catch (e) { /* 취소 등 무시 */ }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast('결과가 클립보드에 복사됐어요!');
    } catch (e) {
      toast('공유를 지원하지 않는 환경이에요');
    }
  });

  // 키보드 단축키: 1~4 타워 선택, Space 웨이브 시작
  window.addEventListener('keydown', (e) => {
    if (state !== 'PLAYING') return;
    const idx = ['1', '2', '3', '4'].indexOf(e.key);
    if (idx >= 0 && TOWER_ORDER[idx]) {
      selectedTower = null;
      selectedTowerType = TOWER_ORDER[idx];
      refreshTowerButtons();
      refreshTowerPanel();
    } else if (e.code === 'Space') {
      e.preventDefault();
      startWave();
    }
  });

  // ── 시작 ────────────────────────────────────────────
  show('MENU');
  requestAnimationFrame(loop);
})();

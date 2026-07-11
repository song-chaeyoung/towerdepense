/* Tower Rush — 게임 데이터 정의
 * 타워/적/웨이브/맵을 데이터로 분리해 두어 콘텐츠 추가가 쉽도록 한다.
 * (docs/10 F-09 여러 타워, F-13 여러 적, F-17 웨이브 난이도)
 */

// ── 맵 ────────────────────────────────────────────────
const TILE = 48;
const COLS = 20;
const ROWS = 12;
const MAP_W = TILE * COLS; // 960
const MAP_H = TILE * ROWS; // 576

// 적이 지나가는 경로 (타일 좌표). 화면 밖 왼쪽에서 들어와 오른쪽으로 나간다. (F-03)
const PATH_WAYPOINTS = [
  [-1, 2], [3, 2], [3, 8], [8, 8], [8, 4],
  [13, 4], [13, 9], [17, 9], [17, 2], [20, 2],
];

// ── 경제 초기값 ───────────────────────────────────────
const START_GOLD = 120;
const START_LIVES = 20;
const SELL_RATIO = 0.6;          // 판매 시 환불 비율 (F-22)
const WAVE_CLEAR_BONUS = 20;     // 웨이브 클리어 보너스 (F-20)

// ── 타워 종류 ─────────────────────────────────────────
// range 는 타일 단위(픽셀 = range * TILE). (F-06, F-09)
const TOWER_TYPES = {
  arrow: {
    key: 'arrow', name: '애로우', color: '#5cc8ff',
    cost: 50, range: 2.8, damage: 10, fireInterval: 0.55,
    projSpeed: 460, splash: 0, slow: 0, slowDur: 0,
    desc: '빠른 연사 · 단일 타격',
  },
  cannon: {
    key: 'cannon', name: '캐논', color: '#ff9f43',
    cost: 110, range: 2.4, damage: 32, fireInterval: 1.4,
    projSpeed: 300, splash: 1.1, slow: 0, slowDur: 0,
    desc: '광역 폭발 · 고피해',
  },
  frost: {
    key: 'frost', name: '프로스트', color: '#b388ff',
    cost: 75, range: 2.6, damage: 6, fireInterval: 0.8,
    projSpeed: 420, splash: 0, slow: 0.5, slowDur: 1.6,
    desc: '적 둔화 · 지원',
  },
  sniper: {
    key: 'sniper', name: '스나이퍼', color: '#f857a6',
    cost: 160, range: 4.6, damage: 65, fireInterval: 1.9,
    projSpeed: 950, splash: 0, slow: 0, slowDur: 0,
    desc: '초장거리 · 저격',
  },
};
const TOWER_ORDER = ['arrow', 'frost', 'cannon', 'sniper'];

const MAX_LEVEL = 3;
// 강화 시 성능/비용 스케일 (F-21)
function upgradeCost(type, level) {
  return Math.round(TOWER_TYPES[type].cost * 0.8 * level);
}
function towerStat(type, level) {
  const t = TOWER_TYPES[type];
  const mult = 1 + (level - 1) * 0.5;      // 피해 +50%/레벨
  const rangeMult = 1 + (level - 1) * 0.12; // 사거리 +12%/레벨
  return {
    damage: t.damage * mult,
    range: t.range * TILE * rangeMult,
    fireInterval: t.fireInterval,
    projSpeed: t.projSpeed,
    splash: t.splash * TILE,
    slow: t.slow,
    slowDur: t.slowDur,
    color: t.color,
  };
}

// ── 적 종류 ───────────────────────────────────────────
const ENEMY_TYPES = {
  grunt:  { key: 'grunt',  name: '그런트', color: '#ff5d5d', hp: 46,  speed: 62,  reward: 8,  radius: 12 },
  runner: { key: 'runner', name: '러너',   color: '#ffd93d', hp: 28,  speed: 120, reward: 7,  radius: 10 },
  tank:   { key: 'tank',   name: '탱크',   color: '#a66bff', hp: 230, speed: 38,  reward: 22, radius: 16 },
  swarm:  { key: 'swarm',  name: '스웜',   color: '#4dd599', hp: 16,  speed: 90,  reward: 4,  radius: 8  },
};

// ── 웨이브 정의 (F-16, F-17) ──────────────────────────
// 각 웨이브 = 스폰 그룹 배열. group = { type, count, gap(초) }
const WAVES = [
  [{ type: 'grunt', count: 6, gap: 0.9 }],
  [{ type: 'grunt', count: 8, gap: 0.75 }],
  [{ type: 'runner', count: 10, gap: 0.5 }],
  [{ type: 'grunt', count: 8, gap: 0.7 }, { type: 'runner', count: 6, gap: 0.45 }],
  [{ type: 'tank', count: 2, gap: 1.6 }, { type: 'grunt', count: 8, gap: 0.6 }],
  [{ type: 'swarm', count: 16, gap: 0.28 }],
  [{ type: 'runner', count: 12, gap: 0.4 }, { type: 'tank', count: 2, gap: 1.3 }],
  [{ type: 'grunt', count: 12, gap: 0.5 }, { type: 'tank', count: 3, gap: 1.1 }],
  [{ type: 'swarm', count: 20, gap: 0.22 }, { type: 'runner', count: 8, gap: 0.4 }],
  [{ type: 'tank', count: 5, gap: 1.1 }, { type: 'grunt', count: 10, gap: 0.5 }],
  [{ type: 'runner', count: 18, gap: 0.3 }, { type: 'swarm', count: 18, gap: 0.22 }],
  [{ type: 'tank', count: 8, gap: 0.85 }, { type: 'grunt', count: 14, gap: 0.4 }, { type: 'runner', count: 10, gap: 0.3 }],
];
const TOTAL_WAVES = WAVES.length;

// 웨이브가 오를수록 적 체력 가중 (F-17)
function hpScaleForWave(waveIndex) {
  return 1 + waveIndex * 0.06;
}

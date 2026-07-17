/* Tower Rush — 게임 데이터 정의
 * 타워/적/웨이브/맵을 데이터로 분리해 두어 콘텐츠 추가가 쉽도록 한다.
 * (docs/10 F-09 여러 타워, F-13 여러 적, F-17 웨이브 난이도)
 */

// ── 맵 ────────────────────────────────────────────────
// 모바일 친화: 정사각형에 가까운 15x14 격자 (세로 화면에서도 타일이 크게 보임)
const TILE = 48;
const COLS = 15;
const ROWS = 14;
const MAP_W = TILE * COLS; // 720
const MAP_H = TILE * ROWS; // 672

// 적이 지나가는 경로 (타일 좌표). 좌상단에서 들어와 4개 레인을 지그재그로 지나 우하단으로 나간다. (F-03)
const PATH_WAYPOINTS = [
  [-1, 1], [12, 1], [12, 4], [2, 4], [2, 7],
  [12, 7], [12, 10], [2, 10], [2, 13], [15, 13],
];

// ── 경제 초기값 (보통 난이도 기준) ────────────────────
const START_GOLD = 120;
const START_LIVES = 20;
const SELL_RATIO = 0.6;          // 판매 시 환불 비율 (F-22)
const WAVE_CLEAR_BONUS = 20;     // 웨이브 클리어 보너스 (F-20)

// ── 난이도 ────────────────────────────────────────────
// lives/gold: 시작값, hpMul/speedMul: 적 능력 배율, rewardMul: 처치 보상 배율
// fastPack: 웨이브 3부터 빠른 적 추가 편성 (둔화·화력에 골드를 더 쓰게 압박)
const DIFFICULTIES = {
  easy:   { key: 'easy',   name: '쉬움',   emoji: '🟢', lives: 25, gold: 150, hpMul: 0.85, speedMul: 1.0,  rewardMul: 1.2,  fastPack: false, rampWaves: 4, hpGrowth: 1.15, bossMul: 1.0 },
  normal: { key: 'normal', name: '보통',   emoji: '🟡', lives: 20, gold: 120, hpMul: 1.0,  speedMul: 1.0,  rewardMul: 1.0,  fastPack: false, rampWaves: 4, hpGrowth: 1.15, bossMul: 1.0 },
  hard:   { key: 'hard',   name: '어려움', emoji: '🔴', lives: 12, gold: 100, hpMul: 1.5,  speedMul: 1.15, rewardMul: 0.9,  fastPack: true,  rampWaves: 4, hpGrowth: 1.15, bossMul: 1.0 },
  hell:   { key: 'hell',   name: '헬',     emoji: '💀', lives: 10, gold: 110, hpMul: 1.55, speedMul: 1.15, rewardMul: 0.9,  fastPack: true,  rampWaves: 4, hpGrowth: 1.15, bossMul: 1.4 },
};
const DIFFICULTY_ORDER = ['easy', 'normal', 'hard', 'hell'];

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
  grunt:  { key: 'grunt',  name: '그런트', color: '#ff5d5d', hp: 46,  speed: 62,  reward: 8,   radius: 12 },
  runner: { key: 'runner', name: '러너',   color: '#ffd93d', hp: 28,  speed: 120, reward: 7,   radius: 10 },
  tank:   { key: 'tank',   name: '탱크',   color: '#a66bff', hp: 230, speed: 38,  reward: 22,  radius: 16 },
  swarm:  { key: 'swarm',  name: '스웜',   color: '#4dd599', hp: 16,  speed: 90,  reward: 4,   radius: 8  },
  boss:   { key: 'boss',   name: '보스',   color: '#ff3860', hp: 400, speed: 32,  reward: 100, radius: 20 },
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
  // 최종 웨이브: 보스 + 호위
  [{ type: 'boss', count: 2, gap: 3.0 }, { type: 'tank', count: 6, gap: 0.9 }, { type: 'grunt', count: 12, gap: 0.4 }, { type: 'runner', count: 10, gap: 0.3 }],
];
const TOTAL_WAVES = WAVES.length;

// 웨이브가 오를수록 적 체력 지수 가중 (F-17). growth는 난이도별 (기본 1.15)
function hpScaleForWave(waveIndex, growth) {
  return Math.pow(growth || 1.15, waveIndex);
}
// 후반 웨이브 속도 가산 (+2%/웨이브) — 둔화·배치의 중요도 상승
function speedScaleForWave(waveIndex) {
  return 1 + waveIndex * 0.02;
}
// 처치 보상 테이퍼 (-3%/웨이브, 하한 60%) — 후반 골드 눈덩이 완화
function rewardScaleForWave(waveIndex) {
  return Math.max(0.6, 1 - waveIndex * 0.03);
}

const BASE = [
  'S..#...',
  '##.#.#.',
  '...#.#K',
  '.###.#.',
  '.....#.',
  '.X####.',
  '...X..E'
];

export const MAZE_SIZE = 7;
export const MAZE_MAPS = [
  BASE,
  BASE.map(row => [...row].reverse().join('')),
  BASE[0].split('').map((_, col) => BASE.map(row => row[col]).reverse().join(''))
];
export const MAZE_DIRECTIONS = {
  up: [-1, 0], right: [0, 1], down: [1, 0], left: [0, -1]
};
export const mazeTile = (state, cell) => MAZE_MAPS[state.map]?.[Math.floor(cell / MAZE_SIZE)]?.[cell % MAZE_SIZE];
export const mazeStart = state => MAZE_MAPS[state.map].join('').indexOf('S');

export function createMaze(random = Math.random) {
  const state = { kind: 'maze', map: Math.floor(random() * MAZE_MAPS.length), cell: 0, hasKey: false, won: false };
  state.cell = mazeStart(state);
  return state;
}

export function validMaze(state) {
  return state.kind === 'maze' && Number.isInteger(state.map) && Boolean(MAZE_MAPS[state.map]) &&
    Number.isInteger(state.cell) && state.cell >= 0 && state.cell < MAZE_SIZE ** 2 &&
    ['S', '.', 'K', 'E'].includes(mazeTile(state, state.cell)) && typeof state.hasKey === 'boolean' && typeof state.won === 'boolean';
}

export function mazeNeighbor(state, direction) {
  const delta = MAZE_DIRECTIONS[direction];
  if (!delta) return -1;
  const row = Math.floor(state.cell / MAZE_SIZE) + delta[0];
  const col = state.cell % MAZE_SIZE + delta[1];
  if (row < 0 || row >= MAZE_SIZE || col < 0 || col >= MAZE_SIZE) return -1;
  const cell = row * MAZE_SIZE + col;
  return mazeTile(state, cell) === '#' ? -1 : cell;
}

export function moveMaze(state, direction) {
  if (state.won) return 'done';
  const next = mazeNeighbor(state, direction);
  if (next < 0) return 'wall';
  const tile = mazeTile(state, next);
  if (tile === 'X') {
    state.cell = mazeStart(state); state.hasKey = false;
    return 'trap';
  }
  if (tile === 'E' && !state.hasKey) return 'locked';
  state.cell = next;
  if (tile === 'K' && !state.hasKey) { state.hasKey = true; return 'key'; }
  if (tile === 'E') { state.won = true; return 'win'; }
  return 'move';
}

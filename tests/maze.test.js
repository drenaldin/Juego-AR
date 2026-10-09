import test from 'node:test';
import assert from 'node:assert/strict';
import { MAZE_MAPS, createMaze, validMaze, moveMaze, mazeStart } from '../js/maze.js';

function route(map, from, to, blocked = '#X') {
  const queue = [[from, []]], seen = new Set([from]);
  while (queue.length) {
    const [cell, steps] = queue.shift();
    if (cell === to) return steps;
    const row = Math.floor(cell / 7), col = cell % 7;
    for (const [direction, dr, dc] of [['up',-1,0], ['right',0,1], ['down',1,0], ['left',0,-1]]) {
      const nr = row + dr, nc = col + dc;
      if (nr < 0 || nr >= 7 || nc < 0 || nc >= 7 || blocked.includes(map[nr][nc])) continue;
      const next = nr * 7 + nc;
      if (!seen.has(next)) { seen.add(next); queue.push([next, [...steps, direction]]); }
    }
  }
  return null;
}

test('cada variante tiene un camino sin trampas para conseguir la llave y salir', () => {
  MAZE_MAPS.forEach((map, index) => {
    const flat = map.join('');
    for (const symbol of ['S','K','E']) assert.equal([...flat].filter(tile => tile === symbol).length, 1);
    const state = createMaze(() => (index + .1) / MAZE_MAPS.length);
    const first = route(map, flat.indexOf('S'), flat.indexOf('K'), '#XE');
    const last = route(map, flat.indexOf('K'), flat.indexOf('E'));
    assert.ok(first?.length && last?.length);
    for (const direction of first) moveMaze(state, direction);
    assert.equal(state.hasKey, true);
    let result;
    for (const direction of last) result = moveMaze(state, direction);
    assert.equal(result, 'win');
    assert.equal(state.won, true);
    assert.equal(moveMaze(state, 'left'), 'done');
  });
});

test('paredes y bordes no mueven la ficha; la salida exige la llave', () => {
  const state = createMaze(() => 0);
  assert.equal(moveMaze(state, 'up'), 'wall');
  assert.equal(moveMaze(state, 'left'), 'wall');
  assert.equal(moveMaze(state, 'down'), 'wall');
  assert.equal(state.cell, mazeStart(state));
  state.cell = 41;
  assert.equal(moveMaze(state, 'down'), 'locked');
  assert.equal(state.cell, 41);
  assert.equal(state.won, false);
});

test('una trampa quita la llave y vuelve al inicio sin cambiar el mapa', () => {
  const state = createMaze(() => 0);
  state.cell = 29; state.hasKey = true;
  assert.equal(moveMaze(state, 'down'), 'trap');
  assert.equal(state.cell, mazeStart(state));
  assert.equal(state.hasKey, false);
  assert.equal(state.map, 0);
});

test('el estado del laberinto se puede guardar y distingue las partidas de la balanza anterior', () => {
  const state = createMaze(() => 0);
  state.cell = 20; state.hasKey = true;
  assert.ok(validMaze(JSON.parse(JSON.stringify(state))));
  assert.equal(validMaze({order:['Pluma','Llave','Campana'],weighings:[]}), false);
  assert.equal(validMaze({...state,cell:3}), false);
  assert.equal(validMaze({...state,cell:99}), false);
});

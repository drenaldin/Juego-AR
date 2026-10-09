import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, finishStage, unlockMarker, useHint, scoreRun, recordResult, leaderboard, emptyStore, readStore, writeStore, runKey, guardianCorrect, shuffled, STORAGE_KEY } from '../js/engine.js';

function complete(run, finish = 1201000) {
  for (const marker of [1, 2, 3, 4, 5, 6, 6, 1]) {
    assert.equal(unlockMarker(run, marker), true);
    assert.equal(finishStage(run, 'Evidencia', finish), true);
  }
  return run;
}

test('el recorrido exige el marcador correcto y el regreso al primero', () => {
  const run = createRun('Bruno', false, 1000);
  assert.equal(unlockMarker(run, 3), false);
  assert.equal(finishStage(run, 'No debe avanzar'), false);
  for (let marker = 1; marker <= 6; marker++) {
    unlockMarker(run, marker); finishStage(run, 'Evidencia');
  }
  assert.equal(run.stage, 6);
  assert.equal(run.solved.length, 6);
  assert.equal(finishStage(run, 'No puede saltar la habitación'), false);
  unlockMarker(run, 6); finishStage(run, 'Inscripción');
  assert.equal(run.stage, 7);
  assert.equal(unlockMarker(run, 6), false);
  assert.equal(finishStage(run, 'Hace falta escanear de nuevo'), false);
  unlockMarker(run, 1); finishStage(run, 'Cofre', 1201000);
  assert.equal(run.solved.length, 7);
  assert.equal(finishStage(run, 'Duplicado'), false);
  assert.equal(unlockMarker(run, 1), false);
});

test('puntaje final: pruebas, cofre, bono de tiempo y penalizaciones', () => {
  const run = complete(createRun('Maxi', false, 1000));
  assert.equal(scoreRun(run), 1180); // 1000 + (300 - 120)
  run.errors = 3; run.hints = 2;
  assert.equal(scoreRun(run), 1020);
  run.errors = 999;
  assert.equal(scoreRun(run), 0);
});

test('las ayudas requieren desbloqueo y se cobran una sola vez por nivel', () => {
  const run = createRun('Gonzalo');
  assert.equal(useHint(run), false);
  unlockMarker(run, 1);
  assert.equal(useHint(run), true);
  assert.equal(useHint(run), true);
  assert.equal(useHint(run), false);
  assert.equal(run.hints, 2);
});

test('solo las partidas AR completas ingresan una vez al ranking', () => {
  const store = emptyStore();
  assert.equal(recordResult(store, createRun('Bruno')), false);
  assert.equal(recordResult(store, complete(createRun('Bruno', true, 1000))), false);
  const run = complete(createRun('Bruno', false, 1000));
  assert.equal(recordResult(store, run), true);
  assert.equal(recordResult(store, run), false);
  assert.equal(store.records.length, 1);
});

test('ranking por mejor puntaje de apodo, empate por tiempo y conteo de partidas', () => {
  const base = { errors: 0, hints: 0, finishedAt: 1 };
  const rows = leaderboard([
    { ...base, name: ' Bruno ', score: 800, seconds: 600 },
    { ...base, name: 'bruno', score: 1000, seconds: 900 },
    { ...base, name: 'Maxi', score: 1000, seconds: 800 },
    { ...base, name: 'Gonzalo', score: 900, seconds: 700 }
  ]);
  assert.deepEqual(rows.map(row => row.name), ['Maxi', 'bruno', 'Gonzalo']);
  assert.equal(rows[1].attempts, 2);
});

test('guardado conserva pruebas, bloqueo y estado de memoria al recargar', () => {
  let stored;
  const storage = { setItem(k, v) { assert.equal(k, STORAGE_KEY); stored = v; }, getItem() { return stored; } };
  const store = emptyStore(), run = createRun(' Bruno  A ', false, 1000);
  run.puzzles[3] = { lockUntil: 9999999 };
  run.puzzles[2] = { sequence: [0, 1, 2, 2, 3] };
  unlockMarker(run, 1); finishStage(run, 'Llave obtenida');
  store.runs[runKey(run.name, false)] = run;
  assert.equal(writeStore(storage, store), true);
  assert.deepEqual(readStore(storage).data, store);
  assert.equal(runKey('BRUNO A', false), runKey(' Bruno  A ', false));
  assert.notEqual(runKey('Bruno', true), runKey('Bruno', false));
});

test('almacenamiento bloqueado y datos inválidos no rompen el juego', () => {
  assert.equal(writeStore(null, emptyStore()), false);
  assert.ok(readStore(null).warning);
  assert.ok(readStore({ getItem: () => '{not json' }).warning);
  assert.equal(Object.keys(readStore({ getItem: () => JSON.stringify({ version: 1, runs: { invalid: {} }, records: [] }) }).data.runs).length, 0);
});

test('las partidas que completaron la balanza conservan su contraseña y puntaje', () => {
  const run = createRun('Veterano', false, 1000);
  delete run.finalObject;
  Object.assign(run, {
    stage: 5, solved: [0, 1, 2, 3, 4], unlocked: [0, 1, 2, 3, 4],
    lightest: 'Pluma', errors: 2, hints: 1,
    evidence: [{ stage: 4, text: 'El objeto más liviano es Pluma.' }]
  });
  const store = emptyStore(), key = runKey(run.name, false);
  store.runs[key] = run;
  let stored = JSON.stringify(store);
  const storage = { getItem: () => stored, setItem: (_, value) => { stored = value; } };
  const migrated = readStore(storage).data;
  assert.equal(migrated.runs[key].finalObject, 'Pluma');
  assert.equal(migrated.runs[key].stage, 5);
  assert.equal(scoreRun(migrated.runs[key]), scoreRun(run));
  assert.equal(guardianCorrect('7', 'diamond', 'Pluma', migrated.runs[key].finalObject), true);
  assert.match(migrated.runs[key].evidence[0].text, /Objeto para el guardián: Pluma/);
  writeStore(storage, migrated);
  assert.deepEqual(readStore(storage).data, migrated, 'La pista no se agrega dos veces al recargar');
});

test('contraseña combina la evidencia fija y el objeto obtenido en el laberinto', () => {
  assert.equal(guardianCorrect('7', 'diamond', 'Pluma', 'Pluma'), true);
  assert.equal(guardianCorrect('7', 'circle', 'Pluma', 'Pluma'), false);
  assert.equal(guardianCorrect('7', 'diamond', 'Llave', 'Pluma'), false);
  assert.equal(guardianCorrect('8', 'diamond', 'Pluma', 'Pluma'), false);
});

test('barajar preserva los tres objetos sin modificar el original', () => {
  const items = ['Llave', 'Campana', 'Pluma'];
  const result = shuffled(items, () => 0);
  assert.deepEqual([...result].sort(), [...items].sort());
  assert.deepEqual(items, ['Llave', 'Campana', 'Pluma']);
});

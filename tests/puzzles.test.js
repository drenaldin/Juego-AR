import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { createRun } from '../js/engine.js';
import { mountPuzzle } from '../js/puzzles.js';
import { createMaze } from '../js/maze.js';

function setup(t, stage, state = {}) {
  const { window, document } = parseHTML('<html><body><div id="puzzle"></div></body></html>');
  const before = new Map();
  const globals = { document, requestAnimationFrame: callback => { frame = callback; return 1; }, cancelAnimationFrame: () => { frame = null; } };
  let now = 0, frame = null, nextId = 0;
  const timers = new Map();
  for (const [key, value] of Object.entries(globals)) { before.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { value, writable: true, configurable: true }); }
  t.mock.method(globalThis, 'setTimeout', (fn, delay) => { const id = ++nextId; timers.set(id, { fn, at: now + delay }); return id; });
  t.mock.method(globalThis, 'clearTimeout', id => timers.delete(id));
  t.mock.method(Date, 'now', () => now);
  t.mock.method(performance, 'now', () => now);
  // Linkedom expone select.value de solo lectura; este adaptador reproduce el DOM de navegador.
  const selectProto = window.HTMLSelectElement.prototype;
  const valueDescriptor = Object.getOwnPropertyDescriptor(selectProto, 'value');
  Object.defineProperty(selectProto, 'value', { configurable: true,
    get() { return this.querySelector('option[selected]')?.value ?? this.querySelector('option')?.value ?? ''; },
    set(value) { this.querySelectorAll('option').forEach(option => { if (option.value === value) option.setAttribute('selected', ''); else option.removeAttribute('selected'); }); }
  });
  const run = createRun('Prueba', true, 0); run.stage = stage; run.puzzles[stage] = state;
  const host = document.querySelector('#puzzle');
  let solved = 0, errors = 0, evidence;
  let dispose = mountPuzzle(host, { run, save() {}, feedback() {}, effect() {},
    fail() { errors++; run.errors++; }, solve(text) { solved++; evidence = text; } });
  t.after(() => {
    dispose(); Object.defineProperty(selectProto, 'value', valueDescriptor);
    for (const [key, descriptor] of before) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  });
  const q = selector => { const node = host.querySelector(selector); assert.ok(node, `Existe ${selector}`); return node; };
  return {
    run, q, get solved() { return solved; }, get errors() { return errors; }, get evidence() { return evidence; },
    click(selector) { const node = q(selector); assert.ok(!node.disabled, `${selector} habilitado`); node.click(); },
    submit(selector) { q(selector).dispatchEvent(new window.Event('submit', { cancelable: true })); },
    key(key) { const event = new window.Event('keydown', { cancelable: true }); event.key = key; q('#maze-board').dispatchEvent(event); },
    frame(time) { now = time; const callback = frame; frame = null; callback?.(time); },
    advance(ms) {
      const target = now + ms;
      while (true) {
        const entry = [...timers].filter(([, v]) => v.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!entry) break;
        now = entry[1].at; timers.delete(entry[0]); entry[1].fn();
      }
      now = target;
    },
    dispose() { dispose(); dispose = () => {}; }
  };
}

test('llave: falla fuera de zona, aplica espera y acepta dentro de zona', t => {
  const p = setup(t, 0);
  p.frame(1000); p.click('#stop-key');
  assert.equal(p.errors, 1); assert.equal(p.q('#stop-key').disabled, true);
  p.advance(900); p.frame(2800); p.click('#stop-key');
  assert.equal(p.solved, 1);
});

test('reloj: exige observar señal antes de detener en la hora correcta', t => {
  const p = setup(t, 1);
  assert.equal(p.q('#clock-stop').disabled, true);
  p.click('#clock-play'); p.advance(5200);
  p.frame(1200); p.click('#clock-stop');
  assert.equal(p.errors, 1); assert.equal(p.q('#clock-stop').disabled, true);
  p.click('#clock-play'); p.advance(5200);
  p.frame(11700); // 18 ticks: hora 7.
  p.click('#clock-stop'); assert.equal(p.solved, 1);
});

test('puertas: equivocarse cambia el intento; repetir correctamente lo resuelve', t => {
  const p = setup(t, 2, { sequence: [0, 1, 2, 3, 2] });
  p.click('#sequence-play'); p.advance(5000);
  p.click('[data-door="1"]'); assert.equal(p.errors, 1);
  assert.equal(p.q('[data-door="0"]').disabled, true);
  p.click('#sequence-play'); p.advance(5000);
  for (const index of p.run.puzzles[2].sequence) p.click(`[data-door="${index}"]`);
  p.advance(500); assert.equal(p.solved, 1);
});

test('archivo: un fallo bloquea todos los botones por diez segundos', t => {
  const p = setup(t, 3);
  p.click('[data-answer="A"]'); assert.equal(p.errors, 1);
  assert.equal(p.run.puzzles[3].lockUntil, 10000);
  p.advance(9000); assert.equal(p.q('[data-answer="B"]').disabled, true);
  p.advance(1000); p.click('[data-answer="B"]'); assert.equal(p.solved, 1);
});

test('laberinto: las flechas llevan hasta la llave y la salida guarda la pista del guardián', t => {
  const p = setup(t, 4, {...createMaze(() => 0), reward:'Campana'});
  p.key('ArrowUp'); assert.equal(p.errors, 0);
  const route = ['right','right','down','down','left','left','down','down','right','right','right','right','up','up','up','up','right','right','down','down'];
  for (const direction of route) p.click(`[data-move="${direction}"]`);
  assert.equal(p.run.puzzles[4].hasKey, true);
  assert.match(p.q('#maze-key-status').textContent, /Llave conseguida/);
  for (let i = 0; i < 4; i++) p.click('[data-move="down"]');
  assert.equal(p.solved, 1);
  assert.equal(p.run.finalObject, 'Campana');
  assert.match(p.evidence, /Objeto para el guardián: Campana/);
  p.key('ArrowLeft'); assert.equal(p.solved, 1);
});

test('laberinto: una trampa cobra un error y permite volver a intentar', t => {
  const p = setup(t, 4, {...createMaze(() => 0), cell:29, hasKey:true, reward:'Pluma'});
  p.click('[data-move="down"]');
  assert.equal(p.errors, 1);
  assert.equal(p.run.puzzles[4].cell, 0);
  assert.equal(p.run.puzzles[4].hasKey, false);
  assert.equal(p.run.puzzles[4].reward, 'Pluma');
  p.key('ArrowRight');
  assert.equal(p.run.puzzles[4].cell, 1);
  assert.equal(p.errors, 1);
});

test('laberinto: reemplaza una balanza pendiente sin cobrar errores', t => {
  const p = setup(t, 4, {order:['Pluma','Llave','Campana'],weighings:[]});
  assert.equal(p.run.puzzles[4].kind, 'maze');
  assert.equal(p.run.puzzles[4].order, undefined);
  assert.equal(p.errors, 0);
});

test('laberinto: una partida guardada mantiene la llave y el objeto de recompensa', t => {
  const p = setup(t, 4, {...createMaze(() => 0), cell:20, hasKey:true, reward:'Pluma'});
  assert.match(p.q('#maze-key-status').textContent, /Llave conseguida/);
  for (let i = 0; i < 4; i++) p.click('[data-move="down"]');
  assert.equal(p.solved, 1);
  assert.equal(p.run.finalObject, 'Pluma');
});

test('guardián: dos errores activan memoria y luego habilitan la contraseña', t => {
  const p = setup(t, 5); p.run.finalObject = 'Pluma';
  p.submit('#guardian-answer'); p.submit('#guardian-answer');
  assert.equal(p.errors, 2); assert.equal(p.run.puzzles[5].penalty, true);
  p.click('#sequence-play'); p.advance(3500);
  for (const index of p.run.puzzles[5].sequence) p.click(`[data-door="${index}"]`);
  p.advance(350); assert.equal(p.run.puzzles[5].penalty, false);
  p.q('#guardian-hour').value = '7'; p.q('#guardian-symbol').value = 'diamond'; p.q('#guardian-object').value = 'Pluma';
  p.submit('#guardian-answer'); assert.equal(p.solved, 1);
});

test('habitación: registra la inscripción; regreso tiene una zona más estrecha', t => {
  const room = setup(t, 6); room.click('#return-start'); assert.equal(room.solved, 1); room.dispose();
});

test('regreso: el mismo punto que bastaba al inicio ya no alcanza', t => {
  const p = setup(t, 7);
  p.frame(2600); p.click('#stop-key'); assert.equal(p.errors, 1);
  p.advance(900); p.frame(7000); p.click('#stop-key'); assert.equal(p.solved, 1);
});

test('salir cancela la reproducción pendiente y no resuelve en segundo plano', t => {
  const p = setup(t, 2, { sequence: [0, 1, 2, 3, 2] });
  p.click('#sequence-play'); p.dispose(); p.advance(20000);
  assert.equal(p.solved, 0); assert.equal(p.errors, 0);
});

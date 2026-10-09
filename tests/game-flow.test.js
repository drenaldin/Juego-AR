import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { createRun, emptyStore, runKey, STORAGE_KEY } from '../js/engine.js';

let instance = 0;
async function setup(t, runs = []) {
  const { window, document } = parseHTML(readFileSync(new URL('../index.html', import.meta.url), 'utf8'));
  const state = emptyStore();
  for (const run of runs) state.runs[runKey(run.name, run.practice)] = run;
  const storage = new Map([[STORAGE_KEY, JSON.stringify(state)]]);
  window.location = { origin: 'https://example.test' };
  window.isSecureContext = true;
  window.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  window.scrollTo = () => {};
  let nextFrame = null, stopped = 0;
  const previous = new Map();
  for (const [key, value] of Object.entries({
    window, document, navigator: { mediaDevices: { getUserMedia() {} } },
    requestAnimationFrame: callback => { nextFrame = callback; return 1; },
    cancelAnimationFrame: () => { nextFrame = null; }
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  t.mock.method(performance, 'now', () => 0);
  t.mock.method(globalThis, 'setInterval', () => 1);
  t.mock.method(globalThis, 'setTimeout', () => 1);
  t.mock.method(globalThis, 'clearTimeout', () => {});
  const q = selector => document.querySelector(selector);
  const scrolled = [];
  q('#ar-container').getBoundingClientRect = () => ({ width: 354, height: 265.5 });
  q('#player-name').reportValidity = () => true;
  for (const selector of ['#station-title', '#ranking-title', '#camera-start']) q(selector).focus = () => {};
  for (const selector of ['.puzzle-card', '.scanner-pane', '#ranking-panel']) q(selector).scrollIntoView = () => scrolled.push(selector);
  q('#result-dialog').showModal = function () { this.open = true; };
  q('#result-dialog').close = function () { this.open = false; };
  const selectProto = window.HTMLSelectElement.prototype;
  const selectValue = Object.getOwnPropertyDescriptor(selectProto, 'value');
  Object.defineProperty(selectProto, 'value', {
    configurable: true,
    get() { return this.querySelector('option[selected]')?.value ?? this.querySelector('option')?.value ?? ''; },
    set(value) { this.querySelectorAll('option').forEach(option => option.toggleAttribute('selected', option.value === value)); }
  });
  t.after(() => {
    q('#leave-game').click();
    Object.defineProperty(selectProto, 'value', selectValue);
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  await import(`../js/game.js?test=${++instance}`);
  return {
    q, scrolled, get stopped() { return stopped; },
    saved(name, practice = false) { return JSON.parse(storage.get(STORAGE_KEY)).runs[runKey(name, practice)]; },
    start(name, practice = false) {
      q('#player-name').value = name;
      if (practice) q('#practice-start').click();
      else q('#start-form').dispatchEvent(new window.Event('submit', { cancelable: true }));
    },
    camera() {
      q('#camera-start').click();
      const frame = q('iframe'); assert.ok(frame);
      const source = { postMessage() {}, stopARCamera() { stopped++; } };
      Object.defineProperty(frame, 'contentWindow', { value: source });
      const send = (type, data = {}) => {
        const event = new window.Event('message');
        Object.assign(event, { source, origin: window.location.origin, data: { channel: 'treasure-ar', type, ...data } });
        window.dispatchEvent(event);
      };
      send('ready', { width: 480, height: 640 });
      return marker => send('found', { marker });
    },
    frame(time) { nextFrame?.(time); },
    submit(selector) { q(selector).dispatchEvent(new window.Event('submit', { cancelable: true })); }
  };
}

test('reconocer el marcador apaga la cámara y lleva a la actividad; el siguiente escaneo es manual', async t => {
  const p = await setup(t);
  p.start('renitos');
  const scan = p.camera();
  scan(2);
  assert.ok(p.q('iframe'), 'Un marcador incorrecto permite seguir buscando');
  assert.equal(p.saved('renitos').errors, 0);
  scan(1);
  assert.equal(p.stopped, 1);
  assert.equal(p.q('iframe'), null);
  assert.equal(p.q('.scanner-pane').hidden, true);
  assert.ok(p.q('.play-grid').classList.contains('activity-open'));
  assert.equal(p.scrolled.at(-1), '.puzzle-card');
  assert.ok(p.q('#stop-key'));
  scan(1);
  assert.deepEqual(p.saved('renitos').unlocked, [0]);
  p.frame(2800); p.q('#stop-key').click();
  assert.equal(p.saved('renitos').stage, 1);
  assert.equal(p.q('.scanner-pane').hidden, false);
  assert.equal(p.q('iframe'), null, 'La cámara no se vuelve a prender sola');
  assert.equal(p.q('#stop-key'), null, 'No quedan botones de la actividad anterior');
  assert.equal(p.q('#camera-start').textContent, 'Escanear marcador 02');
  assert.equal(p.scrolled.at(-1), '.scanner-pane');
  p.camera()(2);
  assert.equal(p.stopped, 2);
  assert.ok(p.q('#clock-play'));
  p.q('#leave-game').click();
  p.start('renitos');
  assert.equal(p.q('.scanner-pane').hidden, true);
  assert.equal(p.q('iframe'), null);
  assert.equal(p.scrolled.at(-1), '.puzzle-card');
  assert.ok(p.q('#clock-play'), 'Se retoma la actividad sin volver a escanear');
  assert.equal(p.q('#help-panel').hidden, false);
  assert.equal(p.q('.sidebar').hidden, true);
});

test('guardián abre la nota sin otro escaneo y el cofre vuelve a pedir el marcador 01', async t => {
  const run = createRun('Finalista');
  Object.assign(run, { stage: 5, solved: [0,1,2,3,4], unlocked: [0,1,2,3,4], lightest: 'Pluma' });
  const p = await setup(t, [run]);
  p.start('Finalista'); p.camera()(6);
  p.q('#guardian-hour').value = '7';
  p.q('#guardian-symbol').value = 'diamond';
  p.q('#guardian-object').value = 'Pluma';
  p.submit('#guardian-answer');
  assert.equal(p.saved('Finalista').stage, 6);
  assert.ok(p.saved('Finalista').unlocked.includes(6));
  assert.equal(p.q('.scanner-pane').hidden, true);
  assert.equal(p.q('iframe'), null);
  p.q('#return-start').click();
  assert.equal(p.saved('Finalista').stage, 7);
  assert.equal(p.q('.scanner-pane').hidden, false);
  assert.equal(p.q('#camera-start').textContent, 'Escanear marcador 01');
  p.camera()(1); p.frame(3000); p.q('#stop-key').click();
  assert.ok(p.saved('Finalista').finishedAt);
  assert.equal(p.q('.scanner-pane').hidden, true);
  assert.equal(p.q('iframe'), null);
  assert.equal(p.q('#result-dialog').open, true);
  p.q('#result-ranking').click();
  assert.equal(p.q('.sidebar').hidden, false);
  assert.match(p.q('#ranking-body').textContent, /Finalista/);
});

test('práctica usa el mismo cambio entre escaneo y actividad sin abrir cámara', async t => {
  const p = await setup(t);
  p.start('Prueba', true);
  p.q('#practice-markers button').click();
  assert.equal(p.q('.scanner-pane').hidden, true);
  assert.equal(p.q('iframe'), null);
  assert.equal(p.scrolled.at(-1), '.puzzle-card');
  p.frame(2800); p.q('#stop-key').click();
  assert.equal(p.q('.scanner-pane').hidden, false);
  assert.equal(p.q('#practice-controls').hidden, false);
  assert.equal(p.q('iframe'), null);
});

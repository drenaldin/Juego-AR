import { STATIONS } from './story.js';
import { createRun, cleanName, runKey, elapsedSeconds, scoreRun, unlockMarker, finishStage, useHint, readStore, writeStore, recordResult, leaderboard } from './engine.js';
import { mountPuzzle } from './puzzles.js';
import { createCamera } from './camera.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let storage;
try { storage = window.localStorage; } catch { storage = null; }
const loaded = readStore(storage);
let store = loaded.data;
let run = null;
let cleanupPuzzle = () => {};
let mountedStage = null;
let currentView = 'home';
let cameraState = 'off';
let cameraTimeout;
let writeOK = true;
const visibleMarkers = new Set();
const camera = createCamera({
  container: $('#ar-container'),
  onReady() {
    if (currentView !== 'play' || run?.practice) { stopCamera(); return; }
    clearTimeout(cameraTimeout); cameraState = 'ready';
    $('.scanner-viewport').classList.add('camera-active');
    renderGame();
  },
  onError: cameraError,
  onFound(marker) {
    visibleMarkers.add(marker);
    if (!run?.practice) scanMarker(marker);
  },
  onLost(marker) { visibleMarkers.delete(marker); }
});
const formatTime = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

function warning(text) { $('#storage-warning').textContent = text; $('#storage-warning').hidden = !text; }
if (loaded.warning) warning(loaded.warning);

function save() {
  if (run) store.runs[runKey(run.name, run.practice)] = run;
  writeOK = writeStore(storage, store);
  if (!writeOK) warning('El navegador no permite guardar. Esta partida y su puntaje se perderán al cerrar la página.');
}

function feedback(text, success = false) {
  $('#feedback').textContent = text;
  $('#feedback').classList.toggle('success', success);
}

function cleanup() { cleanupPuzzle(); cleanupPuzzle = () => {}; mountedStage = null; }

function showView(view) {
  if (currentView === 'play' && view !== 'play') { stopCamera(); cleanup(); save(); }
  currentView = view;
  $$('.view').forEach(el => el.hidden = el.id !== `${view}-view`);
  $('.sidebar').hidden = view === 'play';
  $('#main').classList.toggle('is-playing', view === 'play');
  renderRanking();
  if (view === 'play') renderGame();
  window.scrollTo({ top: 0 });
}

function updateStats() {
  if (!run) return;
  $('#live-score').textContent = scoreRun(run).toLocaleString('es-UY');
  $('#live-time').textContent = formatTime(elapsedSeconds(run));
  $('#live-errors').textContent = run.errors;
  $('#live-hints').textContent = run.hints;
}

function renderHints() {
  const station = STATIONS[run.stage];
  const level = run.hintLevels[run.stage] ?? 0;
  $('#hint-panel').hidden = run.finishedAt || !run.unlocked.includes(run.stage) || !station.hints.length;
  $('#hint-text').replaceChildren(...station.hints.slice(0, level).map(text => {
    const p = document.createElement('p'); p.textContent = text; return p;
  }));
  $('#hint-button').hidden = level >= station.hints.length;
  $('#hint-button').textContent = level ? 'Pedir otra ayuda (−50 puntos)' : 'Pedir ayuda (−50 puntos)';
}

function renderNotebook() {
  const items = run.evidence.map(e => {
    const p = document.createElement('p'), b = document.createElement('b');
    b.textContent = String(e.stage + 1).padStart(2, '0');
    p.append(b, document.createTextNode(e.text)); return p;
  });
  if (!items.length) {
    const p = document.createElement('p');
    p.textContent = run.unlocked.includes(run.stage)
      ? 'Ya reconocimos el marcador. Resolvé la prueba de arriba para guardar tu primera pista acá.'
      : run.practice
        ? 'Para conseguir tu primera pista, tocá 01 en los botones del escáner y resolvé la prueba que se desbloquea.'
        : 'Tu primera pista se guarda acá al resolver una prueba. Activá la cámara, enfocá el marcador 01 impreso y seguí la consigna que se desbloquea arriba.';
    items.push(p);
  }
  $('#evidence-list').replaceChildren(...items);
}

function updateARObjects() {
  if (run && cameraState === 'ready') camera.setState(run.stage, Boolean(run.finishedAt));
}

function arEffect(type, value) {
  if (cameraState === 'ready') camera.effect(type, value);
}

function renderGame() {
  if (!run) return;
  const station = STATIONS[run.stage];
  $('#player-label').textContent = `Jugador: ${run.name}`;
  $('#mode-label').textContent = run.practice ? 'Práctica' : 'Con cámara';
  $('#station-number').textContent = `Etapa ${run.stage + 1} de 8 · Marcador ${station.marker}`;
  $('#station-title').textContent = station.title;
  $('#station-subtitle').textContent = station.subtitle;
  $('#station-intro').textContent = station.intro;
  $('#scan-instruction').textContent = run.finishedAt ? 'El cofre está abierto.' : `Apuntá al marcador ${String(station.marker).padStart(2, '0')}`;
  $('#scanner-caption').textContent = run.practice ? 'Práctica sin cámara' : 'Cámara';
  $('#camera-start').hidden = run.practice || cameraState === 'ready';
  $('#camera-start').disabled = cameraState === 'loading';
  $('#camera-stop').hidden = run.practice || cameraState !== 'ready';
  $('#practice-controls').hidden = !run.practice || Boolean(run.finishedAt);
  $('#camera-status').textContent = run.practice ? 'Los escaneos se simulan con los botones de abajo.' : cameraState === 'ready' ? 'Enfocá el marcador completo dentro del visor.' : cameraState === 'loading' ? 'Cargando la cámara… Permití su uso cuando el navegador lo solicite.' : 'Activá la cámara para reconocer los marcadores.';
  $('#progress-track').replaceChildren(...STATIONS.map((s, i) => {
    const li = document.createElement('li'); li.textContent = String(i + 1).padStart(2, '0');
    li.title = s.title; li.className = i < run.stage || run.finishedAt ? 'done' : i === run.stage ? 'current' : '';
    if (i === run.stage && !run.finishedAt) li.setAttribute('aria-current', 'step'); return li;
  }));
  renderNotebook(); renderHints(); updateStats(); updateARObjects();
  const unlocked = run.unlocked.includes(run.stage);
  $('#locked-message').hidden = unlocked || Boolean(run.finishedAt);
  const previous = run.stage > 0 ? STATIONS[run.stage - 1].next : 'Encontrá el primer cartel del recorrido.';
  $('#locked-message').textContent = `${previous} Escaneá el marcador ${String(station.marker).padStart(2, '0')} para abrir esta prueba.`;
  if (run.finishedAt) {
    cleanup(); $('#puzzle').innerHTML = '<p class="notice">Ya completaste el juego.</p><button id="show-result" class="primary">Ver resultado</button>';
    $('#show-result').onclick = showResult; return;
  }
  if (unlocked && mountedStage !== run.stage) {
    cleanup(); mountedStage = run.stage;
    const activeRun = run, activeStage = run.stage;
    const stillActive = () => run === activeRun && run.stage === activeStage && !run.finishedAt && currentView === 'play';
    cleanupPuzzle = mountPuzzle($('#puzzle'), {
      run, save, feedback, effect: arEffect,
      fail(text) { if (!stillActive()) return; run.errors++; save(); updateStats(); feedback(text); },
      solve(evidence = station.evidence) {
        if (!stillActive() || !finishStage(run, evidence)) return;
        cleanup();
        if (run.finishedAt) { recordResult(store, run); renderRanking(); }
        save(); feedback('Prueba resuelta. Tu progreso está guardado.', true);
        renderGame();
        if (run.finishedAt) showResult();
        else if (!run.practice && visibleMarkers.has(STATIONS[run.stage].marker)) scanMarker(STATIONS[run.stage].marker);
        $('#station-title').focus({ preventScroll: true });
      }
    });
  } else if (!unlocked) cleanup();
}

function scanMarker(marker) {
  if (!run || run.finishedAt || currentView !== 'play') return;
  if (!unlockMarker(run, marker)) {
    feedback(`El marcador ${String(marker).padStart(2, '0')} no corresponde a esta etapa. Buscá el ${String(STATIONS[run.stage].marker).padStart(2, '0')}. No perdiste puntos.`);
    return;
  }
  save(); feedback(`Marcador ${String(marker).padStart(2, '0')} reconocido. Podés bajar el celular para resolver la prueba.`, true);
  renderGame();
}

function start(practice) {
  const input = $('#player-name');
  if (!input.reportValidity()) return;
  const name = cleanName(input.value);
  if (!name) { $('#start-error').textContent = 'Escribí un apodo para jugar.'; return; }
  $('#start-error').textContent = '';
  const existing = store.runs[runKey(name, practice)];
  run = existing && !existing.finishedAt ? existing : createRun(name, practice);
  save(); feedback(''); showView('play');
  if (!practice && cameraState === 'ready' && visibleMarkers.has(STATIONS[run.stage].marker)) scanMarker(STATIONS[run.stage].marker);
}

function renderRanking() {
  const rows = leaderboard(store.records);
  $('#ranking-empty').hidden = rows.length > 0;
  $('#ranking-body').replaceChildren(...rows.map((record, index) => {
    const tr = document.createElement('tr');
    const place = document.createElement('td');
    place.textContent = index + 1;
    const player = document.createElement('td');
    player.className = 'ranking-player';
    const name = document.createElement('strong');
    name.textContent = record.name;
    const stats = document.createElement('small');
    stats.textContent = `${record.errors} ${record.errors === 1 ? 'error' : 'errores'} · ${record.hints} ${record.hints === 1 ? 'ayuda' : 'ayudas'} · ${record.attempts} ${record.attempts === 1 ? 'partida' : 'partidas'}`;
    player.append(name, stats);
    const points = document.createElement('td');
    points.textContent = record.score.toLocaleString('es-UY');
    const time = document.createElement('td');
    time.textContent = formatTime(record.seconds);
    tr.append(place, player, points, time);
    return tr;
  }));
}

function showResult() {
  if (!run?.finishedAt) return;
  $('#result-name').textContent = run.name;
  $('#result-score').textContent = `${scoreRun(run).toLocaleString('es-UY')} pts`;
  $('#result-details').textContent = `${formatTime(elapsedSeconds(run))} · ${run.errors} errores · ${run.hints} ayudas`;
  $('#result-save').textContent = run.practice ? 'Práctica completada. Este resultado no participa en la clasificación.' : writeOK ? 'Resultado guardado en el tablero de este navegador.' : 'El resultado no pudo guardarse. El almacenamiento local no está disponible.';
  if (!$('#result-dialog').open) $('#result-dialog').showModal();
}

function stopCamera() {
  clearTimeout(cameraTimeout);
  camera.stop(); cameraState = 'off'; visibleMarkers.clear();
  $('.scanner-viewport').classList.remove('camera-active');
  $('#camera-start').disabled = false;
  $('#camera-start').textContent = 'Activar cámara';
  $('#camera-stop').hidden = true;
}

function startCamera() {
  if (currentView !== 'play' || run?.practice || cameraState === 'loading' || cameraState === 'ready') return;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    cameraError('La cámara requiere HTTPS o localhost y un navegador compatible. También podés usar el modo práctica.'); return;
  }
  stopCamera(); cameraState = 'loading';
  $('#camera-start').disabled = true;
  $('#camera-status').textContent = 'Cargando la cámara… Permití su uso cuando el navegador lo solicite.';
  try {
    camera.start();
    cameraTimeout = setTimeout(() => {
      if (cameraState === 'loading') cameraError('La cámara todavía no respondió. Revisá sus permisos y reintentá.');
    }, 45000);
  } catch { cameraError('No pudimos abrir el visor. Volvé a intentarlo.'); }
}

function cameraError(message) {
  stopCamera(); cameraState = 'error';
  $('#camera-status').textContent = message;
  $('#camera-start').hidden = Boolean(run?.practice);
  $('#camera-start').textContent = 'Reintentar cámara';
}

$('#start-form').addEventListener('submit', event => { event.preventDefault(); start(false); });
$('#practice-start').addEventListener('click', () => start(true));
$('#camera-start').addEventListener('click', startCamera);
$('#camera-stop').addEventListener('click', () => { stopCamera(); renderGame(); });
$('#leave-game').addEventListener('click', () => showView('home'));
$('#hint-button').addEventListener('click', () => {
  if (useHint(run, STATIONS[run.stage].hints.length)) { save(); updateStats(); renderHints(); }
});
$('#result-ranking').addEventListener('click', () => {
  $('#result-dialog').close();
  showView('home');
  $('#ranking-title').focus({ preventScroll: true });
  $('#ranking-panel').scrollIntoView({ block: 'nearest' });
});
$('#result-close').addEventListener('click', () => $('#result-dialog').close());
for (let marker = 1; marker <= 6; marker++) {
  const button = document.createElement('button'); button.textContent = String(marker).padStart(2, '0');
  button.setAttribute('aria-label', `Simular marcador ${marker}`);
  button.addEventListener('click', () => { if (run?.practice) scanMarker(marker); });
  $('#practice-markers').append(button);
}
window.addEventListener('pagehide', () => { save(); stopCamera(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && currentView === 'play') { cleanup(); save(); }
  if (!document.hidden && currentView === 'play') renderGame();
});
window.addEventListener('storage', event => {
  if (event.key === 'sacre-coeur.archive.v1') {
    // Conserva cambios de otro jugador/tab sin sobrescribir la partida activa.
    const fresh = readStore(storage).data;
    store = fresh;
    if (run) store.runs[runKey(run.name, run.practice)] = run;
    renderRanking();
  }
});
renderRanking();
setInterval(updateStats, 1000);

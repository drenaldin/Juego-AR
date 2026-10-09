import { newSequence, shuffled, guardianCorrect } from './engine.js';
import { DOORS, OBJECTS } from './story.js';

// Cada montaje devuelve su limpieza: salir de una pantalla cancela sus temporizadores.
export function mountPuzzle(host, ctx) {
  const { run, save, fail, solve, feedback, effect } = ctx;
  const stage = run.stage;
  const state = run.puzzles[stage] ??= {};
  const timers = new Set();
  let disposed = false;
  let raf = null;
  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); if (!disposed) fn(); }, ms);
    timers.add(id); return id;
  };
  const cancelTimers = () => { for (const timer of timers) clearTimeout(timer); timers.clear(); };
  const q = selector => host.querySelector(selector);
  const button = (id, handler) => q(id).addEventListener('click', handler);
  const message = (text, success = false) => feedback(text, success);

  function keyPuzzle() {
    const start = stage === 7 ? 70 : 64;
    const width = stage === 7 ? 9 : 19;
    host.innerHTML = `<div class="timing-track" style="--zone-start:${start}%;--zone-width:${width}%"><div class="timing-zone"></div><span class="timing-cursor"></span></div><div class="timing-labels"><span>Vuelta de la llave</span><span>Zona de acierto</span></div><div class="puzzle-actions"><button class="primary" id="stop-key">Detener la llave</button></div>`;
    const origin = performance.now();
    let position = 0, cooling = false;
    function tick(now) {
      if (disposed) return;
      position = ((now - origin) % 4000) / 40;
      q('.timing-cursor').style.left = `${position}%`;
      effect('key', position);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    button('#stop-key', () => {
      if (cooling) return;
      // Se evalúa el cursor dibujado en el último frame, que es lo que vio el jugador.
      if (position >= start && position <= start + width) { solve(); return; }
      fail('No llegaste a la zona roja. Probá en la próxima vuelta. −20 puntos.');
      cooling = true; q('#stop-key').disabled = true;
      later(() => { cooling = false; q('#stop-key').disabled = false; }, 900);
    });
  }

  function clockPuzzle() {
    host.innerHTML = `<div class="clock-face"><span class="clock-tick"></span><b class="clock-value">12</b></div><p class="sequence-status"><span class="signal"></span><span id="clock-status">Reproducí la señal antes de detener el reloj.</span></p><div class="puzzle-actions"><button class="secondary" id="clock-play">Ver señal</button><button class="primary" id="clock-stop" disabled>Detener reloj</button></div>`;
    const origin = performance.now();
    let hour = 12, ready = false, playing = false;
    function tick(now) {
      if (disposed) return;
      hour = Math.floor((now - origin) / 650) % 12 + 1;
      q('.clock-value').textContent = hour;
      q('.clock-tick').style.transform = `rotate(${hour * 30}deg)`;
      effect('clock', hour);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    button('#clock-play', () => {
      if (playing) return;
      playing = true; ready = false;
      q('#clock-play').disabled = true; q('#clock-stop').disabled = true;
      q('#clock-status').textContent = 'Contá los destellos…';
      for (let i = 0; i < 7; i++) {
        later(() => { q('.signal').classList.add('on'); effect('signal', true); }, 600 + i * 650);
        later(() => { q('.signal').classList.remove('on'); effect('signal', false); }, 920 + i * 650);
      }
      later(() => {
        playing = false; ready = true; q('#clock-play').disabled = false;
        q('#clock-stop').disabled = false; q('#clock-status').textContent = 'Detené la aguja en la hora que contó la señal.';
      }, 5200);
    });
    button('#clock-stop', () => {
      if (!ready || playing) return;
      if (hour === 7) { solve(); return; }
      ready = false; q('#clock-stop').disabled = true;
      q('#clock-status').textContent = 'Volvé a mirar la señal e intentá de nuevo.';
      fail(`La hora ${hour} no es la correcta. −20 puntos.`);
    });
  }

  function memoryPuzzle(short = false) {
    state.sequence ??= newSequence(short ? 3 : 5);
    save();
    host.innerHTML = `${short ? '<p class="notice">El guardián exige una secuencia de tres pasos antes de aceptar otra contraseña.</p>' : ''}<div class="door-buttons">${DOORS.map((d, i) => `<button class="door-button" data-door="${i}" style="--door-color:${d.color}" disabled><b>${d.symbol}</b><small>${d.name}</small></button>`).join('')}</div><p class="sequence-status" id="sequence-status">Observá primero. Después repetí.</p><button class="secondary" id="sequence-play">Mostrar secuencia</button>`;
    let accepting = false, position = 0;
    const doors = [...host.querySelectorAll('.door-button')];
    const setEnabled = enabled => doors.forEach(b => b.disabled = !enabled);
    const flash = (index, on) => { doors[index].classList.toggle('lit', on); effect('door', { index, on }); };
    button('#sequence-play', () => {
      cancelTimers(); accepting = false; position = 0; setEnabled(false);
      doors.forEach((_, i) => flash(i, false));
      q('#sequence-play').disabled = true; q('#sequence-status').textContent = 'Observá la secuencia…';
      state.sequence.forEach((item, i) => {
        later(() => flash(item, true), 500 + i * 800);
        later(() => flash(item, false), 1000 + i * 800);
      });
      later(() => {
        accepting = true; setEnabled(true); q('#sequence-play').disabled = false;
        q('#sequence-status').textContent = `Tu turno: 0 / ${state.sequence.length}`;
      }, 550 + state.sequence.length * 800);
    });
    doors.forEach((door, index) => door.addEventListener('click', () => {
      if (!accepting) return;
      flash(index, true); later(() => flash(index, false), 180);
      if (index !== state.sequence[position]) {
        accepting = false; setEnabled(false);
        state.sequence = newSequence(short ? 3 : 5); save();
        q('#sequence-status').textContent = 'La combinación cambió. Volvé a observarla.';
        fail('Te equivocaste de puerta. La secuencia cambió. −20 puntos.');
        return;
      }
      position++; q('#sequence-status').textContent = `Tu turno: ${position} / ${state.sequence.length}`;
      if (position === state.sequence.length) {
        accepting = false; setEnabled(false); q('#sequence-play').disabled = true;
        if (short) {
          state.penalty = false; delete state.sequence; save();
          message('Podés volver a ingresar la contraseña.', true);
          later(() => { cancelTimers(); guardianPuzzle(); }, 350);
        } else { message('La puerta azul se abrió. Hay un rombo adentro.', true); later(() => solve(), 500); }
      }
    }));
  }

  function archivePuzzle() {
    host.innerHTML = `<div class="statements"><button class="statement" data-answer="A"><b>A</b> El reloj se detuvo a las siete.</button><button class="statement" data-answer="B"><b>B</b> La puerta que se abrió era roja.</button><button class="statement" data-answer="C"><b>C</b> El sello que apareció era un rombo.</button></div><p class="sequence-status" id="archive-status">Seleccioná la declaración falsa.</p>`;
    const choices = [...host.querySelectorAll('.statement')];
    function lockTick() {
      const remaining = Math.ceil(((state.lockUntil ?? 0) - Date.now()) / 1000);
      choices.forEach(b => b.disabled = remaining > 0);
      q('#archive-status').textContent = remaining > 0 ? `Prueba bloqueada: ${remaining} s` : 'Seleccioná la declaración falsa.';
      if (remaining > 0) later(lockTick, 250);
    }
    lockTick();
    choices.forEach(choice => choice.addEventListener('click', () => {
      if (Date.now() < (state.lockUntil ?? 0)) return;
      if (choice.dataset.answer === 'B') { solve(); return; }
      state.lockUntil = Date.now() + 10000; save();
      fail('Esa frase era verdadera. Esperá 10 segundos para volver a intentar. −20 puntos.');
      lockTick();
    }));
  }

  function balancePuzzle() {
    state.order ??= shuffled(OBJECTS);
    state.weighings ??= [];
    save();
    const options = OBJECTS.map(o => `<option value="${o}">${o}</option>`).join('');
    host.innerHTML = `<div class="field-row"><label>Izquierda<select id="balance-left">${options}</select></label><span>vs.</span><label>Derecha<select id="balance-right">${options}</select></label></div><button class="secondary" id="weigh">Comparar pesos</button><p class="sequence-status" id="weigh-count"></p><ol class="balance-history" id="weigh-history"></ol><form id="balance-answer" class="combination"><label>De menor a mayor peso</label><div class="field-row">${[0, 1, 2].map(i => `<label>${i + 1}.º<select id="order-${i}">${options}</select></label>`).join('')}</div><button class="primary" type="submit">Comprobar orden</button></form>`;
    q('#balance-right').value = OBJECTS[1];
    [0, 1, 2].forEach(i => q(`#order-${i}`).value = OBJECTS[i]);
    function history() {
      q('#weigh-history').replaceChildren(...state.weighings.map(text => {
        const li = document.createElement('li'); li.textContent = text; return li;
      }));
      q('#weigh-count').textContent = `Pesadas disponibles: ${3 - state.weighings.length} / 3`;
      q('#weigh').disabled = state.weighings.length >= 3;
    }
    history();
    button('#weigh', () => {
      if (state.weighings.length >= 3) return;
      const left = q('#balance-left').value, right = q('#balance-right').value;
      if (left === right) { message('Elegí dos objetos diferentes. No gastaste una pesada.'); return; }
      const leftLighter = state.order.indexOf(left) < state.order.indexOf(right);
      state.weighings.push(`${left} pesa ${leftLighter ? 'menos' : 'más'} que ${right}.`);
      effect('balance', leftLighter ? 12 : -12); save(); history();
    });
    q('#balance-answer').addEventListener('submit', e => {
      e.preventDefault();
      const answer = [0, 1, 2].map(i => q(`#order-${i}`).value);
      if (new Set(answer).size !== 3) { message('Usá cada objeto una sola vez. No se descontaron puntos.'); return; }
      if (answer.every((o, i) => o === state.order[i])) {
        run.lightest = state.order[0]; save();
        solve(`Orden comprobado, de menor a mayor peso: ${state.order.join(' → ')}.`); return;
      }
      state.order = shuffled(OBJECTS); state.weighings = []; save(); history();
      fail('El orden era incorrecto. Los pesos cambiaron: tenés tres pesadas nuevas. −20 puntos.');
    });
  }

  function guardianPuzzle() {
    if (state.penalty) { memoryPuzzle(true); return; }
    host.innerHTML = `<form id="guardian-answer" class="combination"><label>Hora del reloj<select id="guardian-hour">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}</select></label><label>Símbolo de la puerta<select id="guardian-symbol"><option value="circle">○ Círculo</option><option value="triangle">△ Triángulo</option><option value="diamond">◇ Rombo</option><option value="square">□ Cuadrado</option></select></label><label>Objeto más liviano<select id="guardian-object">${OBJECTS.map(o => `<option value="${o}">${o}</option>`).join('')}</select></label><button class="primary" type="submit">Probar contraseña</button></form>`;
    q('#guardian-answer').addEventListener('submit', e => {
      e.preventDefault();
      if (guardianCorrect(q('#guardian-hour').value, q('#guardian-symbol').value, q('#guardian-object').value, run.lightest)) { solve(); return; }
      state.wrong = (state.wrong ?? 0) + 1;
      if (state.wrong % 2 === 0) { state.penalty = true; state.sequence = newSequence(3); }
      save(); fail('Contraseña incorrecta. Revisá las pistas. −20 puntos.');
      if (state.penalty) memoryPuzzle(true);
    });
  }

  function roomPuzzle() {
    host.innerHTML = '<blockquote class="room-quote">Volvé al lugar donde encontraste la llave.</blockquote><p class="muted">Acá no está el cofre. Escaneá otra vez el primer marcador.</p><button class="primary" id="return-start">Volver al inicio del recorrido</button>';
    button('#return-start', () => solve());
  }

  [keyPuzzle, clockPuzzle, memoryPuzzle, archivePuzzle, balancePuzzle, guardianPuzzle, roomPuzzle, keyPuzzle][stage]();
  return () => { disposed = true; cancelTimers(); if (raf !== null) cancelAnimationFrame(raf); host.replaceChildren(); };
}

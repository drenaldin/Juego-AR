import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { fitCameraSize, createCamera } from '../js/camera.js';

test('el video cabe completo en celulares verticales y horizontales sin deformarse', () => {
  for (const [width, height] of [[284, 213], [354, 265.5], [394, 295.5], [700, 200], [650, 360]]) {
    for (const [videoWidth, videoHeight] of [[640, 480], [480, 640], [1920, 1080], [1080, 1920]]) {
      const fit = fitCameraSize(width, height, videoWidth, videoHeight);
      assert.ok(fit.width <= width + .001 && fit.height <= height + .001);
      assert.ok(Math.abs(fit.width / fit.height - videoWidth / videoHeight) < .00001);
      assert.ok(Math.abs(fit.width - width) < .001 || Math.abs(fit.height - height) < .001);
    }
  }
});

test('no calcula encuadres antes de tener dimensiones válidas', () => {
  for (const values of [[0, 300, 640, 480], [300, 0, 640, 480], [300, 300, 0, 0], [NaN, 300, 640, 480], [300, 300, -1, 480]]) {
    assert.equal(fitCameraSize(...values), null);
  }
});

test('el visor se encuadra al girar, acepta solo sus marcadores y libera la cámara al salir', t => {
  const {window, document} = parseHTML('<html><body><div id="camera" hidden></div><p id="help">Cómo jugar</p></body></html>');
  window.location = {origin: 'https://example.test'};
  const previous = new Map();
  for (const [key, value] of Object.entries({window, document})) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {value, writable:true, configurable:true});
  }
  let camera;
  t.after(() => {
    camera?.stop();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const container = document.querySelector('#camera');
  let bounds = {width: 354, height: 265.5}, ready = 0, stopped = 0;
  const found = [], lost = [], errors = [], sent = [];
  container.getBoundingClientRect = () => bounds;
  camera = createCamera({container, onReady:()=>ready++, onFound:m=>found.push(m), onLost:m=>lost.push(m), onError:e=>errors.push(e)});
  camera.start();
  const frame = container.querySelector('iframe');
  const source = {postMessage:(data, origin)=>sent.push({data,origin}), stopARCamera:()=>stopped++};
  Object.defineProperty(frame, 'contentWindow', {value:source});
  const message = (data, eventSource=source, origin=window.location.origin) => {
    const event = new window.Event('message');
    Object.assign(event, {data:{channel:'treasure-ar',...data}, source:eventSource, origin});
    window.dispatchEvent(event);
  };
  assert.equal(container.hidden, false);
  assert.match(frame.src, /\/ar\.html$/);
  assert.equal(frame.allow, 'camera; autoplay');
  message({type:'ready', width:480, height:640});
  assert.equal(ready, 1);
  assert.equal(frame.style.width, '199.125px');
  assert.equal(frame.style.height, '265.5px');
  message({type:'found', marker:1}, {}, window.location.origin);
  message({type:'found', marker:1}, source, 'https://elsewhere.test');
  message({type:'found', marker:99});
  assert.deepEqual(found, []);
  message({type:'found', marker:1}); message({type:'lost', marker:1});
  assert.deepEqual(found, [1]); assert.deepEqual(lost, [1]);
  bounds = {width:700, height:200};
  message({type:'size', width:1920, height:1080});
  assert.ok(Math.abs(parseFloat(frame.style.width) - 355.55556) < .001);
  assert.equal(frame.style.height, '200px');
  camera.setState(7, true); camera.effect('signal', true);
  assert.deepEqual(sent[0], {data:{channel:'treasure-ar',type:'state',stage:7,finished:true}, origin:window.location.origin});
  assert.equal(sent[1].data.effect, 'signal');
  assert.equal(document.body.getAttribute('style'), null);
  assert.equal(document.querySelector('#help').hidden, false);
  camera.stop();
  assert.equal(stopped, 1);
  assert.equal(container.querySelector('iframe'), null);
  assert.equal(container.hidden, true);
  message({type:'found', marker:2});
  assert.deepEqual(found, [1]);
  camera.start();
  message({type:'found', marker:2});
  assert.deepEqual(found, [1], 'Los mensajes de la cámara anterior se ignoran');
  const newFrame = container.querySelector('iframe');
  const newSource = {postMessage(){}, stopARCamera(){}};
  Object.defineProperty(newFrame, 'contentWindow', {value:newSource});
  message({type:'error'}, newSource);
  assert.equal(errors.length, 1);
});

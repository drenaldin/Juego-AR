const origin = window.location.origin;
const notify = (type, data = {}) => window.parent.postMessage({ channel: 'treasure-ar', type, ...data }, origin);
let scene = null, stream = null, stopped = false, ready = false;
const q = selector => scene?.querySelector(selector);

function stop() {
  stopped = true;
  const video = document.querySelector('#arjs-video');
  for (const track of (stream ?? video?.srcObject)?.getTracks?.() ?? []) track.stop();
  video?.pause();
  scene?.pause?.();
}
window.stopARCamera = stop;
window.addEventListener('pagehide', stop);

function fail() {
  if (!stopped) notify('error');
  stop();
}

window.addEventListener('camera-error', fail);
window.addEventListener('arjs-video-loaded', event => {
  const video = event.detail?.component ?? document.querySelector('#arjs-video');
  stream = video?.srcObject;
  if (stopped) { stop(); return; }
  if (!video) { fail(); return; }
  video.muted = true;
  video.setAttribute('playsinline', '');
  function reportSize() {
    if (stopped || !video.videoWidth || !video.videoHeight) return;
    notify(ready ? 'size' : 'ready', { width: video.videoWidth, height: video.videoHeight });
    ready = true;
  }
  video.addEventListener('loadedmetadata', reportSize);
  video.addEventListener('resize', reportSize);
  video.addEventListener('loadeddata', reportSize);
  reportSize();
  video.play().catch(fail);
});

window.addEventListener('message', event => {
  if (stopped || event.source !== window.parent || event.origin !== origin) return;
  const data = event.data;
  if (!data || data.channel !== 'treasure-ar' || !scene) return;
  if (data.type === 'state') {
    q('#ar-key')?.setAttribute('visible', data.stage < 7);
    q('#ar-chest')?.setAttribute('visible', data.stage >= 7);
    q('#ar-guardian')?.setAttribute('visible', data.stage < 6);
    q('#ar-room')?.setAttribute('visible', data.stage >= 6);
    q('#ar-lid')?.setAttribute('rotation', data.finished ? '-65 0 0' : '0 0 0');
    q('#ar-lid')?.setAttribute('position', data.finished ? '0 .5 -.22' : '0 .25 0');
    q('#ar-treasure')?.setAttribute('visible', Boolean(data.finished));
  } else if (data.type === 'effect') {
    const { effect, value } = data;
    if (effect === 'clock') q('#ar-clock-hand')?.setAttribute('rotation', `0 ${-value * 30} 0`);
    if (effect === 'signal') q('#ar-clock-light')?.setAttribute('color', value ? '#ff432b' : '#d2a146');
    if (effect === 'door') {
      const door = q(`[data-door="${value.index}"]`);
      door?.setAttribute('scale', value.on ? '1 1.35 1' : '1 1 1');
      door?.setAttribute('material', 'emissive', value.on ? '#777777' : '#000000');
    }
    if (effect === 'balance') q('#ar-balance-beam')?.setAttribute('rotation', `0 0 ${value}`);
  }
});

function loadScript(src, check) {
  if (check()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = src;
    const timeout = setTimeout(() => reject(new Error('Tiempo de carga agotado')), 25000);
    script.onload = () => { clearTimeout(timeout); if (check()) resolve(); else reject(new Error('Biblioteca no disponible')); };
    script.onerror = () => { clearTimeout(timeout); reject(new Error('No se pudo descargar la biblioteca')); };
    document.head.append(script);
  });
}

async function start() {
  try {
    await loadScript('https://aframe.io/releases/1.8.0/aframe.min.js', () => Boolean(window.AFRAME));
    if (stopped) return;
    await loadScript('https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.8/aframe/build/aframe-ar.js', () => Boolean(window.AFRAME?.systems?.arjs));
    if (stopped) return;
    const fragment = document.querySelector('#ar-template').content.cloneNode(true);
    scene = fragment.querySelector('a-scene');
    scene.querySelectorAll('a-marker').forEach(marker => {
      const id = Number(marker.dataset.marker);
      marker.addEventListener('markerFound', () => { if (!stopped) notify('found', { marker: id }); });
      marker.addEventListener('markerLost', () => { if (!stopped) notify('lost', { marker: id }); });
    });
    document.body.append(fragment);
  } catch { fail(); }
}
start();

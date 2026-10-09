// El visor tiene su propio documento: A-Frame y AR.js no pueden redimensionar el juego.
export function fitCameraSize(width, height, videoWidth, videoHeight) {
  if (![width, height, videoWidth, videoHeight].every(value => Number.isFinite(value) && value > 0)) return null;
  const scale = Math.min(width / videoWidth, height / videoHeight);
  return { width: videoWidth * scale, height: videoHeight * scale };
}

export function createCamera({ container, onReady, onError, onFound, onLost }) {
  let frame = null, observer = null;
  let videoWidth = 4, videoHeight = 3;
  const origin = window.location.origin;

  function fit() {
    if (!frame) return;
    const bounds = container.getBoundingClientRect();
    const size = fitCameraSize(bounds.width, bounds.height, videoWidth, videoHeight);
    if (!size) return;
    frame.style.width = `${size.width}px`;
    frame.style.height = `${size.height}px`;
  }

  function receive(event) {
    if (!frame || event.source !== frame.contentWindow || event.origin !== origin) return;
    const data = event.data;
    if (!data || data.channel !== 'treasure-ar') return;
    if (data.type === 'ready' || data.type === 'size') {
      if (fitCameraSize(1, 1, data.width, data.height)) {
        videoWidth = data.width; videoHeight = data.height; fit();
      }
      if (data.type === 'ready') onReady();
    } else if (data.type === 'found' || data.type === 'lost') {
      if (!Number.isInteger(data.marker) || data.marker < 1 || data.marker > 6) return;
      if (data.type === 'found') onFound(data.marker);
      else onLost(data.marker);
    } else if (data.type === 'error') onError('No pudimos abrir la cámara. Revisá el permiso del navegador y volvé a intentarlo.');
  }

  function send(type, data) {
    frame?.contentWindow?.postMessage({ channel: 'treasure-ar', type, ...data }, origin);
  }

  function stop() {
    window.removeEventListener('message', receive);
    window.removeEventListener('resize', fit);
    observer?.disconnect(); observer = null;
    // Cortar las pistas de video antes de retirar el iframe libera la cámara al salir.
    try { frame?.contentWindow?.stopARCamera?.(); } catch { /* El documento puede haberse cerrado. */ }
    frame?.remove(); frame = null;
    container.hidden = true;
  }

  return {
    start() {
      stop(); videoWidth = 4; videoHeight = 3;
      frame = document.createElement('iframe');
      frame.className = 'ar-frame';
      frame.title = 'Cámara para escanear los marcadores';
      frame.allow = 'camera; autoplay';
      frame.tabIndex = -1;
      frame.src = new URL('../ar.html?v=5', import.meta.url).href;
      window.addEventListener('message', receive);
      window.addEventListener('resize', fit);
      container.hidden = false;
      container.replaceChildren(frame);
      fit();
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(fit); observer.observe(container);
      }
    },
    stop,
    setState(stage, finished) { send('state', { stage, finished }); },
    effect(effect, value) { send('effect', { effect, value }); }
  };
}

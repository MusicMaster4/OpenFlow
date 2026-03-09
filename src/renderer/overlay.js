const overlayEls = {
  shell: document.getElementById('overlay-shell'),
  pill: document.getElementById('overlay-pill'),
  wave: document.getElementById('overlay-wave'),
  loader: document.getElementById('overlay-loader'),
  glyph: document.getElementById('overlay-glyph'),
};

let dragState = null;
let queuedPoint = null;
let dragFrame = 0;

function getOverlayMode(state) {
  switch (state.phase) {
    case 'listening':
      return 'recording';
    case 'transcribing':
    case 'booting':
      return 'loading';
    case 'offline':
    case 'error':
      return 'error';
    default:
      return 'idle';
  }
}

function flushDrag() {
  dragFrame = 0;
  if (!queuedPoint) {
    return;
  }

  window.flowOverlay.dragTo(queuedPoint);
  queuedPoint = null;
}

function queueDrag(point) {
  queuedPoint = point;
  if (!dragFrame) {
    dragFrame = window.requestAnimationFrame(flushDrag);
  }
}

function getDragPoint(event) {
  if (!dragState) {
    return null;
  }

  return {
    x: Math.round(event.screenX - dragState.offsetX),
    y: Math.round(event.screenY - dragState.offsetY),
  };
}

function stopDrag(event) {
  if (!dragState) {
    return;
  }

  const point = event ? getDragPoint(event) : queuedPoint;
  dragState = null;
  overlayEls.shell.classList.remove('overlay-shell--dragging');

  if (dragFrame) {
    window.cancelAnimationFrame(dragFrame);
    dragFrame = 0;
  }

  if (point) {
    window.flowOverlay.endDrag(point);
  }
  queuedPoint = null;
}

function startDrag(event) {
  if (event.button !== 0) {
    return;
  }

  dragState = {
    offsetX: event.clientX,
    offsetY: event.clientY,
    pointerId: event.pointerId,
  };
  overlayEls.shell.classList.add('overlay-shell--dragging');
  overlayEls.pill.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function handlePointerMove(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }

  const point = getDragPoint(event);
  if (!point) {
    return;
  }

  queueDrag(point);
}

function renderOverlay(state) {
  const mode = getOverlayMode(state);
  overlayEls.shell.dataset.mode = mode;
  overlayEls.wave.classList.toggle('hidden', mode !== 'recording');
  overlayEls.loader.classList.toggle('hidden', mode !== 'loading');
  overlayEls.glyph.classList.toggle('hidden', mode === 'recording' || mode === 'loading');
}

function bindDrag() {
  overlayEls.pill.addEventListener('pointerdown', startDrag);
  overlayEls.pill.addEventListener('pointermove', handlePointerMove);
  overlayEls.pill.addEventListener('pointerup', stopDrag);
  overlayEls.pill.addEventListener('pointercancel', stopDrag);
  overlayEls.pill.addEventListener('lostpointercapture', () => {
    stopDrag();
  });
}

async function bootstrap() {
  const initialState = await window.flowOverlay.getState();
  renderOverlay(initialState);
  bindDrag();

  window.flowOverlay.onStateUpdate((state) => {
    renderOverlay(state);
  });
}

bootstrap();

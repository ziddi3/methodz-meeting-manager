// js/signatures.js
// Canvas-based digital signature widget

/**
 * Initialise a signature pad on the given <canvas> element.
 * Returns { clear, getDataURL, isEmpty } controls.
 */
function initSignaturePad(canvas) {
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let empty = true;

  // Scale canvas for sharp display on high-DPI screens
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }
  resize();

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
      x: src.clientX - rect.left,
      y: src.clientY - rect.top
    };
  }

  function onStart(e) {
    e.preventDefault();
    drawing = true;
    empty = false;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function onMove(e) {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function onEnd(e) {
    e.preventDefault();
    drawing = false;
  }

  canvas.addEventListener('mousedown', onStart);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseup', onEnd);
  canvas.addEventListener('mouseleave', onEnd);
  canvas.addEventListener('touchstart', onStart, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  canvas.addEventListener('touchend', onEnd);

  function clear() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width * ratio, rect.height * ratio);
    empty = true;
  }

  function getDataURL() {
    return canvas.toDataURL('image/png');
  }

  function isEmpty() {
    return empty;
  }

  return { clear, getDataURL, isEmpty };
}

export { initSignaturePad };

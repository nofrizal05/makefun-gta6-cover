// Vice City Nights editor: photos in, panels arranged, caption written, PNG out.
// Wires the controls in index.html to the cover renderer (cover.js). A `?shot=`
// query sets up a fixed scene for a screenshot instead (shots.js).

import { GRADES, LAYOUTS, drawCover, layoutPanels } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const MAX_PHOTOS = 4;

export const state = {
  layout: 'hero',
  grade: 'sunset',
  frame: true,
  grain: true,
  title: 'NEON NIGHTS',
  subtitle: 'one night in the city',
  badge: 'EST. 2026 · AFTER DARK',
  size: '1920x1080',
  panelPhotos: [0, 0, 0, 0, 0, 0, 0, 0, 0],
};

export const photos = []; // { img, zoom, ox, oy, name }
let selectedPanel = -1;
let activePhoto = 0;
const undoStack = [];
const redoStack = [];

function snapshot() {
  return JSON.stringify({
    state,
    transforms: photos.map((p) => ({ zoom: p.zoom, ox: p.ox, oy: p.oy })),
  });
}

function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 40) undoStack.shift();
  redoStack.length = 0;
}

function restore(json) {
  const data = JSON.parse(json);
  Object.assign(state, data.state);
  data.transforms.forEach((t, i) => { if (photos[i]) Object.assign(photos[i], t); });
  syncControls();
  redraw();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function addPhoto(img, name) {
  if (photos.length >= MAX_PHOTOS) photos.shift();
  photos.push({ img, zoom: 1, ox: 0, oy: 0, name });
  activePhoto = photos.length - 1;
  if (photos.length === 1) state.panelPhotos = state.panelPhotos.map(() => 0);
  renderSlots();
  redraw();
}

async function loadFile(file) {
  const img = await loadImage(URL.createObjectURL(file));
  pushHistory();
  await addPhoto(img, file.name);
}

async function loadSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  pushHistory();
  await addPhoto(img, name);
}

export function redraw() {
  const [w, h] = state.size.split('x').map(Number);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    canvas.classList.toggle('wide', w > h);
    canvas.classList.toggle('tall', h > w);
  }
  drawCover(canvas, state, photos, selectedPanel);
}

function renderSlots() {
  const wrap = document.getElementById('photoSlots');
  wrap.innerHTML = '';
  for (let i = 0; i < MAX_PHOTOS; i++) {
    const p = photos[i];
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'slot' + (p ? '' : ' is-empty') + (i === activePhoto ? ' is-active' : '');
    slot.textContent = p ? `photo ${i + 1}` : '';
    if (p) slot.style.backgroundImage = `url(${p.img.src})`;
    slot.title = p ? p.name : 'Empty slot — add a photo';
    slot.addEventListener('click', () => {
      activePhoto = i;
      renderSlots();
      syncPanelControls();
    });
    wrap.appendChild(slot);
  }
  const sel = document.getElementById('panelPhoto');
  sel.innerHTML = '';
  photos.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `Photo ${i + 1} — ${p.name}`;
    sel.appendChild(opt);
  });
  if (!photos.length) {
    const opt = document.createElement('option');
    opt.value = '-1';
    opt.textContent = 'No photos yet';
    sel.appendChild(opt);
  }
  syncPanelControls();
}

function panelCount() {
  return LAYOUTS[state.layout].panels;
}

function syncPanelControls() {
  const label = document.getElementById('panelLabel');
  const sel = document.getElementById('panelPhoto');
  const zoom = document.getElementById('zoom');
  if (selectedPanel < 0 || selectedPanel >= panelCount()) {
    label.textContent = 'No panel selected yet — click a panel in the preview.';
    sel.disabled = true;
    zoom.disabled = true;
    return;
  }
  label.textContent = `Panel ${selectedPanel + 1} of ${panelCount()} (${LAYOUTS[state.layout].label}).`;
  sel.disabled = false;
  zoom.disabled = false;
  const pi = state.panelPhotos[selectedPanel] ?? 0;
  sel.value = photos[pi] ? String(pi) : '-1';
  const photo = photos[pi];
  if (photo) {
    zoom.value = String(Math.round(photo.zoom * 100));
    document.getElementById('zoomVal').textContent = `${Math.round(photo.zoom * 100)}%`;
  }
}

function syncControls() {
  document.getElementById('layout').value = state.layout;
  document.getElementById('caption').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('badge').value = state.badge;
  document.getElementById('frameToggle').checked = state.frame;
  document.getElementById('grainToggle').checked = state.grain;
  document.querySelectorAll('.size-btn').forEach((b) =>
    b.classList.toggle('is-active', b.dataset.size === state.size));
  document.querySelectorAll('.swatch').forEach((s) =>
    s.classList.toggle('is-active', s.dataset.grade === state.grade));
  renderSlots();
}

function buildSwatches() {
  const wrap = document.getElementById('gradeSwatches');
  Object.entries(GRADES).forEach(([key, g]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (key === state.grade ? ' is-active' : '');
    b.dataset.grade = key;
    b.textContent = g.label;
    b.style.background = `linear-gradient(135deg, ${g.sky[1]}, ${g.sky[2]} 60%, ${g.accent})`;
    b.addEventListener('click', () => {
      pushHistory();
      state.grade = key;
      syncControls();
      redraw();
    });
    wrap.appendChild(b);
  });
}

/** Renders the cover at full export size and downloads it as a PNG. */
export function exportCover() {
  const [w, h] = state.size.split('x').map(Number);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state, photos, -1);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      if (!blob) { statusEl.textContent = 'Export failed — try again.'; resolve(null); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-city-nights-${w}x${h}.png`;
      a.click();
      statusEl.textContent = `Saved vice-city-nights-${w}x${h}.png — share it!`;
      resolve(blob);
    }, 'image/png');
  });
}

// ---- Controls ----
document.getElementById('photoFile').addEventListener('change', async (e) => {
  for (const file of e.target.files) await loadFile(file);
  e.target.value = '';
});
document.getElementById('fillAll').addEventListener('click', () => {
  if (!photos.length) { statusEl.textContent = 'Add a photo first.'; return; }
  pushHistory();
  state.panelPhotos = state.panelPhotos.map(() => 0);
  redraw();
});
document.getElementById('sampleBoulevard').addEventListener('click', () => loadSample('boulevard'));
document.getElementById('samplePier').addEventListener('click', () => loadSample('pier'));
document.getElementById('layout').addEventListener('change', (e) => {
  pushHistory();
  state.layout = e.target.value;
  selectedPanel = -1;
  syncControls();
  redraw();
});
document.getElementById('caption').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
document.getElementById('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
document.getElementById('badge').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });
document.getElementById('frameToggle').addEventListener('change', (e) => { pushHistory(); state.frame = e.target.checked; redraw(); });
document.getElementById('grainToggle').addEventListener('change', (e) => { pushHistory(); state.grain = e.target.checked; redraw(); });
document.getElementById('panelPhoto').addEventListener('change', (e) => {
  if (selectedPanel < 0) return;
  pushHistory();
  state.panelPhotos[selectedPanel] = Number(e.target.value);
  redraw();
});
document.getElementById('zoom').addEventListener('input', (e) => {
  const photo = photos[state.panelPhotos[selectedPanel] ?? 0];
  if (!photo) return;
  photo.zoom = Number(e.target.value) / 100;
  document.getElementById('zoomVal').textContent = `${e.target.value}%`;
  redraw();
});
document.getElementById('zoom').addEventListener('change', () => pushHistory());
document.getElementById('centerPhoto').addEventListener('click', () => {
  const photo = photos[state.panelPhotos[selectedPanel] ?? 0];
  if (!photo) return;
  pushHistory();
  photo.ox = 0; photo.oy = 0; photo.zoom = 1;
  syncPanelControls();
  redraw();
});
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);
document.querySelectorAll('.size-btn').forEach((b) => {
  b.addEventListener('click', () => {
    pushHistory();
    state.size = b.dataset.size;
    syncControls();
    redraw();
  });
});
document.getElementById('export').addEventListener('click', exportCover);

// ---- Canvas: click a panel to select it, drag to pan its photo, wheel to zoom ----
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}
function panelAt(x, y) {
  const panels = layoutPanels(state.layout, canvas.width, canvas.height);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}
let dragging = null;
canvas.addEventListener('pointerdown', (e) => {
  const { x, y } = canvasPoint(e);
  const hit = panelAt(x, y);
  selectedPanel = hit;
  if (hit >= 0) {
    const photo = photos[state.panelPhotos[hit] ?? 0];
    if (photo) dragging = { x, y, photo, ox: photo.ox, oy: photo.oy };
  }
  syncPanelControls();
  redraw();
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const { x, y } = canvasPoint(e);
  dragging.photo.ox = dragging.ox + (x - dragging.x) / canvas.width;
  dragging.photo.oy = dragging.oy + (y - dragging.y) / canvas.height;
  redraw();
});
canvas.addEventListener('pointerup', () => {
  if (dragging) pushHistory();
  dragging = null;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const photo = photos[state.panelPhotos[selectedPanel] ?? 0];
  if (!photo || selectedPanel < 0) return;
  photo.zoom = Math.min(3, Math.max(1, photo.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
  syncPanelControls();
  redraw();
}, { passive: false });

// ---- Boot ----
buildSwatches();
renderSlots();
syncControls();
if (document.fonts?.ready) {
  document.fonts.load('16px Anton').catch(() => {});
  document.fonts.load('16px Pacifico').catch(() => {});
  document.fonts.ready.then(redraw);
}
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    loadSample,
    setState(patch) { pushHistory(); Object.assign(state, patch); syncControls(); },
    redraw,
  });
} else {
  redraw();
}

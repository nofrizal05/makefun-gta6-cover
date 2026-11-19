// Fixed scenes for screenshots: ?shot=editor shows the app with sample photos
// loaded; ?shot=cover shows a cover the app drew, full-frame. Query params:
// photo, photo2 (sample names), caption, subtitle, layout, grade, size.
// window.__shotReady is set once the scene has painted.

export async function runShot(shot, query, api) {
  const caption = query.get('caption') ?? 'Neon Nights';
  const subtitle = query.get('subtitle') ?? 'one night in the city';
  const layout = query.get('layout') ?? 'hero';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? '1920x1080';
  const photo = query.get('photo') ?? 'pier';
  const photo2 = query.get('photo2') ?? 'boulevard';

  if (shot === 'cover') document.body.classList.add('shot-cover');

  await api.loadSample(photo);
  await api.loadSample(photo2);
  api.setState({
    title: caption,
    subtitle,
    layout,
    grade,
    size,
    panelPhotos: [1, 0, 1, 0, 1, 0, 1, 0, 1],
  });
  api.redraw();

  if (shot === 'cover') {
    // Fit the cover canvas inside the window without distorting it.
    const canvas = document.getElementById('cover');
    const scale = Math.min(window.innerWidth / canvas.width, window.innerHeight / canvas.height);
    canvas.style.width = `${Math.floor(canvas.width * scale)}px`;
    canvas.style.height = `${Math.floor(canvas.height * scale)}px`;
    canvas.style.margin = 'auto';
  }

  // Wait for the display fonts, then repaint once more before signalling ready.
  try { await document.fonts.ready; } catch { /* fonts are best-effort */ }
  api.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}

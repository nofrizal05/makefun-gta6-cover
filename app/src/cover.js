// Vice City Nights cover renderer: draws the multi-panel poster onto any canvas
// at any size, from the editor state and the loaded photos. Pure canvas 2D,
// no network, no dependencies. The same function paints the live preview and
// the exported PNG, so what you see is what you share.

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    sky: ['#2b1055', '#7b1e6e', '#ff5e62', '#ff9a3d'],
    tint: ['rgba(255, 94, 98, 0.20)', 'rgba(123, 30, 110, 0.28)'],
    title: ['#fff7e0', '#ffc53d', '#ff5e62'],
    accent: '#ff5e62',
  },
  neon: {
    label: 'Neon Nights',
    sky: ['#0b1035', '#3b0f66', '#c2188b', '#19e3d6'],
    tint: ['rgba(194, 24, 139, 0.22)', 'rgba(25, 227, 214, 0.16)'],
    title: ['#eafcff', '#19e3d6', '#ff2e88'],
    accent: '#19e3d6',
  },
  gold: {
    label: 'Palm Gold',
    sky: ['#3d1c02', '#8a4b0f', '#e8a33d', '#ffe9a8'],
    tint: ['rgba(232, 163, 61, 0.22)', 'rgba(138, 75, 15, 0.25)'],
    title: ['#fffbe8', '#ffd76a', '#ff7a18'],
    accent: '#ffc53d',
  },
  teal: {
    label: 'Teal Dusk',
    sky: ['#062a33', '#0f5e6e', '#19a7a0', '#ff7a9e'],
    tint: ['rgba(25, 167, 160, 0.20)', 'rgba(6, 42, 51, 0.30)'],
    title: ['#eafffb', '#7df0e4', '#ff7a9e'],
    accent: '#19e3d6',
  },
  candy: {
    label: 'Candy Pink',
    sky: ['#3d0a4e', '#a4136e', '#ff2e88', '#ff9a3d'],
    tint: ['rgba(255, 46, 136, 0.24)', 'rgba(164, 19, 110, 0.26)'],
    title: ['#fff0f6', '#ff9ecf', '#ff2e88'],
    accent: '#ff2e88',
  },
};

export const LAYOUTS = {
  hero: { label: 'Hero + three', panels: 4 },
  grid4: { label: 'Four panels', panels: 4 },
  nine: { label: 'Nine panels', panels: 9 },
  fullbleed: { label: 'Full bleed', panels: 1 },
  tilted: { label: 'Snapshots', panels: 3 },
  split: { label: 'Split', panels: 3 },
};

/** Panel rectangles for a layout, as fractions of the cover (x, y, w, h, tilt degrees). */
export function layoutPanels(layout, w, h) {
  const u = (x, y, pw, ph, tilt = 0) => ({ x: x * w, y: y * h, w: pw * w, h: ph * h, tilt });
  switch (layout) {
    case 'grid4':
      return [
        u(0, 0, 0.5, 0.5), u(0.5, 0, 0.5, 0.5),
        u(0, 0.5, 0.5, 0.5), u(0.5, 0.5, 0.5, 0.5),
      ];
    case 'nine':
      return [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => u(c / 3, r / 3, 1 / 3, 1 / 3)));
    case 'fullbleed':
      return [u(0, 0, 1, 1)];
    case 'tilted':
      return [
        u(0.06, 0.10, 0.42, 0.52, -6),
        u(0.50, 0.06, 0.44, 0.55, 5),
        u(0.24, 0.48, 0.52, 0.42, -2),
      ];
    case 'split':
      return [u(0, 0, 0.55, 1), u(0.55, 0, 0.45, 0.5), u(0.55, 0.5, 0.45, 0.5)];
    case 'hero':
    default:
      return [
        u(0, 0, 1, 0.62),
        u(0, 0.62, 1 / 3, 0.38), u(1 / 3, 0.62, 1 / 3, 0.38), u(2 / 3, 0.62, 1 / 3, 0.38),
      ];
  }
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws one photo cover-filling a rectangle, honouring its zoom and pan. */
export function drawPhotoInto(ctx, photo, rect) {
  const img = photo.img;
  if (!img || !img.naturalWidth) return false;
  const zoom = photo.zoom || 1;
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * base;
  const dh = img.naturalHeight * base;
  const dx = rect.x + (rect.w - dw) / 2 + (photo.ox || 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (photo.oy || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  return true;
}

function gradeWash(ctx, rect, grade) {
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  wash.addColorStop(0, grade.tint[0]);
  wash.addColorStop(1, grade.tint[1]);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
  const shade = ctx.createLinearGradient(rect.x, rect.y + rect.h * 0.55, rect.x, rect.y + rect.h);
  shade.addColorStop(0, 'rgba(20, 4, 32, 0)');
  shade.addColorStop(1, 'rgba(20, 4, 32, 0.28)');
  ctx.fillStyle = shade;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

function fitFont(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

/** Draws the title block: script subtitle, big gradient caption, badge ribbon. */
export function drawTitleBlock(ctx, w, h, state, grade) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const badge = (state.badge || '').trim();
  const u = Math.min(w, h);

  // Scrim so lettering reads over any photo.
  const scrim = ctx.createLinearGradient(0, h * 0.68, 0, h);
  scrim.addColorStop(0, 'rgba(12, 4, 24, 0)');
  scrim.addColorStop(1, 'rgba(12, 4, 24, 0.82)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h * 0.68, w, h * 0.32);

  // Accent rule above the title, centred.
  ctx.fillStyle = grade.accent;
  ctx.fillRect(w * 0.42, h * 0.822, w * 0.16, Math.max(3, u * 0.006));

  if (subtitle) {
    const subSize = fitFont(ctx, subtitle, w * 0.86, u * 0.048, 'Pacifico, cursive');
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = grade.accent;
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = u * 0.012;
    ctx.fillText(subtitle, w / 2, h * 0.868);
    ctx.shadowBlur = 0;
  }
  if (title) {
    const size = fitFont(ctx, title, w * 0.9, u * 0.115, 'Anton, sans-serif');
    const grad = ctx.createLinearGradient(0, h * 0.88, 0, h * 0.985);
    grad.addColorStop(0, grade.title[0]);
    grad.addColorStop(0.55, grade.title[1]);
    grad.addColorStop(1, grade.title[2]);
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(16, 4, 28, 0.9)';
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.03;
    ctx.strokeText(title, w / 2, h * 0.972);
    ctx.fillStyle = grad;
    ctx.fillText(title, w / 2, h * 0.972);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  if (badge) {
    const pad = u * 0.018;
    const bSize = Math.max(11, u * 0.026);
    ctx.font = `${bSize}px Anton, sans-serif`;
    const tw = ctx.measureText(badge.toUpperCase()).width;
    const bw = tw + pad * 2;
    const bh = bSize * 1.9;
    const bx = w * 0.045;
    const by = h * 0.038;
    ctx.save();
    ctx.fillStyle = 'rgba(12, 4, 24, 0.72)';
    roundRectPath(ctx, bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.strokeStyle = grade.accent;
    ctx.lineWidth = Math.max(2, u * 0.003);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge.toUpperCase(), bx + bw / 2, by + bh / 2 + bSize * 0.06);
    ctx.restore();
  }
}

function drawGrain(ctx, w, h) {
  const rand = mulberry32(20261119);
  const count = Math.floor((w * h) / 1400);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const v = rand();
    ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(rand() * w, rand() * h, 1.6, 1.6);
  }
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(8,2,16,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/**
 * Draws the whole cover.
 * state: { layout, grade, frame, grain, title, subtitle, badge, panelPhotos }
 * photos: [{ img, zoom, ox, oy }, ...] — panelPhotos[i] is the photo index for panel i.
 * selectedPanel: index to outline in the editor, or -1.
 */
export function drawCover(canvas, state, photos, selectedPanel = -1) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const u = Math.min(w, h);

  // Sky gradient shows through the gutters and behind tilted snapshots.
  const sky = ctx.createLinearGradient(0, 0, w, h);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const panels = layoutPanels(state.layout, w, h);
  const gap = Math.max(2, u * 0.012);
  panels.forEach((panel, i) => {
    const photo = photos[state.panelPhotos?.[i] ?? 0];
    let rect = { x: panel.x, y: panel.y, w: panel.w, h: panel.h };
    if (state.layout !== 'tilted') {
      // Gutters between panels, flush at the outer edges.
      rect = {
        x: panel.x === 0 ? 0 : panel.x + gap / 2,
        y: panel.y === 0 ? 0 : panel.y + gap / 2,
        w: panel.w - gap,
        h: panel.h - gap,
      };
      if (panel.x === 0) rect.w += gap / 2;
      if (panel.y === 0) rect.h += gap / 2;
      if (panel.x + panel.w >= w - 1) rect.w = w - rect.x;
      if (panel.y + panel.h >= h - 1) rect.h = h - rect.y;
    }
    ctx.save();
    if (panel.tilt) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((panel.tilt * Math.PI) / 180);
      ctx.translate(-rect.w / 2, -rect.h / 2);
      ctx.fillStyle = '#fdf8ef';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = u * 0.03;
      ctx.shadowOffsetY = u * 0.012;
      const b = u * 0.014;
      ctx.fillRect(-b, -b, rect.w + b * 2, rect.h + b * 2);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      rect = { x: 0, y: 0, w: rect.w, h: rect.h };
    }
    const drawn = photo ? drawPhotoInto(ctx, photo, rect) : false;
    if (!drawn) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = Math.max(2, u * 0.004);
      ctx.setLineDash([u * 0.02, u * 0.014]);
      ctx.strokeRect(rect.x + u * 0.01, rect.y + u * 0.01, rect.w - u * 0.02, rect.h - u * 0.02);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      const fs = Math.max(12, u * 0.032);
      ctx.font = `${fs}px Anton, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
    } else {
      gradeWash(ctx, rect, grade);
    }
    ctx.restore();
    if (i === selectedPanel) {
      ctx.save();
      ctx.strokeStyle = '#ffc53d';
      ctx.lineWidth = Math.max(3, u * 0.008);
      ctx.setLineDash([u * 0.03, u * 0.018]);
      ctx.strokeRect(panel.x + 2, panel.y + 2, panel.w - 4, panel.h - 4);
      ctx.restore();
    }
  });

  drawTitleBlock(ctx, w, h, state, grade);
  if (state.grain) drawGrain(ctx, w, h);

  if (state.frame) {
    const fw = Math.max(4, u * 0.016);
    ctx.strokeStyle = '#fdf8ef';
    ctx.lineWidth = fw;
    ctx.strokeRect(fw / 2, fw / 2, w - fw, h - fw);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(1, u * 0.002);
    ctx.strokeRect(fw + 2, fw + 2, w - fw * 2 - 4, h - fw * 2 - 4);
  }
}

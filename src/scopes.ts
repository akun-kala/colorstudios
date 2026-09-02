export function drawHistogram(canvas: HTMLCanvasElement, imageData: ImageData): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#1c1a19';
  ctx.fillRect(0, 0, w, h);

  const rHist = new Array(256).fill(0);
  const gHist = new Array(256).fill(0);
  const bHist = new Array(256).fill(0);
  const lHist = new Array(256).fill(0);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    rHist[d[i]]++;
    gHist[d[i + 1]]++;
    bHist[d[i + 2]]++;
    const l = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    lHist[l]++;
  }

  const max = Math.max(...rHist, ...gHist, ...bHist, ...lHist, 1);
  const barW = w / 256;

  ctx.globalAlpha = 0.4;
  for (let ch = 0; ch < 4; ch++) {
    const hist = ch === 0 ? rHist : ch === 1 ? gHist : ch === 2 ? bHist : lHist;
    ctx.fillStyle = ch === 0 ? '#ff4444' : ch === 1 ? '#44ff44' : ch === 2 ? '#4444ff' : '#ffffff';
    for (let i = 0; i < 256; i++) {
      const bh = (hist[i] / max) * h * 0.9;
      ctx.fillRect(i * barW, h - bh, barW + 0.5, bh);
    }
  }
  ctx.globalAlpha = 1;
}

export function drawVectorscope(canvas: HTMLCanvasElement, imageData: ImageData): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;
  ctx.fillStyle = '#1c1a19';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#332e2b';
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.45, 0, Math.PI * 2);
  ctx.stroke();

  const d = imageData.data;
  const step = Math.max(1, Math.floor(d.length / 4 / 5000));
  ctx.fillStyle = 'rgba(200, 180, 160, 0.15)';

  for (let i = 0; i < d.length; i += 4 * step) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = (b - y) * 0.565;
    const cr = (r - y) * 0.713;
    const vx = cx + cb * w * 0.9;
    const vy = cy - cr * h * 0.9;
    ctx.fillRect(vx, vy, 1.5, 1.5);
  }

  ctx.fillStyle = '#c1440e';
  ctx.font = '9px sans-serif';
  ctx.fillText('R', cx + w * 0.38, cy);
  ctx.fillText('G', cx - w * 0.18, cy - h * 0.35);
  ctx.fillText('B', cx - w * 0.18, cy + h * 0.35);
}

export function drawWaveform(canvas: HTMLCanvasElement, imageData: ImageData): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#1c1a19';
  ctx.fillRect(0, 0, w, h);

  const d = imageData.data;
  const sw = imageData.width;
  const sh = imageData.height;
  const colStep = Math.max(1, Math.floor(sw / w));
  const rowStep = Math.max(1, Math.floor(sh / h));

  ctx.fillStyle = 'rgba(200, 180, 160, 0.08)';
  for (let x = 0; x < sw; x += colStep) {
    for (let y = 0; y < sh; y += rowStep) {
      const i = (y * sw + x) * 4;
      const luma = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const px = Math.floor((x / sw) * w);
      const py = h - Math.floor((luma / 255) * h);
      ctx.fillRect(px, py, 1, 1);
    }
  }

  ctx.strokeStyle = '#332e2b';
  for (let i = 1; i <= 3; i++) {
    const y = h * (i / 4);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

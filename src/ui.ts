import type { ImageStats, Mat3, SliderState, Preset, WorkerResponse } from './types';
import { createState, updateMKL, defaultSliders, loadPresets, savePresets, pushUndo, undo, redo } from './state';
import { WebGLRenderer } from './webgl';
import { generateCube } from './export/cube';
import { generateXmp } from './export/xmp';
import { generateLook } from './export/look';
import { generateVlt } from './export/vlt';
import { generateFcpXml } from './export/fcp';
import { generateHaldPng } from './export/hald';
import { drawHistogram, drawVectorscope, drawWaveform } from './scopes';

const state = createState();
interface BatchItem { original: ImageData; graded: ImageData; canvas: HTMLCanvasElement; sliders: SliderState; baselineSliders: SliderState; name: string; }

function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = imageData.width;
  c.height = imageData.height;
  c.getContext('2d')!.putImageData(imageData, 0, 0);
  return c;
}
let batchItems: BatchItem[] = [];
let batchFiles: File[] = [];
let targetFile: File | null = null;
let activeBatchIndex = -1;
const MIN_EXPORT_LONG_EDGE = 1200;
let isReprocessing = false;
let renderer: WebGLRenderer | null = null;
let worker: Worker | null = null;
let workerId = 0;
const pending = new Map<number, (res: WorkerResponse) => void>();
let splitRatio = 0.5;
let isBlinking = false;
let liveRenderRaf = 0;
let copiedSliders: SliderState | null = null;

function log(msg: string): void {
  const el = document.getElementById('debugLog');
  if (!el) return;
  const time = new Date().toLocaleTimeString('id-ID');
  const line = `[${time}] ${msg}`;
  if (el.textContent === 'Menunggu aktivitas...') el.textContent = '';
  el.textContent += line + '\n';
  el.scrollTop = el.scrollHeight;
  console.log(line);
}

function initWorker(): void {
  if (worker) return;
  worker = new Worker(new URL('./worker.ts?v=' + Date.now(), import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const res = e.data;
    const cb = pending.get(res.id);
    if (cb) { pending.delete(res.id); cb(res); }
  };
  worker.onerror = (err) => log('❌ Worker error: ' + err.message);
}

function postToWorker(type: WorkerResponse['type'], payload: any): Promise<WorkerResponse> {
  return new Promise((resolve) => {
    if (!worker) { log('Worker belum diinisialisasi'); return; }
    const id = ++workerId;
    pending.set(id, resolve);
    worker.postMessage({ id, type, payload });
  });
}

function loadImageToImageData(file: File, maxDim: number): Promise<{ data: ImageData; url: string; w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        let w = img.width, h = img.height;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        w = Math.round(w * scale); h = Math.round(h * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ data: ctx.getImageData(0, 0, w, h), url: e.target!.result as string, w, h });
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Dipakai khusus untuk export/download: TIDAK mendownscale foto besar (beda dari
// loadImageToImageData yang membatasi resolusi kerja demi kecepatan live-editing).
// Kalau foto sumber ternyata lebih kecil dari minLongEdge, di-upscale seperlunya
// supaya hasil download tidak pernah di bawah ambang minimum.
function loadImageForExport(file: File, minLongEdge: number): Promise<{ data: ImageData; w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        let w = img.width, h = img.height;
        const longEdge = Math.max(w, h);
        if (longEdge < minLongEdge) {
          const scale = minLongEdge / longEdge;
          w = Math.round(w * scale); h = Math.round(h * scale);
          log('⚠ Foto sumber (' + Math.round(longEdge) + 'px) di bawah ' + minLongEdge + 'px, di-upscale ke ' + w + 'x' + h + ' — kualitas mungkin sedikit lembut');
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ data: ctx.getImageData(0, 0, w, h), w, h });
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

async function downloadGradedJpg(sourceFile: File, sliders: SliderState, filename: string): Promise<void> {
  if (!state.sampleStats || !state.targetStats || !state.mklA) return;
  const { data, w, h } = await loadImageForExport(sourceFile, MIN_EXPORT_LONG_EDGE);
  const res = await postToWorker('transformImage', {
    targetData: data, sampleStats: state.sampleStats, targetStats: state.targetStats, mklA: state.mklA, sliders,
  });
  if (res.error || !res.imageData) { log('❌ Export gagal: ' + (res.error || 'unknown')); return; }
  log('Export ' + filename + ' (' + w + 'x' + h + ')');
  const canvas = imageDataToCanvas(res.imageData);
  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      }
      resolve();
    }, 'image/jpeg', 0.95);
  });
}

const els = {
  dropSample: document.getElementById('dropSample') as HTMLDivElement,
  dropTarget: document.getElementById('dropTarget') as HTMLDivElement,
  fileSample: document.getElementById('fileSample') as HTMLInputElement,
  fileTarget: document.getElementById('fileTarget') as HTMLInputElement,
  dropSampleContent: document.getElementById('dropSampleContent') as HTMLDivElement,
  dropTargetContent: document.getElementById('dropTargetContent') as HTMLDivElement,
  btnProcess: document.getElementById('btnProcess') as HTMLButtonElement,
  btnBatchProcess: document.getElementById('btnBatchProcess') as HTMLButtonElement,
  btnBlink: document.getElementById('btnBlink') as HTMLButtonElement,
  previewBox: document.getElementById('previewBox') as HTMLDivElement,
  previewWrap: document.querySelector('.preview-wrap') as HTMLDivElement,
  colorTooltip: document.getElementById('colorTooltip') as HTMLDivElement,
  mismatchWarning: document.getElementById('mismatchWarning') as HTMLDivElement,
  exportStatus: document.getElementById('exportStatus') as HTMLDivElement,
  btnCube: document.getElementById('btnCube') as HTMLButtonElement,
  btnXmp: document.getElementById('btnXmp') as HTMLButtonElement,
  btnLook: document.getElementById('btnLook') as HTMLButtonElement,
  btnVlt: document.getElementById('btnVlt') as HTMLButtonElement,
  btnFcp: document.getElementById('btnFcp') as HTMLButtonElement,
  btnHald: document.getElementById('btnHald') as HTMLButtonElement,
  btnJpg: document.getElementById('btnJpg') as HTMLButtonElement,
  btnSavePreset: document.getElementById('btnSavePreset') as HTMLButtonElement,
  presetName: document.getElementById('presetName') as HTMLInputElement,
  presetList: document.getElementById('presetList') as HTMLDivElement,
  btnResetKoreksi: document.getElementById('btnResetKoreksi') as HTMLButtonElement,
  btnUndo: document.getElementById('btnUndo') as HTMLButtonElement,
  btnRedo: document.getElementById('btnRedo') as HTMLButtonElement,
  btnZoomIn: document.getElementById('btnZoomIn') as HTMLButtonElement,
  btnZoomOut: document.getElementById('btnZoomOut') as HTMLButtonElement,
  btnZoomReset: document.getElementById('btnZoomReset') as HTMLButtonElement,
  zoomLabel: document.getElementById('zoomLabel') as HTMLSpanElement,
  btnSplitToggle: document.getElementById('btnSplitToggle') as HTMLButtonElement,
  scopesPanel: document.getElementById('scopesPanel') as HTMLDivElement,
  histogramCanvas: document.getElementById('histogramCanvas') as HTMLCanvasElement,
  vectorscopeCanvas: document.getElementById('vectorscopeCanvas') as HTMLCanvasElement,
  waveformCanvas: document.getElementById('waveformCanvas') as HTMLCanvasElement,
  debugLog: document.getElementById('debugLog') as HTMLDivElement,
  batchGalleryPanel: document.getElementById('batchGalleryPanel') as HTMLDivElement,
  batchGallery: document.getElementById('batchGallery') as HTMLDivElement,
  btnDownloadAll: document.getElementById('btnDownloadAll') as HTMLButtonElement,
  btnClearGallery: document.getElementById('btnClearGallery') as HTMLButtonElement,
  setupPanel: document.getElementById('setupPanel') as HTMLDivElement,
  setupCollapsedBar: document.getElementById('setupCollapsedBar') as HTMLDivElement,
  btnToggleSetup: document.getElementById('btnToggleSetup') as HTMLButtonElement,
  splitDivider: document.getElementById('splitDivider') as HTMLDivElement,
  labelBefore: document.getElementById('labelBefore') as HTMLSpanElement,
  labelAfter: document.getElementById('labelAfter') as HTMLSpanElement,
  btnCopySettings: document.getElementById('btnCopySettings') as HTMLButtonElement,
  btnPasteSettings: document.getElementById('btnPasteSettings') as HTMLButtonElement,
  btnPasteAllSettings: document.getElementById('btnPasteAllSettings') as HTMLButtonElement,
  copyStatus: document.getElementById('copyStatus') as HTMLDivElement,
  filmstripCount: document.getElementById('filmstripCount') as HTMLSpanElement,
};

const sliderDefs: { id: string; key: keyof SliderState; fmt: (v: number) => string; def: number; min: number; max: number }[] = [
  { id: 'strengthTone', key: 'strengthTone', fmt: (v) => v + '%', def: 100, min: 0, max: 100 },
  { id: 'strengthColor', key: 'strengthColor', fmt: (v) => v + '%', def: 60, min: 0, max: 100 },
  { id: 'exposure', key: 'exposure', fmt: (v) => (v / 100).toFixed(2) + ' EV', def: 0, min: -200, max: 200 },
  { id: 'contrast', key: 'contrast', fmt: (v) => String(v), def: 0, min: -50, max: 50 },
  { id: 'temp', key: 'temp', fmt: (v) => String(v), def: 0, min: -50, max: 50 },
  { id: 'tint', key: 'tint', fmt: (v) => String(v), def: 0, min: -50, max: 50 },
  { id: 'saturation', key: 'saturation', fmt: (v) => String(v), def: 0, min: -50, max: 50 },
];

function bindSliders(): void {
  for (const d of sliderDefs) {
    const el = document.getElementById('s-' + d.id) as HTMLInputElement;
    const label = document.getElementById('v-' + d.id) as HTMLSpanElement;
    el.min = String(d.min); el.max = String(d.max); el.value = String(state.sliders[d.key]);
    label.textContent = d.fmt(state.sliders[d.key]);
    el.addEventListener('input', () => {
      const raw = parseFloat(el.value);
      state.sliders[d.key] = raw;
      label.textContent = d.fmt(raw);
      onSliderChange();
    });
    el.addEventListener('change', () => pushUndo(state));
  }

  const lowEl = document.getElementById('s-hueProtectLow') as HTMLInputElement;
  const highEl = document.getElementById('s-hueProtectHigh') as HTMLInputElement;
  const strEl = document.getElementById('s-hueProtectStrength') as HTMLInputElement;
  const label = document.getElementById('v-hueProtect') as HTMLSpanElement;
  const strLabel = document.getElementById('v-hueProtectStrength') as HTMLSpanElement;

  lowEl.value = String(state.sliders.hueProtectLow);
  highEl.value = String(state.sliders.hueProtectHigh);
  strEl.value = String(state.sliders.hueProtectStrength);
  label.textContent = state.sliders.hueProtectLow === 0 && state.sliders.hueProtectHigh === 0 ? 'Off' : `${state.sliders.hueProtectLow}° - ${state.sliders.hueProtectHigh}°`;
  strLabel.textContent = state.sliders.hueProtectStrength + '%';

  function updateHue() {
    state.sliders.hueProtectLow = parseFloat(lowEl.value);
    state.sliders.hueProtectHigh = parseFloat(highEl.value);
    state.sliders.hueProtectStrength = parseFloat(strEl.value);
    label.textContent = state.sliders.hueProtectLow === 0 && state.sliders.hueProtectHigh === 0 ? 'Off' : `${state.sliders.hueProtectLow}° - ${state.sliders.hueProtectHigh}°`;
    strLabel.textContent = state.sliders.hueProtectStrength + '%';
    onSliderChange();
  }

  lowEl.addEventListener('input', updateHue);
  highEl.addEventListener('input', updateHue);
  strEl.addEventListener('input', updateHue);
  lowEl.addEventListener('change', () => pushUndo(state));
  highEl.addEventListener('change', () => pushUndo(state));
  strEl.addEventListener('change', () => pushUndo(state));
}

function onSliderChange(): void {
  if (activeBatchIndex >= 0 && batchItems[activeBatchIndex]) {
    batchItems[activeBatchIndex].sliders = { ...state.sliders };
  }
  if (state.hasProcessed) {
    cancelAnimationFrame(liveRenderRaf);
    liveRenderRaf = requestAnimationFrame(renderPreview);
  }
  updateUndoRedoButtons();
}

function setSlidersDisabled(disabled: boolean): void {
  for (const d of sliderDefs) {
    (document.getElementById('s-' + d.id) as HTMLInputElement).disabled = disabled;
  }
  (document.getElementById('s-hueProtectLow') as HTMLInputElement).disabled = disabled;
  (document.getElementById('s-hueProtectHigh') as HTMLInputElement).disabled = disabled;
  (document.getElementById('s-hueProtectStrength') as HTMLInputElement).disabled = disabled;
}

// --- Copy / Paste pengaturan (semua slider) antar foto ---
function updateCopyPasteButtons(): void {
  els.btnCopySettings.disabled = !state.hasProcessed;
  els.btnPasteSettings.disabled = !state.hasProcessed || !copiedSliders;
  const showPasteAll = batchItems.length > 1;
  els.btnPasteAllSettings.style.display = showPasteAll ? 'inline-block' : 'none';
  els.btnPasteAllSettings.disabled = !showPasteAll || !copiedSliders;
}

els.btnCopySettings.addEventListener('click', () => {
  if (!state.hasProcessed) return;
  copiedSliders = { ...state.sliders };
  els.copyStatus.textContent = 'Pengaturan foto ini disalin ✓ — buka/pilih foto lain lalu klik "Paste Pengaturan".';
  updateCopyPasteButtons();
});

els.btnPasteSettings.addEventListener('click', () => {
  if (!copiedSliders || !state.hasProcessed) return;
  pushUndo(state);
  state.sliders = { ...copiedSliders };
  populateSliderUI(state.sliders);
  onSliderChange();
  els.copyStatus.textContent = 'Pengaturan ditempel ke foto ini ✓';
});

els.btnPasteAllSettings.addEventListener('click', async () => {
  if (!copiedSliders || !state.sampleStats || !state.targetStats || !state.mklA || !state.batchTargets || batchItems.length === 0) return;
  pushUndo(state);
  els.btnPasteAllSettings.disabled = true;
  els.btnPasteAllSettings.textContent = 'Menerapkan...';
  try {
    const res = await postToWorker('batchTransform', {
      batchTargets: state.batchTargets,
      sampleStats: state.sampleStats,
      targetStats: state.targetStats,
      mklA: state.mklA,
      sliders: copiedSliders,
    });
    if (res.error || !res.batchResults) throw new Error(res.error || 'Gagal menerapkan ke semua foto');
    for (let i = 0; i < batchItems.length; i++) {
      batchItems[i].sliders = { ...copiedSliders };
      batchItems[i].graded = res.batchResults[i];
      batchItems[i].canvas = imageDataToCanvas(res.batchResults[i]);
      updateThumbnail(i);
    }
    state.sliders = { ...copiedSliders };
    populateSliderUI(state.sliders);
    updateUndoRedoButtons();
    if (activeBatchIndex >= 0) await renderPreview();
    els.copyStatus.textContent = `Pengaturan diterapkan ke ${batchItems.length} foto batch ✓`;
    els.exportStatus.textContent = `Pengaturan diterapkan ke semua ${batchItems.length} foto batch.`;
  } catch (err) {
    log('❌ Terapkan ke semua batch gagal: ' + (err instanceof Error ? err.message : String(err)));
  } finally {
    els.btnPasteAllSettings.textContent = 'Terapkan ke Semua Batch';
    updateCopyPasteButtons();
  }
});

function setupDrop(dropId: string, fileId: string, isSample: boolean): void {
  const drop = document.getElementById(dropId) as HTMLDivElement;
  const input = document.getElementById(fileId) as HTMLInputElement;

  input.addEventListener('change', (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;
    if (isSample) { handleFile(files[0], true); }
    else { files.length === 1 ? handleFile(files[0], false) : handleBatch(Array.from(files)); }
  });

  // Klik di seluruh area drop zone membuka file picker
  drop.addEventListener('click', (e) => {
    // Hanya trigger kalau klik di drop zone itu sendiri, bukan di tombol internal (kalau ada)
    if (e.target === drop || (e.target as HTMLElement).classList.contains('drop-content') || (e.target as HTMLElement).classList.contains('hint')) {
      input.click();
    }
  });

  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.style.borderColor = 'var(--accent)'; });
  drop.addEventListener('dragleave', () => { drop.style.borderColor = 'var(--line)'; });
  drop.addEventListener('drop', (e) => {
    e.preventDefault(); drop.style.borderColor = 'var(--line)';
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    if (isSample) { handleFile(files[0], true); }
    else { files.length === 1 ? handleFile(files[0], false) : handleBatch(Array.from(files)); }
  });
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
  });
}

async function handleFile(file: File, isSample: boolean): Promise<void> {
  log('Upload: ' + (isSample ? 'sample' : 'target') + ' ("' + file.name + '")');
  const maxDim = isSample ? 500 : 1200;
  const { data, url, w, h } = await loadImageToImageData(file, maxDim);

  if (isSample) {
    const res = await postToWorker('computeStats', { imageData: data });
    if (res.error || !res.result) { log('❌ computeStats sample gagal'); return; }
    state.sampleStats = res.result;
    els.dropSample.classList.add('filled');
    els.dropSampleContent.innerHTML = '<img src="' + url + '" alt="Sample preview">';
  } else {
    state.targetImageData = data;
    targetFile = file;
    state.batchTargets = null;
    batchFiles = [];
    els.btnBatchProcess.style.display = 'none';
    const res = await postToWorker('computeStats', { imageData: data });
    if (res.error || !res.result) { log('❌ computeStats target gagal'); return; }
    state.targetStats = res.result;
    els.dropTarget.classList.add('filled');
    els.dropTargetContent.innerHTML = '<img src="' + url + '" alt="Target preview">';
  }
  log((isSample ? 'Sample' : 'Target') + ' OK (' + w + 'x' + h + ')');
  resetAfterNewInput();
}

async function handleBatch(files: File[]): Promise<void> {
  log('Batch upload: ' + files.length + ' files');
  const targets: ImageData[] = [];
  for (const file of files) {
    const { data } = await loadImageToImageData(file, 1200);
    targets.push(data);
  }
  state.batchTargets = targets;
  batchFiles = files;
  state.targetImageData = targets[0];
  const res = await postToWorker('computeStats', { imageData: targets[0] });
  if (res.error || !res.result) return;
  state.targetStats = res.result;
  els.dropTarget.classList.add('filled');
  els.dropTargetContent.innerHTML = '<div class="hint"><b>' + files.length + ' foto</b>siap proses batch</div>';
  els.btnBatchProcess.style.display = 'inline-block';
  resetAfterNewInput();
}

function resetAfterNewInput(): void {
  state.hasProcessed = false; state.mklA = null;
  activeBatchIndex = -1;
  batchItems = [];
  els.batchGallery.innerHTML = '';
  els.batchGalleryPanel.style.display = 'none';
  const ready = !!(state.sampleStats && state.targetStats && state.targetImageData);
  els.btnProcess.disabled = !ready;
  els.btnBatchProcess.disabled = !ready;
  els.btnProcess.textContent = 'Proses Warna';
  els.mismatchWarning.style.display = 'none';
  els.previewBox.innerHTML = '<div class="empty">' + (ready ? 'Siap diproses — tekan "Proses Warna"' : 'Upload foto sample & target') + '</div>';
  setSlidersDisabled(true);
  [els.btnCube, els.btnXmp, els.btnLook, els.btnVlt, els.btnFcp, els.btnHald, els.btnJpg, els.btnSavePreset, els.btnBlink].forEach(b => b.disabled = true);
  els.scopesPanel.style.display = 'none';
  setSetupCollapsed(false);
  updateCopyPasteButtons();
}

els.btnProcess.addEventListener('click', async () => {
  if (!state.sampleStats || !state.targetStats || !state.targetImageData) return;
  log('Proses Warna dimulai');
  els.btnProcess.disabled = true;
  els.btnProcess.textContent = 'Memproses...';
  els.previewBox.innerHTML = '<div class="spinner"></div><div class="empty">Memproses...</div>';
  try {
    updateMKL(state);
    log('MKL: ' + (state.mklA ? 'OK' : 'GAGAL'));
    checkHueMismatch();
    state.hasProcessed = true;
    await renderPreview();
    setSlidersDisabled(false);
    els.btnProcess.textContent = 'Proses Ulang';
    els.btnBlink.disabled = false;
    els.scopesPanel.style.display = 'flex';
    setSetupCollapsed(true);
    updateCopyPasteButtons();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log('❌ ' + msg);
    els.previewBox.innerHTML = '<div class="empty">Error: ' + msg + '</div>';
    els.btnProcess.textContent = 'Proses Warna';
  } finally {
    els.btnProcess.disabled = false;
  }
});

els.btnBatchProcess.addEventListener('click', async () => {
  if (!state.sampleStats || !state.targetStats || !state.batchTargets || !state.mklA) return;
  els.btnBatchProcess.disabled = true;
  els.btnBatchProcess.textContent = 'Memproses Batch...';
  log('Batch processing ' + state.batchTargets.length + ' images');
  try {
    const res = await postToWorker('batchTransform', {
      batchTargets: state.batchTargets,
      sampleStats: state.sampleStats,
      targetStats: state.targetStats,
      mklA: state.mklA,
      sliders: state.sliders,
    });
    if (res.error) throw new Error(res.error);
    if (!res.batchResults || !Array.isArray(res.batchResults)) throw new Error('Batch results empty or invalid');

    batchItems = [];
    for (let i = 0; i < res.batchResults.length; i++) {
      batchItems.push({
        original: state.batchTargets[i],
        graded: res.batchResults[i],
        canvas: imageDataToCanvas(res.batchResults[i]),
        sliders: { ...state.sliders },
        baselineSliders: { ...state.sliders },
        name: 'graded_' + (i + 1) + '.jpg'
      });
    }

    renderBatchGallery();
    els.batchGalleryPanel.style.display = 'block';
    els.exportStatus.textContent = 'Batch selesai — ' + batchItems.length + ' foto. Klik foto atau pakai panah kiri/kanan untuk edit.';
    log('Batch selesai — ' + batchItems.length + ' foto');
    await selectBatchPhoto(0);
  } catch (err) {
    log('❌ Batch error: ' + (err instanceof Error ? err.message : String(err)));
  } finally {
    els.btnBatchProcess.disabled = false;
    els.btnBatchProcess.textContent = 'Proses Batch';
  }
});

function renderBatchGallery(): void {
  els.batchGallery.innerHTML = '';
  batchItems.forEach((item, index) => {
    const thumb = document.createElement('div');
    thumb.className = 'batch-thumb';
    thumb.id = 'batch-thumb-' + index;
    thumb.setAttribute('role', 'button');
    thumb.setAttribute('tabindex', '0');
    thumb.setAttribute('aria-label', 'Edit ' + item.name);
    thumb.innerHTML = `<img src="${item.canvas.toDataURL('image/jpeg', 0.85)}" alt="${item.name}"><span class="batch-thumb-name">${item.name}</span>`;
    thumb.addEventListener('click', () => selectBatchPhoto(index));
    thumb.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectBatchPhoto(index); } });
    els.batchGallery.appendChild(thumb);
  });
  highlightActiveThumbnail(activeBatchIndex);
  els.filmstripCount.textContent = '(' + batchItems.length + ' foto)';
  updateCopyPasteButtons();
}

function updateThumbnail(index: number): void {
  const item = batchItems[index];
  if (!item) return;
  const thumb = document.getElementById('batch-thumb-' + index);
  const img = thumb?.querySelector('img') as HTMLImageElement | null;
  if (img) img.src = item.canvas.toDataURL('image/jpeg', 0.85);
}

function highlightActiveThumbnail(index: number): void {
  els.batchGallery.querySelectorAll('.batch-thumb').forEach(el => el.classList.remove('active'));
  const thumb = document.getElementById('batch-thumb-' + index);
  thumb?.classList.add('active');
  thumb?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

// Memuat foto batch terpilih ke editor utama (preview besar + panel KOREKSI + scopes)
// — bukan modal terpisah, supaya histogram/vectorscope/waveform ikut aktif.
async function selectBatchPhoto(index: number): Promise<void> {
  if (index < 0 || index >= batchItems.length) return;
  activeBatchIndex = index;
  const item = batchItems[index];
  state.targetImageData = item.original;
  state.sliders = { ...item.sliders };
  populateSliderUI(state.sliders);
  state.hasProcessed = true;
  setSlidersDisabled(false);
  els.btnBlink.disabled = false;
  els.scopesPanel.style.display = 'flex';
  highlightActiveThumbnail(index);
  updateUndoRedoButtons();
  setSetupCollapsed(true);
  updateCopyPasteButtons();
  await renderPreview();
}

// Sinkronkan tampilan slider utama ("KOREKSI") ke suatu SliderState tanpa memasang ulang listener.
function populateSliderUI(sliders: SliderState): void {
  for (const d of sliderDefs) {
    const el = document.getElementById('s-' + d.id) as HTMLInputElement | null;
    const label = document.getElementById('v-' + d.id) as HTMLSpanElement | null;
    if (!el || !label) continue;
    el.value = String(sliders[d.key]);
    label.textContent = d.fmt(sliders[d.key]);
  }
  const lowEl = document.getElementById('s-hueProtectLow') as HTMLInputElement;
  const highEl = document.getElementById('s-hueProtectHigh') as HTMLInputElement;
  const strEl = document.getElementById('s-hueProtectStrength') as HTMLInputElement;
  const label = document.getElementById('v-hueProtect') as HTMLSpanElement;
  const strLabel = document.getElementById('v-hueProtectStrength') as HTMLSpanElement;
  lowEl.value = String(sliders.hueProtectLow);
  highEl.value = String(sliders.hueProtectHigh);
  strEl.value = String(sliders.hueProtectStrength);
  label.textContent = sliders.hueProtectLow === 0 && sliders.hueProtectHigh === 0 ? 'Off' : `${sliders.hueProtectLow}° - ${sliders.hueProtectHigh}°`;
  strLabel.textContent = sliders.hueProtectStrength + '%';
}

// Navigasi kanan/kiri antar foto batch — tombol panah keyboard, aktif hanya saat
// gallery batch ada isinya dan fokus tidak sedang di input/slider.
document.addEventListener('keydown', (e) => {
  if (batchItems.length === 0) return;
  if (els.batchGalleryPanel.style.display === 'none') return;
  const tag = (document.activeElement?.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); selectBatchPhoto(Math.max(0, activeBatchIndex - 1)); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); selectBatchPhoto(Math.min(batchItems.length - 1, activeBatchIndex + 1)); }
});

els.btnJpg.addEventListener('click', async () => {
  els.btnJpg.disabled = true;
  try {
    if (activeBatchIndex >= 0 && batchItems[activeBatchIndex]) {
      const item = batchItems[activeBatchIndex];
      const file = batchFiles[activeBatchIndex];
      if (!file) { log('❌ File asli foto ini tidak ditemukan'); return; }
      await downloadGradedJpg(file, item.sliders, item.name);
    } else {
      if (!targetFile) { log('❌ File target asli tidak ditemukan'); return; }
      await downloadGradedJpg(targetFile, state.sliders, 'graded.jpg');
    }
  } finally {
    els.btnJpg.disabled = false;
  }
});

els.btnDownloadAll.addEventListener('click', async () => {
  if (batchItems.length === 0) return;
  log('Download semua ' + batchItems.length + ' foto (resolusi penuh, min ' + MIN_EXPORT_LONG_EDGE + 'px)...');
  els.btnDownloadAll.disabled = true;
  for (let i = 0; i < batchItems.length; i++) {
    const file = batchFiles[i];
    if (!file) continue;
    await downloadGradedJpg(file, batchItems[i].sliders, batchItems[i].name);
    await new Promise(r => setTimeout(r, 200));
  }
  els.btnDownloadAll.disabled = false;
  els.exportStatus.textContent = 'Semua foto berhasil diunduh (resolusi penuh).';
});

els.btnClearGallery.addEventListener('click', () => {
  batchItems = [];
  batchFiles = [];
  activeBatchIndex = -1;
  els.batchGallery.innerHTML = '';
  els.batchGalleryPanel.style.display = 'none';
  els.exportStatus.textContent = 'Gallery dibersihkan.';
  updateCopyPasteButtons();
});

function checkHueMismatch(): void {
  if (!state.sampleStats || !state.targetStats) { els.mismatchWarning.style.display = 'none'; return; }
  const hueS = Math.atan2(state.sampleStats.meanB, state.sampleStats.meanA) * 180 / Math.PI;
  const hueT = Math.atan2(state.targetStats.meanB, state.targetStats.meanA) * 180 / Math.PI;
  let diff = Math.abs(hueS - hueT);
  if (diff > 180) diff = 360 - diff;
  if (diff > 60) {
    els.mismatchWarning.style.display = 'block';
    els.mismatchWarning.innerHTML = '<b>Perhatian:</b> karakter warna dominan berbeda jauh. Coba turunkan "Kekuatan Warna".';
  } else {
    els.mismatchWarning.style.display = 'none';
  }
}

async function renderPreview(): Promise<void> {
  if (!state.targetImageData || !state.sampleStats || !state.targetStats || !state.mklA) return;
  if (!renderer) {
    try {
      const canvas = document.createElement('canvas');
      renderer = new WebGLRenderer(canvas);
      setupPreviewInteractions(canvas);
    } catch (e) {
      log('WebGL unavailable, fallback CPU');
      renderer = null;
    }
  }
  let gradedImageData: ImageData;
  if (renderer) {
    renderer.setSourceImage(state.targetImageData);
    renderer.updateLUT(state.sampleStats, state.targetStats, state.mklA, state.sliders);
    const w = state.targetImageData.width, h = state.targetImageData.height;
    const splitX = state.showSplit ? splitRatio : 2;
    renderer.render(w, h, splitX, state.showSplit && !isBlinking);
    const canvas = renderer.getCanvas();
    canvas.style.maxWidth = '100%';
    canvas.style.maxHeight = '520px';
    canvas.style.transform = `scale(${state.zoom.scale}) translate(${state.zoom.panX}px, ${state.zoom.panY}px)`;
    if (!els.previewBox.contains(canvas)) { els.previewBox.innerHTML = ''; els.previewBox.appendChild(canvas); els.previewBox.appendChild(els.splitDivider); els.previewBox.appendChild(els.labelBefore); els.previewBox.appendChild(els.labelAfter); }
    updateDividerPosition(canvas);
    // Scopes harus mencerminkan hasil grading, bukan foto asli — baca ulang piksel dari GPU.
    // Saat split/blink aktif, sisi kiri kanvas masih original; scopes tetap pakai hasil full-graded (splitX=2) agar akurat.
    if (state.showSplit || isBlinking) {
      renderer.render(w, h, 2, false);
      gradedImageData = renderer.readPixels(w, h);
      renderer.render(w, h, splitX, state.showSplit && !isBlinking);
    } else {
      gradedImageData = renderer.readPixels(w, h);
    }
  } else {
    const res = await postToWorker('transformImage', {
      targetData: state.targetImageData, sampleStats: state.sampleStats,
      targetStats: state.targetStats, mklA: state.mklA, sliders: state.sliders,
    });
    if (res.error || !res.imageData) throw new Error(res.error || 'Transform failed');
    gradedImageData = res.imageData;
    const c = document.createElement('canvas');
    c.width = gradedImageData.width; c.height = gradedImageData.height;
    c.getContext('2d')!.putImageData(gradedImageData, 0, 0);
    els.previewBox.innerHTML = ''; els.previewBox.appendChild(c);
    els.previewBox.appendChild(els.splitDivider); els.previewBox.appendChild(els.labelBefore); els.previewBox.appendChild(els.labelAfter);
    updateDividerPosition(c);
  }
  [els.btnCube, els.btnXmp, els.btnLook, els.btnVlt, els.btnFcp, els.btnHald, els.btnJpg, els.btnSavePreset].forEach(b => b.disabled = false);
  updateScopes(gradedImageData);

  // Kalau yang sedang di-edit adalah salah satu foto batch, simpan hasilnya ke item itu
  // (untuk thumbnail gallery) — resolusi tetap resolusi kerja, bukan resolusi download.
  if (activeBatchIndex >= 0 && batchItems[activeBatchIndex]) {
    const item = batchItems[activeBatchIndex];
    item.graded = gradedImageData;
    item.canvas = imageDataToCanvas(gradedImageData);
    updateThumbnail(activeBatchIndex);
  }
}

function updateScopes(gradedImageData: ImageData): void {
  if (!state.hasProcessed) return;
  drawHistogram(els.histogramCanvas, gradedImageData);
  drawVectorscope(els.vectorscopeCanvas, gradedImageData);
  drawWaveform(els.waveformCanvas, gradedImageData);
}


function setupPreviewInteractions(canvas: HTMLCanvasElement): void {
  canvas.style.cursor = 'grab';

  canvas.addEventListener('mousemove', (e) => {
    if (!state.targetImageData) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.offsetX / rect.width) * state.targetImageData.width);
    const y = Math.floor((e.offsetY / rect.height) * state.targetImageData.height);
    if (x < 0 || x >= state.targetImageData.width || y < 0 || y >= state.targetImageData.height) return;
    const i = (y * state.targetImageData.width + x) * 4;
    const r = state.targetImageData.data[i], g = state.targetImageData.data[i+1], b = state.targetImageData.data[i+2];
    els.colorTooltip.style.display = 'block';
    els.colorTooltip.style.left = (e.pageX + 12) + 'px';
    els.colorTooltip.style.top = (e.pageY + 12) + 'px';
    els.colorTooltip.innerHTML = `RGB(${r},${g},${b})`;
  });
  canvas.addEventListener('mouseleave', () => { els.colorTooltip.style.display = 'none'; });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    state.zoom.scale = Math.max(0.5, Math.min(4, state.zoom.scale * delta));
    updateZoomDisplay();
    requestAnimationFrame(renderPreview);
  }, { passive: false });

  // --- Pan (1 pointer) + pinch-zoom (2 pointers), unified for mouse/touch/pen ---
  const activePointers = new Map<number, { x: number; y: number }>();
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let panPointerId: number | null = null;

  function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button > 0) return;
    canvas.setPointerCapture(e.pointerId);
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 1) {
      panPointerId = e.pointerId;
      state.zoom.isDragging = true;
      state.zoom.lastX = e.clientX;
      state.zoom.lastY = e.clientY;
      canvas.style.cursor = 'grabbing';
    } else if (activePointers.size === 2) {
      state.zoom.isDragging = false; // stop panning, switch to pinch
      const pts = Array.from(activePointers.values());
      pinchStartDist = dist(pts[0], pts[1]);
      pinchStartScale = state.zoom.scale;
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 2) {
      const pts = Array.from(activePointers.values());
      const d = dist(pts[0], pts[1]);
      if (pinchStartDist > 0) {
        state.zoom.scale = Math.max(0.5, Math.min(4, pinchStartScale * (d / pinchStartDist)));
        updateZoomDisplay();
        requestAnimationFrame(renderPreview);
      }
      return;
    }

    if (state.zoom.isDragging && e.pointerId === panPointerId) {
      state.zoom.panX += (e.clientX - state.zoom.lastX) / state.zoom.scale;
      state.zoom.panY += (e.clientY - state.zoom.lastY) / state.zoom.scale;
      state.zoom.lastX = e.clientX;
      state.zoom.lastY = e.clientY;
      requestAnimationFrame(renderPreview);
    }
  });

  function endPointer(e: PointerEvent): void {
    activePointers.delete(e.pointerId);
    if (e.pointerId === panPointerId) { state.zoom.isDragging = false; panPointerId = null; canvas.style.cursor = 'grab'; }
    if (activePointers.size === 1) {
      // one finger remains after a pinch — resume panning with it
      const [[id, pt]] = Array.from(activePointers.entries());
      panPointerId = id;
      state.zoom.isDragging = true;
      state.zoom.lastX = pt.x;
      state.zoom.lastY = pt.y;
    }
    pinchStartDist = 0;
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  // double-click / double-tap resets zoom — standard photo-viewer gesture
  let lastTapTime = 0;
  canvas.addEventListener('pointerup', () => {
    const now = Date.now();
    if (now - lastTapTime < 300 && activePointers.size === 0) {
      els.btnZoomReset.click();
    }
    lastTapTime = now;
  });

  setupDividerDrag(canvas);
}

// --- Draggable before/after divider (mouse + touch via Pointer Events) ---
function setupDividerDrag(canvas: HTMLCanvasElement): void {
  let dragging = false;

  function ratioFromClientX(clientX: number): number {
    const rect = canvas.getBoundingClientRect();
    const r = (clientX - rect.left) / rect.width;
    return Math.max(0.02, Math.min(0.98, r));
  }

  els.splitDivider.addEventListener('pointerdown', (e) => {
    if (!state.showSplit) return;
    dragging = true;
    els.splitDivider.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  els.splitDivider.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    splitRatio = ratioFromClientX(e.clientX);
    updateDividerPosition(canvas);
    requestAnimationFrame(renderPreview);
  });
  function stopDrag() { dragging = false; }
  els.splitDivider.addEventListener('pointerup', stopDrag);
  els.splitDivider.addEventListener('pointercancel', stopDrag);
}

function updateDividerPosition(canvas: HTMLCanvasElement): void {
  if (!state.showSplit) {
    els.splitDivider.classList.remove('active');
    els.labelBefore.classList.remove('active');
    els.labelAfter.classList.remove('active');
    return;
  }
  const canvasRect = canvas.getBoundingClientRect();
  const boxRect = els.previewBox.getBoundingClientRect();
  const left = (canvasRect.left - boxRect.left) + splitRatio * canvasRect.width;
  els.splitDivider.style.left = left + 'px';
  els.splitDivider.style.top = (canvasRect.top - boxRect.top) + 'px';
  els.splitDivider.style.height = canvasRect.height + 'px';
  els.splitDivider.classList.add('active');
  els.labelBefore.classList.add('active');
  els.labelAfter.classList.add('active');
}

function updateZoomDisplay(): void { els.zoomLabel.textContent = Math.round(state.zoom.scale * 100) + '%'; }

els.btnZoomIn.addEventListener('click', () => { state.zoom.scale = Math.min(4, state.zoom.scale * 1.2); updateZoomDisplay(); if (state.hasProcessed) requestAnimationFrame(renderPreview); });
els.btnZoomOut.addEventListener('click', () => { state.zoom.scale = Math.max(0.5, state.zoom.scale / 1.2); updateZoomDisplay(); if (state.hasProcessed) requestAnimationFrame(renderPreview); });
els.btnZoomReset.addEventListener('click', () => { state.zoom = { scale: 1, panX: 0, panY: 0, isDragging: false, lastX: 0, lastY: 0 }; updateZoomDisplay(); if (state.hasProcessed) requestAnimationFrame(renderPreview); });

els.btnSplitToggle.addEventListener('click', () => {
  state.showSplit = !state.showSplit;
  els.btnSplitToggle.setAttribute('aria-pressed', String(state.showSplit));
  els.btnSplitToggle.textContent = state.showSplit ? 'Before / After ✓' : 'Before / After';
  if (state.hasProcessed) requestAnimationFrame(renderPreview);
});

// --- Setup panel collapse (mobile split-screen: preview + slider tetap 1 layar) ---
function setSetupCollapsed(collapsed: boolean): void {
  els.setupPanel.classList.toggle('collapsed', collapsed);
  els.setupCollapsedBar.classList.toggle('show', collapsed);
  els.btnToggleSetup.setAttribute('aria-expanded', String(!collapsed));
}
els.btnToggleSetup.addEventListener('click', () => setSetupCollapsed(false));

window.addEventListener('resize', () => {
  if (renderer && state.hasProcessed) updateDividerPosition(renderer.getCanvas());
});

function startBlink() { isBlinking = true; if (state.hasProcessed) requestAnimationFrame(renderPreview); }
function endBlink() { isBlinking = false; if (state.hasProcessed) requestAnimationFrame(renderPreview); }
els.btnBlink.addEventListener('mousedown', startBlink);
els.btnBlink.addEventListener('mouseup', endBlink);
els.btnBlink.addEventListener('mouseleave', endBlink);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Shift' && state.hasProcessed) startBlink();
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); doUndo(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); doRedo(); }
});
window.addEventListener('keyup', (e) => { if (e.key === 'Shift') endBlink(); });

function doUndo(): void {
  if (undo(state)) { syncSlidersFromState(); if (state.hasProcessed) requestAnimationFrame(renderPreview); }
  updateUndoRedoButtons();
}
function doRedo(): void {
  if (redo(state)) { syncSlidersFromState(); if (state.hasProcessed) requestAnimationFrame(renderPreview); }
  updateUndoRedoButtons();
}
function syncSlidersFromState(): void {
  for (const d of sliderDefs) {
    (document.getElementById('s-' + d.id) as HTMLInputElement).value = String(state.sliders[d.key]);
    (document.getElementById('v-' + d.id) as HTMLSpanElement).textContent = d.fmt(state.sliders[d.key]);
  }
  (document.getElementById('s-hueProtectLow') as HTMLInputElement).value = String(state.sliders.hueProtectLow);
  (document.getElementById('s-hueProtectHigh') as HTMLInputElement).value = String(state.sliders.hueProtectHigh);
  (document.getElementById('s-hueProtectStrength') as HTMLInputElement).value = String(state.sliders.hueProtectStrength);
}
function updateUndoRedoButtons(): void {
  els.btnUndo.disabled = state.undoStack.length === 0;
  els.btnRedo.disabled = state.redoStack.length === 0;
}
els.btnUndo.addEventListener('click', doUndo);
els.btnRedo.addEventListener('click', doRedo);

els.btnResetKoreksi.addEventListener('click', () => {
  pushUndo(state);
  state.sliders = { ...defaultSliders };
  syncSlidersFromState();
  log('Reset Koreksi');
  if (state.hasProcessed) requestAnimationFrame(renderPreview);
  updateUndoRedoButtons();
});

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function downloadPng(filename: string, imageData: ImageData): void {
  const c = document.createElement('canvas');
  c.width = imageData.width; c.height = imageData.height;
  c.getContext('2d')!.putImageData(imageData, 0, 0);
  c.toBlob((blob) => { if (!blob) return; const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }, 'image/png');
}
function sanitizeFilename(name: string): string { return name.replace(/[\\/:*?"<>|]/g, '').trim(); }

function openRenameModal(defaultName: string, ext: string, onConfirm: (name: string) => void): void {
  const overlay = document.getElementById('renameModalOverlay') as HTMLDivElement;
  const input = document.getElementById('renameModalInput') as HTMLInputElement;
  const extLabel = document.getElementById('renameModalExt') as HTMLSpanElement;
  const title = document.getElementById('renameModalTitle') as HTMLHeadingElement;
  const btnConfirm = document.getElementById('renameModalConfirm') as HTMLButtonElement;
  const btnCancel = document.getElementById('renameModalCancel') as HTMLButtonElement;
  title.textContent = 'Simpan file ' + ext;
  extLabel.textContent = ext;
  input.value = defaultName;
  overlay.classList.add('open');
  input.focus(); input.select();
  function cleanup(): void {
    overlay.classList.remove('open');
    btnConfirm.removeEventListener('click', confirmHandler);
    btnCancel.removeEventListener('click', cancelHandler);
    input.removeEventListener('keydown', keyHandler);
    overlay.removeEventListener('click', overlayClick);
  }
  function confirmHandler(): void { const raw = sanitizeFilename(input.value); cleanup(); onConfirm((raw || defaultName) + ext); }
  function cancelHandler(): void { cleanup(); }
  function keyHandler(e: KeyboardEvent): void { if (e.key === 'Enter') confirmHandler(); if (e.key === 'Escape') cancelHandler(); }
  function overlayClick(e: MouseEvent): void { if (e.target === overlay) cancelHandler(); }
  btnConfirm.addEventListener('click', confirmHandler);
  btnCancel.addEventListener('click', cancelHandler);
  input.addEventListener('keydown', keyHandler);
  overlay.addEventListener('click', overlayClick);
}

els.btnCube.addEventListener('click', () => {
  if (!state.sampleStats || !state.targetStats || !state.mklA) return;
  openRenameModal('color-grade-transfer', '.cube', (filename) => {
    downloadText(filename, generateCube(state.sampleStats!, state.targetStats!, state.mklA!, state.sliders, 17));
    els.exportStatus.textContent = '"' + filename + '" berhasil dibuat.';
  });
});
els.btnXmp.addEventListener('click', () => {
  if (!state.sampleStats || !state.targetStats) return;
  openRenameModal('color-grade-transfer', '.xmp', (filename) => {
    downloadText(filename, generateXmp(state.sampleStats!, state.targetStats!, state.mklA, state.sliders));
    els.exportStatus.textContent = '"' + filename + '" berhasil dibuat (taksiran).';
  });
});
els.btnLook.addEventListener('click', () => {
  if (!state.sampleStats || !state.targetStats) return;
  openRenameModal('color-grade-transfer', '.look', (filename) => {
    downloadText(filename, generateLook(state.sampleStats!, state.targetStats!, state.mklA, state.sliders));
    els.exportStatus.textContent = '"' + filename + '" berhasil dibuat.';
  });
});
els.btnVlt.addEventListener('click', () => {
  if (!state.sampleStats || !state.targetStats) return;
  openRenameModal('color-grade-transfer', '.vlt', (filename) => {
    downloadText(filename, generateVlt(state.sampleStats!, state.targetStats!, state.mklA, state.sliders));
    els.exportStatus.textContent = '"' + filename + '" berhasil dibuat.';
  });
});
els.btnFcp.addEventListener('click', () => {
  if (!state.sampleStats || !state.targetStats) return;
  openRenameModal('color-grade-transfer', '.xml', (filename) => {
    downloadText(filename, generateFcpXml(state.sampleStats!, state.targetStats!, state.mklA, state.sliders));
    els.exportStatus.textContent = '"' + filename + '" berhasil dibuat.';
  });
});
els.btnHald.addEventListener('click', () => {
  if (!state.sampleStats || !state.targetStats || !state.mklA) return;
  openRenameModal('hald-color-grade', '.png', (filename) => {
    downloadPng(filename, generateHaldPng(state.sampleStats!, state.targetStats!, state.mklA!, state.sliders));
    els.exportStatus.textContent = '"' + filename + '" berhasil dibuat.';
  });
});

function renderPresetList(): void {
  const items = Object.entries(state.presets).map(([key, data]) => ({ key, data }));
  items.sort((a, b) => (b.data.savedAt || '').localeCompare(a.data.savedAt || ''));
  if (items.length === 0) { els.presetList.innerHTML = '<div class="note">Belum ada preset tersimpan.</div>'; return; }
  els.presetList.innerHTML = '';
  for (const it of items) {
    const row = document.createElement('div');
    row.className = 'preset-item';
    const dateStr = it.data.savedAt ? new Date(it.data.savedAt).toLocaleDateString('id-ID') : '';
    row.innerHTML = `<div><div class="name">${it.data.name}</div><div class="meta">${dateStr}</div></div>
      <div class="actions">
        <button data-action="load" aria-label="Muat preset ${it.data.name}">Muat</button>
        <button data-action="delete" aria-label="Hapus preset ${it.data.name}">Hapus</button>
      </div>`;
    row.querySelector('[data-action="load"]')!.addEventListener('click', () => applyPreset(it.data));
    row.querySelector('[data-action="delete"]')!.addEventListener('click', () => deletePreset(it.key));
    els.presetList.appendChild(row);
  }
}
function applyPreset(data: Preset): void {
  pushUndo(state);
  state.sampleStats = data.sampleStats;
  state.sliders = { ...data.sliders };
  syncSlidersFromState();
  els.dropSample.classList.remove('filled');
  els.dropSampleContent.innerHTML = '<div class="hint"><b>Preset dimuat</b>data warna sample sudah aktif</div>';
  resetAfterNewInput();
  els.exportStatus.textContent = state.targetImageData ? 'Preset "' + data.name + '" dimuat. Tekan "Proses Warna".' : 'Preset dimuat. Upload target.';
  updateUndoRedoButtons();
}
function deletePreset(key: string): void {
  if (!confirm('Hapus preset ini?')) return;
  delete state.presets[key];
  savePresets(state.presets);
  renderPresetList();
}
els.btnSavePreset.addEventListener('click', () => {
  const name = els.presetName.value.trim();
  if (!name) { alert('Isi nama preset dulu.'); return; }
  if (!state.sampleStats) { alert('Upload foto sample dulu.'); return; }
  const key = 'preset:' + Date.now();
  state.presets[key] = { name, sampleStats: state.sampleStats, sliders: { ...state.sliders }, savedAt: new Date().toISOString() };
  savePresets(state.presets);
  els.presetName.value = '';
  renderPresetList();
});

export function initUI(): void {
  initWorker();
  bindSliders();
  setupDrop('dropSample', 'fileSample', true);
  setupDrop('dropTarget', 'fileTarget', false);
  renderPresetList();
  setSlidersDisabled(true);
  updateUndoRedoButtons();
  log('UI initialized. Phase 2+3 aktif: split, scopes, zoom, undo, batch, hue protect, multi-export.');
}

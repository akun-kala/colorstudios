import type { ImageStats, Mat3, SliderState, PresetMap, UndoState, ZoomState } from './types';
import { computeMKL, covToMat3 } from './mkl';

export interface AppState {
  sampleStats: ImageStats | null;
  targetStats: ImageStats | null;
  targetImageData: ImageData | null;
  batchTargets: ImageData[] | null;
  mklA: Mat3 | null;
  sliders: SliderState;
  hasProcessed: boolean;
  isProcessing: boolean;
  presets: PresetMap;
  undoStack: UndoState[];
  redoStack: UndoState[];
  zoom: ZoomState;
  showSplit: boolean;
}

export const defaultSliders: SliderState = {
  strengthTone: 100,
  strengthColor: 60,
  exposure: 0,
  contrast: 0,
  temp: 0,
  tint: 0,
  saturation: 0,
  hueProtectLow: 0,
  hueProtectHigh: 0,
  hueProtectStrength: 0,
};

export function createState(): AppState {
  return {
    sampleStats: null,
    targetStats: null,
    targetImageData: null,
    batchTargets: null,
    mklA: null,
    sliders: { ...defaultSliders },
    hasProcessed: false,
    isProcessing: false,
    presets: loadPresets(),
    undoStack: [],
    redoStack: [],
    zoom: { scale: 1, panX: 0, panY: 0, isDragging: false, lastX: 0, lastY: 0 },
    showSplit: false,
  };
}

export function updateMKL(state: AppState): void {
  if (!state.sampleStats || !state.targetStats) {
    state.mklA = null;
    return;
  }
  const covX = covToMat3(state.targetStats.cov);
  const covY = covToMat3(state.sampleStats.cov);
  state.mklA = computeMKL(covX, covY);
}

export function pushUndo(state: AppState): void {
  state.undoStack.push({ sliders: { ...state.sliders }, timestamp: Date.now() });
  if (state.undoStack.length > 50) state.undoStack.shift();
  state.redoStack = [];
}

export function undo(state: AppState): boolean {
  if (state.undoStack.length === 0) return false;
  const current = { sliders: { ...state.sliders }, timestamp: Date.now() };
  const prev = state.undoStack.pop()!;
  state.redoStack.push(current);
  state.sliders = prev.sliders;
  return true;
}

export function redo(state: AppState): boolean {
  if (state.redoStack.length === 0) return false;
  const current = { sliders: { ...state.sliders }, timestamp: Date.now() };
  const next = state.redoStack.pop()!;
  state.undoStack.push(current);
  state.sliders = next.sliders;
  return true;
}

const PRESET_KEY = 'colorGradeTransferPresets_v2';

export function loadPresets(): PresetMap {
  try {
    const raw = localStorage.getItem(PRESET_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePresets(presets: PresetMap): void {
  localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
}

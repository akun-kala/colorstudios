export type Vec3 = [number, number, number];
export type Mat3 = [Vec3, Vec3, Vec3];

export interface CovMatrix {
  ll: number; la: number; lb: number;
  al: number; aa: number; ab: number;
  bl: number; ba: number; bb: number;
}

export interface LabColor {
  L: number;
  a: number;
  b: number;
}

export interface ImageStats {
  meanL: number;
  meanA: number;
  meanB: number;
  stdL: number;
  stdA: number;
  stdB: number;
  avgChroma: number;
  cov: CovMatrix;
  width: number;
  height: number;
}

export interface SliderState {
  strengthTone: number;
  strengthColor: number;
  exposure: number;
  contrast: number;
  temp: number;
  tint: number;
  saturation: number;
  hueProtectLow: number;
  hueProtectHigh: number;
  hueProtectStrength: number;
}

export interface Preset {
  name: string;
  sampleStats: ImageStats;
  sliders: SliderState;
  savedAt: string;
}

export interface PresetMap {
  [key: string]: Preset;
}

export interface WorkerRequest {
  id: number;
  type: 'computeStats' | 'transformImage' | 'batchTransform';
  payload: {
    imageData?: ImageData;
    targetData?: ImageData;
    sampleStats?: ImageStats;
    targetStats?: ImageStats;
    mklA?: Mat3;
    sliders?: SliderState;
    batchTargets?: ImageData[];
  };
}

export interface WorkerResponse {
  id: number;
  type: 'computeStats' | 'transformImage' | 'batchTransform';
  result?: ImageStats;
  imageData?: ImageData;
  batchResults?: ImageData[];
  error?: string;
}

export interface UndoState {
  sliders: SliderState;
  timestamp: number;
}

export interface ZoomState {
  scale: number;
  panX: number;
  panY: number;
  isDragging: boolean;
  lastX: number;
  lastY: number;
}

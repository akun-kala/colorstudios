import type { WorkerRequest, WorkerResponse, ImageStats, Mat3, SliderState } from './types';
import { rgb2lab, lab2rgb, clamp } from './colorSpace';
import { matVec } from './mkl';

function computeStats(imageData: ImageData): ImageStats {
  const d = imageData.data;
  let sumL = 0, sumA = 0, sumB = 0, n = 0;
  const labs: [number, number, number][] = [];
  const step = 4 * Math.max(1, Math.floor(d.length / 4 / 40000));

  for (let i = 0; i < d.length; i += step) {
    const [L, a, b] = rgb2lab(d[i], d[i + 1], d[i + 2]);
    labs.push([L, a, b]);
    sumL += L; sumA += a; sumB += b; n++;
  }

  const meanL = sumL / n, meanA = sumA / n, meanB = sumB / n;
  let vL = 0, vA = 0, vB = 0, sumChroma = 0;
  let covLA = 0, covLB = 0, covAB = 0;

  for (const [L, a, b] of labs) {
    const dL = L - meanL, da = a - meanA, db = b - meanB;
    vL += dL * dL; vA += da * da; vB += db * db;
    covLA += dL * da; covLB += dL * db; covAB += da * db;
    sumChroma += Math.sqrt(a * a + b * b);
  }

  const covLL = vL / n, covAA = vA / n, covBB = vB / n;
  covLA /= n; covLB /= n; covAB /= n;

  return {
    meanL, meanA, meanB,
    stdL: Math.sqrt(covLL) || 1,
    stdA: Math.sqrt(covAA) || 1,
    stdB: Math.sqrt(covBB) || 1,
    avgChroma: sumChroma / n,
    cov: { ll: covLL, la: covLA, lb: covLB, al: covLA, aa: covAA, ab: covAB, bl: covLB, ba: covAB, bb: covBB },
    width: imageData.width,
    height: imageData.height,
  };
}

function transformPixel(
  r: number, g: number, b: number,
  sampleStats: ImageStats,
  targetStats: ImageStats,
  mklA: Mat3,
  sliders: SliderState
): [number, number, number] {
  let [L, a, bb] = rgb2lab(r, g, b);
  const strengthTone = sliders.strengthTone / 100;
  const strengthColor = sliders.strengthColor / 100;

  const dx: [number, number, number] = [L - targetStats.meanL, a - targetStats.meanA, bb - targetStats.meanB];
  const mapped = matVec(mklA, dx);
  let Ln = sampleStats.meanL + mapped[0];
  let An = sampleStats.meanA + mapped[1];
  let Bn = sampleStats.meanB + mapped[2];

  Ln = clamp(Ln, L - 60, L + 60);
  An = clamp(An, a - 150, a + 150);
  Bn = clamp(Bn, bb - 150, bb + 150);

  let L2 = L + (Ln - L) * strengthTone;
  let a2 = a + (An - a) * strengthColor;
  let b2 = bb + (Bn - bb) * strengthColor;

  if (sliders.hueProtectStrength > 0) {
    const hue = Math.atan2(bb, a) * 180 / Math.PI;
    const hNorm = hue < 0 ? hue + 360 : hue;
    let inRange = false;
    if (sliders.hueProtectLow <= sliders.hueProtectHigh) {
      inRange = hNorm >= sliders.hueProtectLow && hNorm <= sliders.hueProtectHigh;
    } else {
      inRange = hNorm >= sliders.hueProtectLow || hNorm <= sliders.hueProtectHigh;
    }
    if (inRange) {
      const protect = 1 - (sliders.hueProtectStrength / 100);
      L2 = L + (L2 - L) * protect;
      a2 = a + (a2 - a) * protect;
      b2 = bb + (b2 - bb) * protect;
    }
  }

  b2 += sliders.temp * 0.6;
  a2 += sliders.tint * 0.6;

  const satFactor = 1 + sliders.saturation / 100;
  a2 *= satFactor; b2 *= satFactor;

  const contFactor = 1 + sliders.contrast / 100;
  L2 = (L2 - 50) * contFactor + 50;

  let [r2, g2, b2out] = lab2rgb(L2, a2, b2);

  const exFactor = Math.pow(2, sliders.exposure / 100);
  r2 = clamp(linearToSrgb(srgbToLinear(r2) * exFactor), 0, 255);
  g2 = clamp(linearToSrgb(srgbToLinear(g2) * exFactor), 0, 255);
  b2out = clamp(linearToSrgb(srgbToLinear(b2out) * exFactor), 0, 255);

  return [Math.round(r2), Math.round(g2), Math.round(b2out)];
}

function srgbToLinear(c: number): number {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return v * 255;
}

function transformImage(
  targetData: ImageData,
  sampleStats: ImageStats,
  targetStats: ImageStats,
  mklA: Mat3,
  sliders: SliderState
): ImageData {
  const w = targetData.width, h = targetData.height;
  const src = targetData.data;
  const dst = new Uint8ClampedArray(src.length);

  for (let i = 0; i < src.length; i += 4) {
    const [r, g, b] = transformPixel(src[i], src[i + 1], src[i + 2], sampleStats, targetStats, mklA, sliders);
    dst[i] = r; dst[i + 1] = g; dst[i + 2] = b; dst[i + 3] = src[i + 3];
  }

  return new ImageData(dst, w, h);
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = e.data;
  try {
    if (type === 'computeStats' && payload.imageData) {
      const result = computeStats(payload.imageData);
      const res: WorkerResponse = { id, type: 'computeStats', result };
      self.postMessage(res, [payload.imageData.data.buffer]);
    } else if (type === 'transformImage' && payload.targetData && payload.sampleStats && payload.targetStats && payload.mklA && payload.sliders) {
      const imageData = transformImage(payload.targetData, payload.sampleStats, payload.targetStats, payload.mklA, payload.sliders);
      const res: WorkerResponse = { id, type: 'transformImage', imageData };
      self.postMessage(res, [imageData.data.buffer]);
    } else if (type === 'batchTransform') {
      const targets = payload.batchTargets;
      const sStats = payload.sampleStats;
      const tStats = payload.targetStats;
      const mkl = payload.mklA;
      const slid = payload.sliders;
      if (!targets || !Array.isArray(targets) || targets.length === 0) {
        throw new Error('batchTargets missing');
      }
      if (!sStats || !tStats || !mkl || !slid) {
        throw new Error('Missing stats/mkl/sliders');
      }
      const out: ImageData[] = [];
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        if (!t || !t.data || !t.width || !t.height) {
          throw new Error('Invalid ImageData at index ' + i);
        }
        out.push(transformImage(t, sStats, tStats, mkl, slid));
      }
      const res: WorkerResponse = { id, type: 'batchTransform', batchResults: out };
      self.postMessage(res, out.map(x => x.data.buffer) as ArrayBuffer[]);
    } else {
      throw new Error('Invalid request');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const res: WorkerResponse = { id, type, error: msg };
    self.postMessage(res);
  }
};

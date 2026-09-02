import type { ImageStats, Mat3, SliderState } from '../types';
import { rgb2lab, lab2rgb, clamp } from '../colorSpace';
import { matVec } from '../mkl';

export function generateHaldPng(
  sampleStats: ImageStats,
  targetStats: ImageStats,
  mklA: Mat3,
  sliders: SliderState
): ImageData {
  const size = 8;
  const haldSize = size * size;
  const canvasSize = haldSize * size;
  const data = new Uint8ClampedArray(canvasSize * canvasSize * 4);
  let idx = 0;

  for (let b = 0; b < haldSize; b++) {
    for (let g = 0; g < haldSize; g++) {
      for (let r = 0; r < haldSize; r++) {
        const rv = (r / (haldSize - 1)) * 255;
        const gv = (g / (haldSize - 1)) * 255;
        const bv = (b / (haldSize - 1)) * 255;

        let [L, a, bb] = rgb2lab(rv, gv, bv);
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
        let [ro, go, bo] = lab2rgb(L2, a2, b2);
        const exFactor = Math.pow(2, sliders.exposure / 100);
        ro = clamp(linearToSrgb(srgbToLinear(ro) * exFactor), 0, 255);
        go = clamp(linearToSrgb(srgbToLinear(go) * exFactor), 0, 255);
        bo = clamp(linearToSrgb(srgbToLinear(bo) * exFactor), 0, 255);

        data[idx++] = Math.round(ro);
        data[idx++] = Math.round(go);
        data[idx++] = Math.round(bo);
        data[idx++] = 255;
      }
    }
  }

  return new ImageData(data, canvasSize, canvasSize);
}

function srgbToLinear(c: number): number {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return v * 255;
}

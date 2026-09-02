import type { ImageStats, Mat3, SliderState } from '../types';
import { rgb2lab, lab2rgb, clamp } from '../colorSpace';
import { matVec } from '../mkl';

export function generateCube(
  sampleStats: ImageStats,
  targetStats: ImageStats,
  mklA: Mat3,
  sliders: SliderState,
  size = 17
): string {
  const lines: string[] = [];
  lines.push('TITLE "ColorGradeTransfer"');
  lines.push('LUT_3D_SIZE ' + size);
  lines.push('DOMAIN_MIN 0.0 0.0 0.0');
  lines.push('DOMAIN_MAX 1.0 1.0 1.0');

  for (let bi = 0; bi < size; bi++) {
    for (let gi = 0; gi < size; gi++) {
      for (let ri = 0; ri < size; ri++) {
        const r = (ri / (size - 1)) * 255;
        const g = (gi / (size - 1)) * 255;
        const b = (bi / (size - 1)) * 255;
        const [ro, go, bo] = transformPixelExport(r, g, b, sampleStats, targetStats, mklA, sliders);
        lines.push((ro / 255).toFixed(6) + ' ' + (go / 255).toFixed(6) + ' ' + (bo / 255).toFixed(6));
      }
    }
  }
  return lines.join('\n');
}

function transformPixelExport(
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

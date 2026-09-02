import type { ImageStats, Mat3, SliderState } from '../types';

export function generateVlt(
  sampleStats: ImageStats,
  targetStats: ImageStats,
  mklA: Mat3 | null,
  sliders: SliderState
): string {
  const exp = ((sampleStats.meanL - targetStats.meanL) / 50 * (sliders.strengthTone / 100) + sliders.exposure / 100).toFixed(3);
  const con = Math.round(((sampleStats.stdL / targetStats.stdL - 1) * 100 * (sliders.strengthTone / 100) + sliders.contrast)).toString();
  return `DaVinci Resolve ColorTransform
Version 1.0
Exposure ${exp}
Contrast ${con}
Saturation ${sliders.saturation}
Temperature ${Math.round(5500 + sliders.temp * 20)}
Tint ${sliders.tint}
`;
}

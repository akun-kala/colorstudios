import type { ImageStats, Mat3, SliderState } from '../types';

export function generateLook(
  sampleStats: ImageStats,
  targetStats: ImageStats,
  _mklA: Mat3 | null,
  sliders: SliderState
): string {
  const exp = ((sampleStats.meanL - targetStats.meanL) / 50 * (sliders.strengthTone / 100) + sliders.exposure / 100).toFixed(3);
  const con = Math.round(((sampleStats.stdL / targetStats.stdL - 1) * 100 * (sliders.strengthTone / 100) + sliders.contrast)).toString();
  const sat = Math.round(((sampleStats.avgChroma / targetStats.avgChroma - 1) * 100 * (sliders.strengthColor / 100) + sliders.saturation)).toString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<look>
  <version>1.0</version>
  <uuid>${crypto.randomUUID ? crypto.randomUUID() : 'look-' + Date.now()}</uuid>
  <name>ColorGradeTransfer</name>
  <adjust>
    <exposure>${exp}</exposure>
    <contrast>${con}</contrast>
    <saturation>${sat}</saturation>
    <temperature>${Math.round(5500 + sliders.temp * 20)}</temperature>
    <tint>${sliders.tint}</tint>
  </adjust>
</look>`;
}

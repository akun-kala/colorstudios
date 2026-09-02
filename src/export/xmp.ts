import type { ImageStats, Mat3, SliderState } from '../types';
import { matVec } from '../mkl';

export function estimateXmpParams(
  sampleStats: ImageStats,
  targetStats: ImageStats,
  mklA: Mat3 | null,
  sliders: SliderState
) {
  const baseExposure = clamp((sampleStats.meanL - targetStats.meanL) / 50, -2, 2);
  const baseContrast = clamp(((sampleStats.stdL / targetStats.stdL) - 1) * 100, -100, 100);
  const baseTemp = clamp((sampleStats.meanB - targetStats.meanB) * 3, -100, 100);
  const baseTint = clamp((sampleStats.meanA - targetStats.meanA) * 3, -100, 100);
  const baseSat = clamp(((sampleStats.avgChroma / targetStats.avgChroma) - 1) * 100, -100, 100);

  const strengthToneF = sliders.strengthTone / 100;
  const strengthColorF = sliders.strengthColor / 100;

  const totalExposure = clamp(baseExposure * strengthToneF + sliders.exposure / 100, -5, 5);
  const totalContrast = clamp(Math.round(baseContrast * strengthToneF + sliders.contrast), -100, 100);
  const totalTempDelta = clamp(baseTemp * strengthColorF + sliders.temp, -100, 100);
  const totalTint = clamp(Math.round(baseTint * strengthColorF + sliders.tint), -150, 150);
  const totalSat = clamp(Math.round(baseSat * strengthColorF + sliders.saturation), -100, 100);
  const temperatureK = clamp(Math.round(5500 + totalTempDelta * 20), 2000, 50000);

  let splitTone: { shadowHue: number; shadowSat: number; highlightHue: number; highlightSat: number } | null = null;
  if (mklA) {
    const mklMat = mklA; // narrow inside a const so the nested closure below keeps the non-null type
    const shadowL = targetStats.meanL - targetStats.stdL;
    const highlightL = targetStats.meanL + targetStats.stdL;

    function colorPushAt(Lval: number): { a: number; b: number } {
      const dx: [number, number, number] = [Lval - targetStats.meanL, 0, 0];
      const mapped = matVec(mklMat, dx);
      return { a: mapped[1] * strengthColorF, b: mapped[2] * strengthColorF };
    }

    function toHueSat(a: number, b: number) {
      let hue = Math.atan2(b, a) * 180 / Math.PI;
      if (hue < 0) hue += 360;
      const sat = clamp(Math.sqrt(a * a + b * b) * 2.2, 0, 100);
      return { hue: Math.round(hue), sat: Math.round(sat) };
    }

    const shadow = toHueSat(colorPushAt(shadowL).a, colorPushAt(shadowL).b);
    const highlight = toHueSat(colorPushAt(highlightL).a, colorPushAt(highlightL).b);

    if (shadow.sat > 5 || highlight.sat > 5) {
      splitTone = { shadowHue: shadow.hue, shadowSat: shadow.sat, highlightHue: highlight.hue, highlightSat: highlight.sat };
    }
  }

  return { totalExposure, totalContrast, temperatureK, totalTint, totalSat, splitTone };
}

export function generateXmp(
  sampleStats: ImageStats,
  targetStats: ImageStats,
  mklA: Mat3 | null,
  sliders: SliderState
): string {
  const p = estimateXmpParams(sampleStats, targetStats, mklA, sliders);
  const expStr = (p.totalExposure >= 0 ? '+' : '') + p.totalExposure.toFixed(2);
  const splitToneAttrs = p.splitTone ? `
   crs:SplitToningShadowHue="${p.splitTone.shadowHue}"
   crs:SplitToningShadowSaturation="${p.splitTone.shadowSat}"
   crs:SplitToningHighlightHue="${p.splitTone.highlightHue}"
   crs:SplitToningHighlightSaturation="${p.splitTone.highlightSat}"
   crs:SplitToningBalance="0"` : '';

  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="ColorGradeTransfer 2.0">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:Version="15.0"
   crs:ProcessVersion="11.0"
   crs:WhiteBalance="Custom"
   crs:Temperature="${p.temperatureK}"
   crs:Tint="${p.totalTint}"
   crs:Exposure2012="${expStr}"
   crs:Contrast2012="${p.totalContrast}"
   crs:Saturation="${p.totalSat}"${splitToneAttrs}
   crs:PresetType="Normal"
   crs:HasSettings="True">
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

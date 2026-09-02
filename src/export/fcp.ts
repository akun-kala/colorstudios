import type { ImageStats, Mat3, SliderState } from '../types';

export function generateFcpXml(
  sampleStats: ImageStats,
  targetStats: ImageStats,
  mklA: Mat3 | null,
  sliders: SliderState
): string {
  const exp = ((sampleStats.meanL - targetStats.meanL) / 50 * (sliders.strengthTone / 100) + sliders.exposure / 100).toFixed(3);
  const con = Math.round(((sampleStats.stdL / targetStats.stdL - 1) * 100 * (sliders.strengthTone / 100) + sliders.contrast)).toString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <resources>
    <effect id="r1" name="Color Grade Transfer" uid="..."/>
  </resources>
  <library>
    <event name="Color Grade">
      <project name="Transfer">
        <sequence>
          <spine>
            <clip>
              <video>
                <adjust-color exposure="${exp}" contrast="${con}" saturation="${sliders.saturation / 100}" temperature="${Math.round(5500 + sliders.temp * 20)}" tint="${sliders.tint}"/>
              </video>
            </clip>
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>`;
}

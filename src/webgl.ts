import type { Mat3, SliderState, ImageStats } from './types';
import { rgb2lab, lab2rgb, clamp } from './colorSpace';
import { matVec } from './mkl';

const VERT = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}`;

const FRAG = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 outColor;

uniform sampler2D u_source;
uniform sampler3D u_lut;
uniform float u_lutSize;
uniform float u_splitX;
uniform int u_showSplit;

vec4 sampleLUT(vec3 rgb) {
  vec3 coord = rgb * ((u_lutSize - 1.0) / u_lutSize) + 0.5 / u_lutSize;
  return texture(u_lut, coord);
}

void main() {
  vec4 src = texture(u_source, v_texCoord);
  if (u_showSplit > 0 && v_texCoord.x < u_splitX) {
    outColor = src;
  } else {
    outColor = sampleLUT(src.rgb);
  }
  outColor.a = src.a;
}`;

export class WebGLRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private sourceTex: WebGLTexture | null = null;
  private lutTex: WebGLTexture | null = null;
  private lutSize = 64;
  private positionLoc: number;
  private texCoordLoc: number;
  private sourceLoc: WebGLUniformLocation | null;
  private lutLoc: WebGLUniformLocation | null;
  private lutSizeLoc: WebGLUniformLocation | null;
  private splitXLoc: WebGLUniformLocation | null;
  private showSplitLoc: WebGLUniformLocation | null;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false, alpha: true });
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;

    const vs = this.compileShader(gl.VERTEX_SHADER, VERT);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, FRAG);
    this.program = this.createProgram(vs, fs);

    this.positionLoc = gl.getAttribLocation(this.program, 'a_position');
    this.texCoordLoc = gl.getAttribLocation(this.program, 'a_texCoord');
    this.sourceLoc = gl.getUniformLocation(this.program, 'u_source');
    this.lutLoc = gl.getUniformLocation(this.program, 'u_lut');
    this.lutSizeLoc = gl.getUniformLocation(this.program, 'u_lutSize');
    this.splitXLoc = gl.getUniformLocation(this.program, 'u_splitX');
    this.showSplitLoc = gl.getUniformLocation(this.program, 'u_showSplit');

    this.setupQuad();
    gl.useProgram(this.program);
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error('Shader compile error: ' + info);
    }
    return shader;
  }

  private createProgram(vs: WebGLShader, fs: WebGLShader): WebGLProgram {
    const gl = this.gl;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('Program link error: ' + gl.getProgramInfoLog(prog));
    }
    return prog;
  }

  private setupQuad(): void {
    const gl = this.gl;
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const texCoords = new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(this.positionLoc);
    gl.vertexAttribPointer(this.positionLoc, 2, gl.FLOAT, false, 0, 0);

    const texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(this.texCoordLoc);
    gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, 0);
  }

  setSourceImage(imageData: ImageData): void {
    const gl = this.gl;
    if (this.sourceTex) gl.deleteTexture(this.sourceTex);
    this.sourceTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, imageData.width, imageData.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, imageData.data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  updateLUT(
    sampleStats: ImageStats,
    targetStats: ImageStats,
    mklA: Mat3,
    sliders: SliderState
  ): void {
    const size = this.lutSize;
    const data = new Uint8Array(size * size * size * 4); // 64³ = 262k entries, ~1MB
    let idx = 0;

    for (let bi = 0; bi < size; bi++) {
      for (let gi = 0; gi < size; gi++) {
        for (let ri = 0; ri < size; ri++) {
          const r = (ri / (size - 1)) * 255;
          const g = (gi / (size - 1)) * 255;
          const b = (bi / (size - 1)) * 255;
          const [ro, go, bo] = transformPixelLUT(r, g, b, sampleStats, targetStats, mklA, sliders);
          data[idx++] = ro;
          data[idx++] = go;
          data[idx++] = bo;
          data[idx++] = 255;
        }
      }
    }

    const gl = this.gl;
    if (this.lutTex) gl.deleteTexture(this.lutTex);
    this.lutTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_3D, this.lutTex);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA, size, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
  }

  render(width: number, height: number, splitX: number, showSplit: boolean): void {
    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTex);
    gl.uniform1i(this.sourceLoc, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_3D, this.lutTex);
    gl.uniform1i(this.lutLoc, 1);
    gl.uniform1f(this.lutSizeLoc, this.lutSize);
    gl.uniform1f(this.splitXLoc, splitX);
    gl.uniform1i(this.showSplitLoc, showSplit ? 1 : 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  getCanvas(): HTMLCanvasElement {
    return this.gl.canvas as HTMLCanvasElement;
  }

  readPixels(width: number, height: number): ImageData {
    const gl = this.gl;
    const buf = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    // WebGL reads bottom-to-top; flip vertically to match canvas/ImageData top-to-bottom order
    const out = new Uint8ClampedArray(width * height * 4);
    const rowBytes = width * 4;
    for (let y = 0; y < height; y++) {
      const srcStart = (height - 1 - y) * rowBytes;
      out.set(buf.subarray(srcStart, srcStart + rowBytes), y * rowBytes);
    }
    return new ImageData(out, width, height);
  }

  destroy(): void {
    const gl = this.gl;
    if (this.sourceTex) gl.deleteTexture(this.sourceTex);
    if (this.lutTex) gl.deleteTexture(this.lutTex);
    gl.deleteProgram(this.program);
  }
}

function transformPixelLUT(
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

  // Hue protection
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

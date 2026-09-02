import type { Mat3, CovMatrix } from './types';

export function matMul(A: Mat3, B: Mat3): Mat3 {
  const res: Mat3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) {
        s += A[i][k] * B[k][j];
      }
      res[i][j] = s;
    }
  }
  return res;
}

export function matVec(A: Mat3, v: [number, number, number]): [number, number, number] {
  return [
    A[0][0] * v[0] + A[0][1] * v[1] + A[0][2] * v[2],
    A[1][0] * v[0] + A[1][1] * v[1] + A[1][2] * v[2],
    A[2][0] * v[0] + A[2][1] * v[1] + A[2][2] * v[2],
  ];
}

function matFromEig(vectors: Mat3, diagVals: [number, number, number]): Mat3 {
  const res: Mat3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) {
        s += vectors[i][k] * diagVals[k] * vectors[j][k];
      }
      res[i][j] = s;
    }
  }
  return res;
}

function jacobiEigen(M: Mat3): { values: [number, number, number]; vectors: Mat3 } {
  const a: Mat3 = [M[0].slice(), M[1].slice(), M[2].slice()] as Mat3;
  const v: Mat3 = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < 3; p++) {
      for (let q = p + 1; q < 3; q++) {
        off += a[p][q] * a[p][q];
      }
    }
    if (off < 1e-18) break;

    for (let p = 0; p < 3; p++) {
      for (let q = p + 1; q < 3; q++) {
        if (Math.abs(a[p][q]) < 1e-14) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const sign = theta >= 0 ? 1 : -1;
        const t = sign / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        const app = a[p][p];
        const aqq = a[q][q];
        const apq = a[p][q];
        a[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
        a[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
        a[p][q] = 0;
        a[q][p] = 0;

        for (let i = 0; i < 3; i++) {
          if (i !== p && i !== q) {
            const aip = a[i][p];
            const aiq = a[i][q];
            a[i][p] = a[p][i] = c * aip - s * aiq;
            a[i][q] = a[q][i] = s * aip + c * aiq;
          }
        }
        for (let i = 0; i < 3; i++) {
          const vip = v[i][p];
          const viq = v[i][q];
          v[i][p] = c * vip - s * viq;
          v[i][q] = s * vip + c * viq;
        }
      }
    }
  }

  return { values: [a[0][0], a[1][1], a[2][2]], vectors: v };
}

function matSqrtSym(M: Mat3): Mat3 {
  const { values, vectors } = jacobiEigen(M);
  const sq: [number, number, number] = [
    Math.sqrt(Math.max(values[0], 1e-6)),
    Math.sqrt(Math.max(values[1], 1e-6)),
    Math.sqrt(Math.max(values[2], 1e-6)),
  ];
  return matFromEig(vectors, sq);
}

function matInvSqrtSym(M: Mat3): Mat3 {
  const { values, vectors } = jacobiEigen(M);
  const isq: [number, number, number] = [
    1 / Math.sqrt(Math.max(values[0], 1e-6)),
    1 / Math.sqrt(Math.max(values[1], 1e-6)),
    1 / Math.sqrt(Math.max(values[2], 1e-6)),
  ];
  return matFromEig(vectors, isq);
}

export function covToMat3(cov: CovMatrix): Mat3 {
  return [
    [cov.ll, cov.la, cov.lb],
    [cov.al, cov.aa, cov.ab],
    [cov.bl, cov.ba, cov.bb],
  ];
}

export function mat3ToCov(m: Mat3): CovMatrix {
  return {
    ll: m[0][0], la: m[0][1], lb: m[0][2],
    al: m[1][0], aa: m[1][1], ab: m[1][2],
    bl: m[2][0], ba: m[2][1], bb: m[2][2],
  };
}

export function computeMKL(covX: Mat3, covY: Mat3): Mat3 {
  try {
    const sqrtX = matSqrtSym(covX);
    const invSqrtX = matInvSqrtSym(covX);
    const middle = matMul(matMul(sqrtX, covY), sqrtX);
    const sqrtMiddle = matSqrtSym(middle);
    return matMul(matMul(invSqrtX, sqrtMiddle), invSqrtX);
  } catch {
    // Fallback diagonal
    const rL = Math.max(0.4, Math.min(2.5, Math.sqrt(covY[0][0] / (covX[0][0] || 1))));
    const rA = Math.max(0.55, Math.min(1.8, Math.sqrt(covY[1][1] / (covX[1][1] || 1))));
    const rB = Math.max(0.55, Math.min(1.8, Math.sqrt(covY[2][2] / (covX[2][2] || 1))));
    return [
      [rL, 0, 0],
      [0, rA, 0],
      [0, 0, rB],
    ];
  }
}

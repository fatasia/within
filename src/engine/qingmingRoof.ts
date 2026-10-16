import * as THREE from 'three';

export interface RoofProfile {
  width: number;
  depth: number;
  base: number;
  rise: number;
  detailed: boolean;
}

/** All roof parts use the same tessellated surface, not a second approximate curve. */
export function roofSurfaceY(profile: RoofProfile, x: number, z: number): number {
  const { width, depth, base, rise, detailed } = profile;
  const columns = detailed ? 8 : 4;
  const rows = detailed ? 8 : 4;
  const interpolate = (u: number, count: number, fn: (t: number) => number) => {
    const cell = Math.min(count - 1, Math.floor(u * count));
    const a = cell / count;
    return THREE.MathUtils.lerp(fn(a), fn(a + 1 / count), u * count - cell);
  };
  const u = THREE.MathUtils.clamp(x / width + 0.5, 0, 1);
  const t = THREE.MathUtils.clamp(Math.abs(z) / (depth / 2), 0, 1);
  return base + interpolate(t, rows, t => rise * (1 - t + 0.23 * t ** 4))
    + interpolate(u, columns, u => 0.13 * Math.abs(u * 2 - 1) ** 5);
}

function surfaceGeometry(profile: RoofProfile, barrels: boolean): THREE.BufferGeometry {
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  const { width, depth, detailed } = profile;
  const rows = detailed ? 8 : 4;
  const tiles = Math.ceil(width / (detailed ? 0.32 : 0.7));
  const strips = barrels ? tiles : 1;
  const columns = barrels ? 3 : detailed ? 8 : 4;
  const radius = detailed ? 0.052 : 0.06;
  for (const side of [-1, 1]) {
    for (let strip = 0; strip < strips; strip++) {
      const offset = positions.length / 3;
      const center = -width / 2 + ((strip + 0.5) / tiles) * width;
      for (let i = 0; i <= columns; i++) {
        const angle = (i / columns) * Math.PI;
        const x = barrels ? center - Math.cos(angle) * radius : (i / columns - 0.5) * width;
        for (let j = 0; j <= rows; j++) {
          const z = side * (j / rows) * depth / 2;
          // Half-round cover tiles meet the roof at both edges. No rods buried in the sheet.
          const y = roofSurfaceY(profile, x, z) + (barrels ? Math.sin(angle) * radius + 0.005 : 0);
          positions.push(x, y, z);
          uv.push(x / width + 0.5, j / rows);
          if (i < columns && j < rows) {
            const a = offset + i * (rows + 1) + j;
            const b = a + rows + 1;
            if (side > 0) indices.push(a, a + 1, b, a + 1, b + 1, b);
            else indices.push(a, b, a + 1, a + 1, b, b + 1);
          }
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function roofGeometry(profile: RoofProfile): THREE.BufferGeometry {
  return surfaceGeometry(profile, false);
}

export function roofTilesGeometry(profile: RoofProfile): THREE.BufferGeometry {
  return surfaceGeometry(profile, true);
}

/** Close the triangular attic at the wall line, below the overhanging roof. */
export function roofGableGeometry(profile: RoofProfile, wallWidth: number, wallDepth: number, wallTop: number): THREE.BufferGeometry {
  const vertices: number[] = [], indices: number[] = [], uv: number[] = [];
  const rows = profile.detailed ? 8 : 4;
  const zs = [-wallDepth / 2, ...Array.from({ length: rows * 2 - 1 }, (_, i) => ((i + 1) / rows - 1) * profile.depth / 2).filter(z => Math.abs(z) < wallDepth / 2), wallDepth / 2];
  for (const side of [-1, 1]) {
    const start = vertices.length / 3;
    for (const z of zs) {
      const x = side * wallWidth / 2;
      vertices.push(x, wallTop - 0.03, z, x, roofSurfaceY(profile, x, z) - 0.035, z);
      uv.push(z / wallDepth + 0.5, 0, z / wallDepth + 0.5, 1);
    }
    for (let i = 0; i < zs.length - 1; i++) {
      const a = start + i * 2;
      if (side > 0) indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      else indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

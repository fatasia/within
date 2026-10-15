import * as THREE from 'three';
import { seededRandom } from './math';

/** A bent, ridged sedge blade; the tip droops outward instead of ending as a rigid stick. */
export function sedgeBlade(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const points = [
    [0, 0, 0],
    [-0.035, 0.62, 0.08],
    [0, 0.65, 0.12],
    [0.035, 0.62, 0.08],
    [0, 1, 0.42],
  ];
  const vertices: number[] = [];
  for (const i of [0, 1, 2, 0, 2, 3, 1, 4, 2, 2, 4, 3]) vertices.push(...points[i]!);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Opaque folded leaves with open space between them, never a solid crown shell. */
export function foliageSpray(count = 12, flat = false, seed = 912): THREE.BufferGeometry {
  const random = seededRandom(seed),
    positions: number[] = [],
    colors: number[] = [];
  const matrix = new THREE.Matrix4(),
    point = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const a = i * 2.399,
      radius = Math.sqrt((i + 0.5) / count) * 0.85;
    matrix.compose(
      new THREE.Vector3(
        Math.cos(a) * radius,
        (random() - 0.5) * (flat ? 0.25 : 1.05),
        Math.sin(a) * radius,
      ),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler((random() - 0.5) * 1.5, a, (random() - 0.5) * 0.6),
      ),
      new THREE.Vector3(flat ? 0.55 : 0.8, 1, 0.8 + random() * 0.45),
    );
    const color = new THREE.Color().setHSL(
      0.25 + random() * 0.06,
      0.22 + random() * 0.13,
      0.23 + random() * 0.16,
    );
    const vertices = [
      [0, 0, -0.38],
      [-0.24, 0.015, 0],
      [0, 0.07, 0],
      [0.24, 0.015, 0],
      [0, 0, 0.48],
    ];
    for (const index of [0, 1, 2, 0, 2, 3, 1, 4, 2, 2, 4, 3]) {
      point.fromArray(vertices[index]!).applyMatrix4(matrix);
      positions.push(point.x, point.y, point.z);
      colors.push(color.r, color.g, color.b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

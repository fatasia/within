import * as THREE from 'three';

/** Four slopes close the gate tower, with a short ridge and raised eave corners. */
export function gateRoofHeight(x: number, z: number): number {
  const sideSlope = Math.max(0, 1 - Math.abs(z) / 5);
  const hipSlope = Math.max(0, (7.5 - Math.abs(x)) / 3.5);
  const slope = Math.min(sideSlope, hipSlope, 1);
  const corner = 0.23 * (Math.abs(x) / 7.5) ** 5 * (Math.abs(z) / 5) ** 5;
  return 14.3 + 3.5 * slope + 0.22 * (1 - slope) ** 4 + corner;
}

export function buildQingmingGateRoof(tile: THREE.Material, timber: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.name = 'qingming-gate-hipped-roof';
  const positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const nx = 30,
    nz = 20;
  for (let i = 0; i <= nx; i++)
    for (let j = 0; j <= nz; j++) {
      const x = (i / nx) * 15 - 7.5,
        z = (j / nz) * 10 - 5;
      positions.push(x, gateRoofHeight(x, z), z);
      uv.push(x / 4, z / 4);
      if (i < nx && j < nz) {
        const n = i * (nz + 1) + j;
        indices.push(n, n + 1, n + nz + 1, n + 1, n + nz + 2, n + nz + 1);
      }
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  group.add(new THREE.Mesh(geometry, tile));
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(8.1, 0.16, 0.2), tile);
  ridge.position.set(0, 17.85, 0);
  group.add(ridge);
  // Continuous soffit prevents daylight showing through the roof from the gallery.
  const soffit = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.18, 9.5), timber);
  soffit.position.y = 14.27;
  group.add(soffit);
  return group;
}

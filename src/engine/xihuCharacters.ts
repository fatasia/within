import * as THREE from 'three';
import { addMesh, mat } from './featuredShared';
import { rod } from './featuredLandscapeKit';

/** A continuous tapered coil, not a skirt with feet hidden underneath. */
export function whiteSerpent(): THREE.Group {
  const root = new THREE.Group();
  root.name = '白蛇盘尾';
  root.userData.landscapeDynamic = true;
  const path = new THREE.CatmullRomCurve3([
    [0, 0.99, 0], [-0.05, 0.67, 0.01], [-0.22, 0.31, 0.12],
    [-0.72, 0.23, 0.43], [-1.08, 0.2, 0.03], [-0.83, 0.17, -0.52],
    [-0.27, 0.12, -0.57], [0.16, 0.08, -0.3], [0.41, 0.04, -0.53],
  ].map(p => new THREE.Vector3(...p)));
  const steps = 80, sides = 14, frames = path.computeFrenetFrames(steps, false);
  const vertices: number[] = [], colors: number[] = [], indices: number[] = [];
  const pearl = new THREE.Color('#e6e8da'), jade = new THREE.Color('#a6beb2');
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, center = path.getPointAt(t);
    const radius = 0.225 * Math.pow(1 - t, 0.6) + 0.008;
    for (let j = 0; j <= sides; j++) {
      const angle = j / sides * Math.PI * 2;
      const offset = frames.normals[i]!.clone().multiplyScalar(Math.cos(angle))
        .addScaledVector(frames.binormals[i]!, Math.sin(angle));
      const point = center.clone().addScaledVector(offset, radius);
      // Keep the resting coil above the bridge paving.
      point.y = Math.max(0.018, point.y);
      vertices.push(point.x, point.y, point.z);
      const c = pearl.clone().lerp(jade, (0.5 + 0.5 * Math.cos(angle * 3 + i * 1.8)) * 0.2);
      colors.push(c.r, c.g, c.b);
      if (i < steps && j < sides) { const n = i * (sides + 1) + j; indices.push(n, n + 1, n + sides + 1, n + 1, n + sides + 2, n + sides + 1); }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  addMesh(root, geometry, mat('#ffffff', { vertexColors: true, roughness: 0.38 }));
  // Fine overlapping scales follow the same spine, in one draw call.
  const scales = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), mat('#c6d7ca', { roughness: 0.48 }), 180);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 180; i++) {
    const t = 0.05 + Math.floor(i / 5) / 36 * 0.84;
    const frame = Math.round(t * steps), angle = i % 5 / 5 * Math.PI * 2;
    const normal = frames.normals[frame]!.clone().multiplyScalar(Math.cos(angle)).addScaledVector(frames.binormals[frame]!, Math.sin(angle));
    dummy.position.copy(path.getPointAt(t)).addScaledVector(normal, 0.225 * Math.pow(1 - t, 0.6) + 0.008);
    dummy.position.y = Math.max(0.025, dummy.position.y);
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    dummy.scale.set(0.037 * (1 - t * 0.65), 0.004, 0.06 * (1 - t * 0.65));
    dummy.updateMatrix(); scales.setMatrixAt(i, dummy.matrix);
  }
  root.add(scales);
  return root;
}

/** Shaven head is supplied by the caller; kasaya, mala and ringed staff distinguish the monk. */
export function dressMonk(root: THREE.Group): void {
  const saffron = mat('#ad6c32'), seam = mat('#d2ab64'), beads = mat('#47352b');
  const cloth = new THREE.BufferGeometry();
  cloth.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.19, 1.3, 0.13, 0.17, 1.07, 0.21, -0.28, 0.18, 0.18,
    0.17, 1.07, 0.21, 0.27, 0.18, 0.21, -0.28, 0.18, 0.18,
  ], 3)); cloth.computeVertexNormals();
  addMesh(root, cloth, saffron).name = '法海袈裟';
  for (let y = 0.32; y < 1.05; y += 0.17)
    rod(root, new THREE.Vector3(-0.23, y, 0.205), new THREE.Vector3(0.23, y, 0.235), 0.006, seam);
  for (const x of [-0.09, 0.09]) rod(root, new THREE.Vector3(x, 0.2, 0.24), new THREE.Vector3(x, 1.03, 0.24), 0.005, seam);
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * Math.PI * 2;
    addMesh(root, new THREE.SphereGeometry(0.026, 6, 5), beads, [Math.cos(a) * 0.205, 1.29 - Math.sin(a) * 0.13, Math.sin(a) * 0.17 + 0.04]);
  }
  rod(root, new THREE.Vector3(0.4, 0, 0.05), new THREE.Vector3(0.4, 1.95, 0.05), 0.026, beads);
  const metal = mat('#b49b60', { metalness: 0.65, roughness: 0.35 });
  addMesh(root, new THREE.TorusGeometry(0.12, 0.016, 6, 16), metal, [0.4, 2.04, 0.05]);
  for (let i = 0; i < 6; i++) addMesh(root, new THREE.TorusGeometry(0.048, 0.009, 5, 10), metal, [0.4 + Math.cos(i * Math.PI / 3) * 0.1, 2.04 + Math.sin(i * Math.PI / 3) * 0.1 - 0.035, 0.06]);
}

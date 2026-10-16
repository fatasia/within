import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addMesh, mat } from './featuredShared';
import { seededRandom } from './math';

/** Geometry only: deterministic, canvas-free helpers for the two landscape worlds. */
export function branch(parent: THREE.Object3D, points: THREE.Vector3[], radius: number, material: THREE.Material, detail = 12, sides = 6): THREE.Mesh {
  return addMesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), detail, radius, sides, false), material);
}
export function rod(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material): THREE.Mesh {
  const mesh = addMesh(parent, new THREE.CylinderGeometry(radius * 0.76, radius, a.distanceTo(b), 7), material, a.clone().add(b).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return mesh;
}

/** Jointed granite, not a stack of cones: all rings share vertical fracture rhythms. */
export function graniteGeometry(seed: number, radius: number, height: number): THREE.BufferGeometry {
  const rand = seededRandom(seed), sides = 23, rings = 22, vertices: number[] = [], colors: number[] = [], uv: number[] = [], indices: number[] = [];
  const phases = Array.from({ length: sides }, () => 0.78 + rand() * 0.4);
  const base = new THREE.Color('#a7aaa0');
  for (let j = 0; j <= rings; j++) {
    const t = j / rings;
    const taper = (1.02 - t * 0.61) * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (t - 0.7) / 0.3), 2))) * (0.94 + 0.045 * Math.sin(t * 19 + seed));
    for (let k = 0; k <= sides; k++) {
      const angle = (k % sides) / sides * Math.PI * 2;
      const wrinkle = 1 + Math.sin(t * 23 + angle * 3 + seed) * 0.055 + Math.sin(t * 57 + angle) * 0.025;
      const r = radius * phases[k % sides]! * taper * wrinkle;
      const y = t * height + (Math.sin(angle * 3 + seed) * 0.035 + Math.cos(angle * 5 + seed) * 0.018) * Math.pow(t, 9) * (1 - t) * height;
      vertices.push(Math.cos(angle) * r + t * t * radius * 0.18, y, Math.sin(angle) * r * 0.72);
      const fracture = (k % 6 === 0 ? 0.62 : 0.87) + rand() * 0.18;
      const shade = base.clone().multiplyScalar(fracture * (0.84 + t * 0.16));
      if (t < 0.3) shade.lerp(new THREE.Color('#535e49'), (0.3 - t) * 1.5);
      colors.push(shade.r, shade.g, shade.b); uv.push(k / sides * 4, t * 6);
      if (j < rings && k < sides) { const n = j * (sides + 1) + k; indices.push(n, n + sides + 1, n + 1, n + 1, n + sides + 1, n + sides + 2); }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

/** Crossed tapering needle fans, deliberately open between sprays. */
function pineNeedles(): THREE.BufferGeometry {
  const positions: number[] = [], random = seededRandom(1218);
  for (let i = 0; i < 32; i++) {
    const a = i * 2.399, y = (random() - 0.5) * 0.3, r = 0.65 + random() * 0.35;
    const x = Math.cos(a), z = Math.sin(a), width = 0.06;
    positions.push(x * 0.12 - z * width, y, z * 0.12 + x * width, x * r, y + 0.14 + random() * 0.12, z * r, x * 0.12 + z * width, y, z * 0.12 - x * width);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.computeVertexNormals(); return geometry;
}
/** Asymmetric windswept Chinese pine with visible bifurcating limbs and needle sprays. */
export function pineTree(seed: number, size = 1, hero = false): THREE.Group {
  const tree = new THREE.Group(), rand = seededRandom(seed), bark = mat('#514b3c'), tips: THREE.Vector3[] = [];
  const trunk = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.35, 2.3, 0), new THREE.Vector3(0.05, 4.4, -0.15), new THREE.Vector3(1.2, 6.2, 0.1), new THREE.Vector3(2.1, 7.5, 0)];
  branch(tree, trunk, 0.31, bark, 18);
  const limbCount = hero ? 13 : 6;
  for (let i = 0; i < limbCount; i++) {
    const y = 2.8 + i / limbCount * 4.4, angle = i * 2.399, reach = (1.5 + rand() * 2.8) * (i < 7 ? 1.25 : 0.7);
    const base = new THREE.Vector3(y > 5 ? (y - 5) * 0.9 : 0, y, 0);
    const end = base.clone().add(new THREE.Vector3(Math.cos(angle) * reach + (hero ? 1.3 : 0), 0.2 + rand(), Math.sin(angle) * reach * 0.65));
    branch(tree, [base, base.clone().lerp(end, 0.45).add(new THREE.Vector3(0, -0.15, 0)), end], 0.12 * (1 - i / limbCount * 0.5), bark, 8);
    for (let j = 0; j < (hero ? 4 : 3); j++) {
      const tip = end.clone().add(new THREE.Vector3((rand() - 0.5) * 2.4, rand() * 0.55, (rand() - 0.5) * 2));
      rod(tree, end.clone().lerp(base, 0.2), tip, 0.038, bark); tips.push(tip);
    }
  }
  const foliage = new THREE.InstancedMesh(pineNeedles(), mat('#ffffff', { roughness: 1, side: THREE.DoubleSide }), tips.length * (hero ? 7 : 4));
  const dummy = new THREE.Object3D();
  let index = 0;
  for (const tip of tips) for (let j = 0; j < (hero ? 7 : 4); j++) {
    dummy.position.copy(tip).add(new THREE.Vector3((rand() - 0.5) * 1.4, (rand() - 0.5) * 0.4, (rand() - 0.5) * 1.1));
    dummy.scale.set(0.45 + rand() * 0.5, 0.7 + rand() * 0.3, 0.4 + rand() * 0.45); dummy.rotation.set(rand() * 0.15, rand() * 6, rand() * 0.15); dummy.updateMatrix(); foliage.setMatrixAt(index, dummy.matrix);
    foliage.setColorAt(index++, new THREE.Color().setHSL(0.28 + rand() * 0.06, 0.23 + rand() * 0.15, 0.17 + rand() * 0.13));
  }
  tree.add(foliage); tree.scale.setScalar(size); return tree;
}

/** Bake static geometry by material; retain instanced foliage and explicitly animated roots. */
export function compactLandscape(root: THREE.Group): void {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const buckets = new Map<string, { material: THREE.Material; meshes: THREE.Mesh[] }>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || Array.isArray(object.material)) return;
    let ancestor: THREE.Object3D | null = object;
    while (ancestor && ancestor !== root) { if (ancestor.userData.landscapeDynamic) return; ancestor = ancestor.parent; }
    const m = object.material as THREE.MeshStandardMaterial;
    if (!m.isMeshStandardMaterial) return;
    const key = `${m.color.getHex()}-${m.roughness}-${m.metalness}-${m.opacity}-${m.side}-${m.vertexColors}-${m.map?.uuid ?? 'none'}-${Object.keys(object.geometry.attributes).sort().join(',')}`;
    const bucket = buckets.get(key) ?? { material: m, meshes: [] };
    bucket.meshes.push(object); buckets.set(key, bucket);
  });
  const removed = new Set<THREE.BufferGeometry>();
  for (const bucket of buckets.values()) {
    if (bucket.meshes.length < 2) continue;
    const parts = bucket.meshes.map(mesh => {
      const transformed = mesh.geometry.clone().applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
      const part = transformed.index ? transformed.toNonIndexed() : transformed;
      if (part !== transformed) transformed.dispose();
      mesh.removeFromParent(); removed.add(mesh.geometry); return part;
    });
    const merged = mergeGeometries(parts);
    if (merged) { const mesh = new THREE.Mesh(merged, bucket.material); mesh.name = 'landscape-static-batch'; root.add(mesh); }
    parts.forEach(part => part.dispose());
  }
  root.traverse(object => { if (object instanceof THREE.Mesh) removed.delete(object.geometry); });
  removed.forEach(geometry => geometry.dispose());
}






/** Small deterministic granite grain map, including mica flecks and joint staining. */
export function graniteMaterial(): THREE.MeshStandardMaterial {
  const size = 128, data = new Uint8Array(size * size * 4), rand = seededRandom(7421);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fleck = rand(), vein = Math.sin(x * 0.53 + Math.sin(y * 0.08) * 1.7);
    const tone = Math.min(255, Math.max(0, 190 + (fleck - 0.5) * 45 - Math.pow(Math.max(0, vein), 12) * 29));
    const index = (y * size + x) * 4; data[index] = tone; data[index + 1] = tone; data[index + 2] = tone; data[index + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.generateMipmaps = true; texture.needsUpdate = true;
  const material = mat('#d2d0c1', { vertexColors: true, roughness: 0.98, map: texture }); material.bumpMap = texture; material.bumpScale = 0.16; return material;
}


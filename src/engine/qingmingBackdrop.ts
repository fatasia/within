import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seededRandom } from './math';

/** Distant flatland: low villages and spring groves, not invented mountain ranges. */
export function qingmingBackdropGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const random = seededRandom(1113);
  const add = (geometry: THREE.BufferGeometry, tint: string) => {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    g.deleteAttribute('uv');
    const color = new THREE.Color(tint);
    const colors = new Float32Array(g.getAttribute('position').count * 3);
    for (let i = 0; i < colors.length; i += 3) color.toArray(colors, i);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    parts.push(g);
  };
  for (const [w, d, x, z] of [
    [1800, 785, 0, -507.5],
    [1800, 820, 0, 490],
    [760, 195, -520, -17.5],
    [760, 195, 520, -17.5],
  ])
    add(new THREE.PlaneGeometry(w!, d!).rotateX(-Math.PI / 2).translate(x!, 2.79, z!), '#a9a490');

  // Irregular cultivated strips interrupt the single-colour plane, all outside the walkable city.
  for (let i = 0; i < 48; i++) {
    const x = ((i % 12) - 5.5) * 36 + random() * 8;
    const z = -133 - Math.floor(i / 12) * 28;
    add(
      new THREE.PlaneGeometry(25 + random() * 7, 18 + random() * 5)
        .rotateX(-Math.PI / 2)
        .rotateY((random() - 0.5) * 0.12)
        .translate(x, 2.81, z),
      ['#96977e', '#a4a184', '#858e77', '#b4ab8b'][i % 4]!,
    );
  }
  for (let i = 0; i < 36; i++) {
    const x = -200 + i * 11.5 + random() * 9;
    const z = -123 - (i % 3) * 23 - random() * 12;
    const w = 5 + random() * 4,
      d = 4 + random() * 3,
      h = 2.7 + random() * 1.6;
    add(new THREE.BoxGeometry(w, h, d).translate(x, 2.8 + h / 2, z), '#b6b19e');
    const roof = new THREE.BufferGeometry();
    roof.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [
          -w * 0.58,
          0,
          -d * 0.6,
          w * 0.58,
          0,
          -d * 0.6,
          w * 0.58,
          1.7,
          0,
          -w * 0.58,
          0,
          -d * 0.6,
          w * 0.58,
          1.7,
          0,
          -w * 0.58,
          1.7,
          0,
          -w * 0.58,
          1.7,
          0,
          w * 0.58,
          1.7,
          0,
          w * 0.58,
          0,
          d * 0.6,
          -w * 0.58,
          1.7,
          0,
          w * 0.58,
          0,
          d * 0.6,
          -w * 0.58,
          0,
          d * 0.6,
        ],
        3,
      ),
    );
    roof.computeVertexNormals();
    add(roof.translate(x, 2.8 + h, z), '#626f65');
  }
  for (let i = 0; i < 48; i++) {
    const x = -212 + random() * 445;
    const z = -100 - random() * 130;
    const h = 4 + random() * 5;
    add(
      new THREE.CylinderGeometry(0.13, 0.28, h, 4, 1, true).translate(x, 2.8 + h / 2, z),
      '#68685a',
    );
    {
      const crown = new THREE.IcosahedronGeometry(1, 1);
      // Smooth the distant crown's normals without spending another subdivision level.
      const normals = crown.getAttribute('normal'),
        vertices = crown.getAttribute('position');
      const normal = new THREE.Vector3();
      for (let k = 0; k < vertices.count; k++) {
        normal.fromBufferAttribute(vertices, k).normalize();
        normals.setXYZ(k, normal.x, normal.y, normal.z);
        const lobe = 1 + Math.sin(normal.x * 6 + i) * Math.sin(normal.z * 5 - normal.y * 4) * 0.17;
        vertices.setXYZ(k, normal.x * lobe, normal.y * lobe, normal.z * lobe);
      }
      add(
        crown
          .scale(2.7 + random() * 2, 2.3 + random() * 1.6, 2.7 + random() * 1.6)
          .translate(x, 2.8 + h, z),
        ['#7e8a63', '#929b72', '#677d65', '#a2a47b'][i % 4]!,
      );
    }
  }
  const geometry = mergeGeometries(parts)!;
  parts.forEach((g) => g.dispose());
  geometry.computeBoundingSphere();
  return geometry;
}

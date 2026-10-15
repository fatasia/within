import * as THREE from 'three';

/** Small geometry primitives shared by the handcrafted, texture-free models. */
export function rod(
  group: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  taper = 1,
  sides = 6,
): THREE.Mesh {
  const direction = end.clone().sub(start);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * taper, radius, direction.length(), sides),
    material,
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  group.add(mesh);
  return mesh;
}

export function curveRod(
  group: THREE.Group,
  points: THREE.Vector3[],
  radius: number,
  material: THREE.Material,
  segments = 12,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, 4, false),
    material,
  );
  group.add(mesh);
  return mesh;
}

/** Gabled roof with its ridge along Z, rather than a four-sided pyramid. */
export function gableGeometry(width: number, depth: number, rise: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(0, rise);
  shape.lineTo(width / 2, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

/** Five separate needle sprays leave open notches instead of a single pancake silhouette. */
export function pineCrownGeometry(): THREE.BufferGeometry {
  const vertices: number[] = [],
    indices: number[] = [];
  const sprays = [
    [-0.57, -0.04, -0.17, 0.39, 0.28],
    [-0.18, 0.08, 0.43, 0.34, 0.27],
    [0.4, -0.02, 0.35, 0.35, 0.25],
    [0.57, 0.06, -0.26, 0.36, 0.29],
    [-0.02, -0.06, -0.31, 0.31, 0.28],
  ];
  sprays.forEach(([x, y, z, width, depth], spray) => {
    const base = vertices.length / 3;
    vertices.push(x!, y! + 0.15, z!, x! + 0.03, y! - 0.13, z! - 0.02);
    for (let ring = 0; ring < 2; ring++) {
      for (let side = 0; side < 7; side++) {
        const angle = (side / 7) * Math.PI * 2 + spray * 1.31;
        const radius = (side % 2 ? 0.69 : 1.06) * (ring ? 0.91 : 1);
        vertices.push(
          x! + Math.cos(angle) * width! * radius,
          y! + (ring ? -0.045 : 0.045) + Math.sin(angle * 3 + spray) * 0.035,
          z! + Math.sin(angle) * depth! * radius,
        );
      }
    }
    for (let side = 0; side < 7; side++) {
      const a = base + 2 + side,
        b = base + 2 + ((side + 1) % 7);
      indices.push(base, b, a, base + 1, a + 7, b + 7, a, b, a + 7, b, b + 7, a + 7);
    }
    // Four fine, tapered needle tufts break each spray's perimeter without alpha cards.
    for (let tuft = 0; tuft < 4; tuft++) {
      const angle = tuft * 1.71 + spray;
      const tip = vertices.length / 3;
      const cx = x! + Math.cos(angle) * width! * 0.73;
      const cz = z! + Math.sin(angle) * depth! * 0.73;
      vertices.push(
        cx - Math.sin(angle) * 0.035,
        y!,
        cz + Math.cos(angle) * 0.035,
        cx + Math.sin(angle) * 0.035,
        y! + 0.02,
        cz - Math.cos(angle) * 0.035,
        x! + Math.cos(angle) * width! * 1.22,
        y! + 0.09,
        z! + Math.sin(angle) * depth! * 1.22,
      );
      indices.push(tip, tip + 1, tip + 2);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

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

/** An irregular, flattened needle mass: scalloped edges, never spherical balls. */
export function pineCrownGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(1, 11, 5);
  const positions = geometry.attributes.position!;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i),
      z = positions.getZ(i);
    const angle = Math.atan2(z, x);
    const scallop = 0.85 + Math.sin(angle * 5 + y * 3) * 0.13 + Math.cos(angle * 9) * 0.07;
    positions.setXYZ(i, x * scallop, y * 0.25 + Math.sin(angle * 3) * 0.07, z * scallop);
  }
  geometry.computeVertexNormals();
  return geometry;
}

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Painting } from '../types';
import { noise, seededRandom } from './math';
import { groundHeight } from './terrain';

/** Preserve the existing relief while separating luminous snow shoulders from blue cuts. */
export function refineWinterTerrain(terrain: THREE.Group): void {
  const shadow = new THREE.Color('#293b5c');
  const snow = new THREE.Color('#aabacb');
  const foothill = new THREE.Color('#182b48');
  const tint = new THREE.Color();
  terrain.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const positions = object.geometry.getAttribute('position');
    const normals = object.geometry.getAttribute('normal');
    const colors = object.geometry.getAttribute('color');
    if (!positions || !normals || !colors) return;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        y = positions.getY(i),
        z = positions.getZ(i);
      if (y < 1 || z > -35) continue;
      const altitude = THREE.MathUtils.smoothstep(y, 5, 35);
      // Directional facets are broad and coherent; tiny random noise cannot read as gullies.
      const shoulder = THREE.MathUtils.clamp(
        normals.getY(i) * 0.62 - normals.getX(i) * 0.42 + 0.2,
        0,
        1,
      );
      const fold = Math.sin(x * 0.19 + z * 0.035 + Math.sin(z * 0.044) * 1.6);
      const cut = THREE.MathUtils.smoothstep(fold, 0.55, 0.97) * (1 - shoulder * 0.65);
      // Moonlit snow is cool and matte, not near-white icing over every rounded shoulder.
      const windScour = noise(x * 0.14, z * 0.22, 1914) * 0.06;
      tint
        .copy(shadow)
        .lerp(snow, THREE.MathUtils.clamp(shoulder * 0.96 - cut * 0.53 - windScour, 0, 1));
      tint.lerp(foothill, 1 - altitude);
      colors.setXYZ(i, tint.r, tint.g, tint.b);
    }
    colors.needsUpdate = true;
  });
}

/** Sohlberg's foreground is a curtain of bare branches, not a populated ski resort. */
function winterTree(seed: number): THREE.BufferGeometry {
  const random = seededRandom(seed);
  const pieces: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  function branch(
    start: THREE.Vector3,
    direction: THREE.Vector3,
    length: number,
    radius: number,
    depth: number,
  ) {
    const end = start.clone().addScaledVector(direction, length);
    const segment = new THREE.CylinderGeometry(radius * 0.42, radius, length, 5);
    segment.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, direction));
    segment.translate(...start.clone().lerp(end, 0.5).toArray());
    pieces.push(segment);
    if (depth === 0) return;
    const crown = direction.clone().lerp(up, 0.28).normalize();
    branch(end, crown, length * 0.73, radius * 0.48, depth - 1);
    for (let side = 0; side < 3; side++) {
      const yaw = random() * Math.PI * 2;
      const twig = new THREE.Vector3(
        Math.cos(yaw) * 0.78,
        0.24 + random() * 0.46,
        Math.sin(yaw) * 0.78,
      ).normalize();
      branch(
        start.clone().lerp(end, 0.48 + side * 0.16),
        twig,
        length * (0.4 + random() * 0.22),
        radius * 0.34,
        depth - 1,
      );
    }
  }
  branch(new THREE.Vector3(), new THREE.Vector3(0.05, 1, 0.02).normalize(), 7, 0.18, 3);
  const geometry = mergeGeometries(pieces)!;
  pieces.forEach((piece) => piece.dispose());
  return geometry;
}

function firGeometry(): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CylinderGeometry(0.045, 0.15, 8, 6);
  trunk.translate(0, 4, 0);
  pieces.push(trunk);
  // Individual sweeping boughs leave gaps in the silhouette, unlike stacked cones.
  for (let level = 0; level < 8; level++) {
    const radius = 1.6 - level * 0.17;
    for (let arm = 0; arm < 5; arm++) {
      const angle = arm * Math.PI * 0.4 + level * 2.39;
      const length = radius * (0.78 + Math.sin(arm * 7 + level) * 0.17);
      const tier = new THREE.ConeGeometry(0.38, length * 1.8, 5, 1);
      tier.scale(1, 1, 0.5);
      const direction = new THREE.Vector3(Math.cos(angle), -0.12, Math.sin(angle)).normalize();
      tier.applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction),
      );
      tier.translate(direction.x * length * 0.5, 1.7 + level * 0.76, direction.z * length * 0.5);
      pieces.push(tier);
    }
  }
  const geometry = mergeGeometries(pieces)!;
  pieces.forEach((piece) => piece.dispose());
  return geometry;
}

export function buildWinterDetails(painting: Painting): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Rondane winter clearing and bare tree curtain';
  const random = seededRandom(painting.seed);
  const snowGeometry = new THREE.PlaneGeometry(550, 500, 70, 70);
  snowGeometry.rotateX(-Math.PI / 2);
  const colors: number[] = [];
  const color = new THREE.Color();
  const dark = new THREE.Color('#11233e'),
    pale = new THREE.Color('#3a527b');
  const positions = snowGeometry.attributes.position!;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      z = positions.getZ(i);
    positions.setY(i, 0.65);
    // The valley stays in shadow; broad quiet bands lead towards the white ridge.
    const bank = Math.exp(-Math.pow((x + Math.sin(z * 0.018) * 24) / 62, 2));
    const terrace = Math.exp(-Math.pow((z + 30 + Math.sin(x * 0.018) * 8) / 12, 2));
    const branchShadow = Math.exp(-Math.pow((Math.abs(x) - 57 + z * 0.12) / 19, 2));
    color
      .copy(dark)
      .lerp(
        pale,
        Math.max(
          0,
          bank * 0.3 +
            terrace * 0.18 +
            noise(x * 0.006, z * 0.024, 25) * 0.19 -
            branchShadow * 0.16,
        ),
      );
    colors.push(color.r, color.g, color.b);
  }
  snowGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const floor = new THREE.Mesh(
    snowGeometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
  );
  floor.receiveShadow = true;
  group.add(floor);
  const treeMaterial = new THREE.MeshStandardMaterial({ color: '#08121f', roughness: 1 });
  const transform = new THREE.Object3D();
  const forest = new THREE.InstancedMesh(firGeometry(), treeMaterial, 136);
  forest.name = 'Rondane fir silhouettes';
  for (let i = 0; i < 136; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const distant = i < 64;
    const z = distant ? -51 - random() * 19 : -27 + random() * 82;
    const x = distant
      ? (random() - 0.5) * 280
      : side * (46 + random() * 58 + Math.max(0, z) * 0.22);
    transform.position.set(x, Math.max(0.65, groundHeight(painting, x, z)), z);
    transform.rotation.set(0, random() * Math.PI * 2, (random() - 0.5) * 0.08);
    const scale = distant ? 0.25 + random() * 0.3 : 0.4 + random() * 0.8;
    transform.scale.set(scale, scale * (0.9 + random() * 0.3), scale);
    transform.updateMatrix();
    forest.setMatrixAt(i, transform.matrix);
  }
  forest.instanceMatrix.needsUpdate = true;
  group.add(forest);
  // Close branches carry taper, forks, bark-colored shadows, and irregular spacing.
  for (let variation = 0; variation < 3; variation++) {
    const trees = new THREE.InstancedMesh(winterTree(93 + variation * 27), treeMaterial, 8);
    trees.name = 'Rondane bare tree branches';
    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (59 + random() * 37);
      const z = 35 + random() * 52;
      transform.position.set(x, Math.max(0.65, groundHeight(painting, x, z)), z);
      transform.rotation.set(0, random() * Math.PI * 2, -side * (0.04 + random() * 0.12));
      transform.scale.setScalar(1.5 + random() * 0.75);
      transform.updateMatrix();
      trees.setMatrixAt(i, transform.matrix);
    }
    trees.instanceMatrix.needsUpdate = true;
    group.add(trees);
  }
  const rocks = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: '#293b54', roughness: 1 }),
    60,
  );
  const caps = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#425b83', roughness: 1 }),
    60,
  );
  for (let i = 0; i < 60; i++) {
    const side = i % 2 ? -1 : 1;
    const x = side * (39 + random() * random() * 74),
      z = random() * 63 + 8;
    const radius = 0.12 + random() * 0.52;
    transform.position.set(x, Math.max(0.65, groundHeight(painting, x, z)) + radius * 0.2, z);
    transform.rotation.set(0, random() * 6.28, 0);
    transform.scale.set(radius * 1.5, radius * 0.6, radius);
    transform.updateMatrix();
    rocks.setMatrixAt(i, transform.matrix);
    transform.position.y += radius * 0.2;
    transform.scale.y *= 0.85;
    transform.updateMatrix();
    caps.setMatrixAt(i, transform.matrix);
  }
  group.add(rocks, caps);
  return group;
}

/** A restrained cobalt gradient and faint fixed stars; the painting has no aurora. */
export function createWinterSky(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      varying vec3 vPosition;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){
        vec3 d=normalize(vPosition);
        vec2 p=vec2(atan(d.x,-d.z),asin(d.y));
        vec3 color=mix(vec3(.014,.031,.095),vec3(.003,.008,.031),smoothstep(-.08,.75,p.y));
        float haze=exp(-pow((p.y-.07)*9.,2.));
        color+=vec3(.005,.009,.027)*haze;
        vec2 grid=p*170.;vec2 cell=floor(grid);vec2 q=fract(grid)-.5;
        float seed=hash(cell);float star=exp(-dot(q,q)*750.)*step(.984,seed)*smoothstep(.06,.26,p.y);
        color+=vec3(.62,.68,.77)*star*.28;
        color+=(hash(floor(p*2000.))-.5)*.002;
        gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 32), material);
  mesh.name = 'Rondane cobalt night sky';
  return mesh;
}

import * as THREE from 'three';
import { seededRandom } from './math';

/** A sparse, slow flock above the lake; one draw call including gently beating wings. */
export function buildLakeBirds() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        0, 0, -0.2, -0.62, 0.07, 0.07, -0.28, 0, 0.15, 0, 0, -0.2, -0.28, 0, 0.15, 0, 0, 0.05, 0, 0,
        -0.2, 0.28, 0, 0.15, 0.62, 0.07, 0.07, 0, 0, -0.2, 0, 0, 0.05, 0.28, 0, 0.15, -0.055, 0,
        -0.26, 0.055, 0, -0.26, 0, 0, 0.25,
      ],
      3,
    ),
  );
  geometry.computeVertexNormals();
  const random = seededRandom(43012026);
  const phases = new Float32Array(13);
  const time = { value: 0 };
  const material = new THREE.MeshBasicMaterial({ color: '#48504b', side: THREE.DoubleSide });
  material.customProgramCacheKey = () => 'within-lake-flock-v1';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFlightTime = time;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uFlightTime; attribute float flightPhase;',
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float wing = abs(position.x) / .62;
        float beat = sin(uFlightTime * 3.5 + flightPhase);
        transformed.y += wing * .25 * beat;
        transformed.x *= 1.0 - wing * .12 * abs(beat);`,
      );
  };
  const mesh = new THREE.InstancedMesh(geometry, material, phases.length);
  mesh.name = 'Lake birds in slow flight';
  const pose = new THREE.Object3D();
  for (let i = 0; i < phases.length; i++) {
    phases[i] = random() * Math.PI * 2;
    pose.position.set(
      -5 + i * 3.1 + random() * 2,
      15 + Math.sin(i * 0.7) * 2.2,
      -2 + random() * 13,
    );
    pose.rotation.y = -0.7 + random() * 0.3;
    pose.scale.setScalar(0.8 + random() * 0.4);
    pose.updateMatrix();
    mesh.setMatrixAt(i, pose.matrix);
  }
  geometry.setAttribute('flightPhase', new THREE.InstancedBufferAttribute(phases, 1));
  mesh.frustumCulled = false;
  return {
    mesh,
    update(seconds: number) {
      time.value = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
      mesh.position.set(
        Math.sin(time.value * 0.035) * 18,
        Math.sin(time.value * 0.18) * 0.22,
        Math.sin(time.value * 0.025) * 7,
      );
    },
  };
}

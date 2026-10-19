import * as THREE from 'three';
import { QINGMING_CLOUD_GLSL, qingmingLightDirection } from './qingmingEnvironment';

/** A shared moving cloud field modulates direct light; fill light remains readable. */
export function installQingmingSurfaceLight(root: THREE.Object3D) {
  const clock = { value: 0 },
    night = { value: 0 },
    sun = { value: qingmingLightDirection(0) };
  const materials = new Set<THREE.MeshStandardMaterial>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const mat of Array.isArray(object.material) ? object.material : [object.material])
      if (mat instanceof THREE.MeshStandardMaterial && !mat.userData.qingmingAtmosphere)
        materials.add(mat);
  });
  for (const material of materials) {
    const previous = material.onBeforeCompile;
    const cacheKey = material.customProgramCacheKey();
    material.userData.qingmingAtmosphere = true;
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer);
      shader.uniforms.uQmTime = clock;
      shader.uniforms.uQmNight = night;
      shader.uniforms.uQmSun = sun;
      // Cloud shadows are broad: interpolate vertex samples instead of five noise octaves per pixel.
      shader.vertexShader =
        `varying vec2 vQmLighting;uniform float uQmTime;uniform vec3 uQmSun;\n${QINGMING_CLOUD_GLSL}\n` +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `
        #include <project_vertex>
        vec4 qmPosition=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          qmPosition=instanceMatrix*qmPosition;
        #endif
        vec3 qmWorld=(modelMatrix*qmPosition).xyz;
        vec2 qmCloudPoint=(qmWorld.xz+uQmSun.xz/max(.12,uQmSun.y)*max(0.,75.-qmWorld.y))*.018+vec2(uQmTime*.008,uQmTime*.002);
        vQmLighting=vec2(qmCloud(qmCloudPoint),qmWorld.y);
      `,
      );
      shader.fragmentShader =
        'varying vec2 vQmLighting;uniform float uQmNight;\n' +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_fragment_end>',
        `
        #include <lights_fragment_end>
        float qmShade=smoothstep(.46,.69,vQmLighting.x);
        reflectedLight.directDiffuse*=1.-qmShade*.26*(1.-uQmNight);
        // Broad bounce gradient at street level, not a screen-space dark outline.
        float qmBounce=mix(.78,1.,smoothstep(2.8,5.1,vQmLighting.y));
        reflectedLight.indirectDiffuse*=qmBounce;
      `,
      );
    };
    material.customProgramCacheKey = () => cacheKey + ':qingming-cloud-light-v1';
  }
  return (time: number, value: number) => {
    if (!Number.isFinite(time) || !Number.isFinite(value)) return;
    clock.value = time;
    night.value = THREE.MathUtils.clamp(value, 0, 1);
    qingmingLightDirection(night.value, sun.value);
  };
}

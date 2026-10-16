import * as THREE from 'three';
import type { Painting } from '../types';
import { SAKURA_SUN_DIRECTION } from './sakuraLight';

/** A world-space sky: the moon stays fixed while the viewer moves through the painting. */
export function createLandscapeSky(painting: Painting): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uNight: { value: 0 },
      uDay: { value: new THREE.Color(painting.palette.sky) },
      uSakura: { value: painting.id === 'sakura' ? 1 : 0 },
      uUnderwater: { value: painting.id === 'deepsea' ? 1 : 0 },
      uSunDirection: { value: new THREE.Vector3(...SAKURA_SUN_DIRECTION).normalize() },
    },
    vertexShader: `varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vDirection;uniform vec3 uDay;uniform float uNight;uniform float uTime;
    uniform float uSakura;uniform float uUnderwater;uniform vec3 uSunDirection;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    void main(){
      vec3 d=normalize(vDirection);float altitude=smoothstep(-.08,.65,d.y);
      float dusk=sin(uNight*3.14159);
      vec3 horizon=mix(uDay,vec3(.55,.32,.19),dusk*.34);
      vec3 zenith=mix(uDay*.88,vec3(.23,.36,.42),dusk*.35);
      horizon=mix(horizon,vec3(.012,.027,.047),uNight);
      zenith=mix(zenith,vec3(.002,.007,.018),uNight);
      vec3 color=mix(horizon,zenith,altitude);
      vec2 p=vec2(atan(d.x,-d.z),asin(d.y));
      vec2 grid=p*vec2(150.,110.);vec2 cell=floor(grid);float h=hash(cell);
      float star=pow(max(0.,1.-length(fract(grid)-.5)*2.5),8.)*step(.986,h);
      color+=vec3(.55,.65,.74)*star*smoothstep(.4,.95,uNight)*smoothstep(.04,.35,d.y);
      vec3 moonDirection=normalize(vec3(.35,.48,-1.));float md=length(d-moonDirection);
      float moon=1.-smoothstep(.017,.019,md);
      color+=vec3(.68,.72,.61)*(moon*.9+exp(-md*34.)*.09)*smoothstep(.38,.95,uNight);
      float sunDistance=length(d-normalize(vec3(-.8,.15,-1.)));
      color+=vec3(.4,.18,.06)*exp(-sunDistance*3.)*dusk*.5;
      if(uSakura>.5){
        float sd=length(d-uSunDirection);
        float disc=1.-smoothstep(.008,.0095,sd);
        vec3 daylight=mix(vec3(.72,.75,.65),vec3(.32,.52,.64),altitude);
        daylight+=vec3(.8,.48,.20)*exp(-sd*9.)*.22;
        color=mix(daylight,color,smoothstep(.1,.85,uNight));
        color+=vec3(6.,4.5,2.7)*disc*(1.-uNight);
      }
      if(uUnderwater>.5) color=mix(vec3(.008,.025,.045),vec3(.035,.11,.16),smoothstep(-.4,.9,d.y));
      gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(650, 40, 24), material);
  sky.name = 'Paper horizon and moonlight';
  return sky;
}

/** Batch warm window halos into one draw call instead of hundreds of point lights. */
export function createWindowHalos(source: THREE.Group): THREE.Mesh {
  source.updateMatrixWorld(true);
  const positions: number[] = [];
  const sizes: number[] = [];
  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    const material = object.material as THREE.MeshStandardMaterial;
    if (!material.emissive || material.emissive.getHex() === 0) return;
    object.geometry.computeBoundingBox();
    const center = object.geometry.boundingBox!.getCenter(new THREE.Vector3());
    center.applyMatrix4(object.matrixWorld);
    positions.push(center.x, center.y, center.z);
    sizes.push(1.2);
  });
  const base = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = base.index;
  geometry.setAttribute('position', base.attributes.position!);
  geometry.setAttribute('uv', base.attributes.uv!);
  geometry.setAttribute(
    'offset',
    new THREE.InstancedBufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute('haloSize', new THREE.InstancedBufferAttribute(new Float32Array(sizes), 1));
  geometry.instanceCount = sizes.length;
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uNight: { value: 0 } },
    vertexShader: `attribute vec3 offset;attribute float haloSize;varying vec2 vUv;void main(){vUv=uv;vec4 view=modelViewMatrix*vec4(offset,1.);view.xy+=position.xy*haloSize;gl_Position=projectionMatrix*view;}`,
    fragmentShader: `varying vec2 vUv;uniform float uNight;void main(){float r=length(vUv-.5)*2.;float halo=exp(-r*r*5.)*smoothstep(1.,.4,r);gl_FragColor=vec4(1.,.51,.12,halo*uNight*.45);}`,
  });
  const halos = new THREE.Mesh(geometry, material);
  halos.name = 'Warm window halos';
  halos.frustumCulled = false;
  return halos;
}

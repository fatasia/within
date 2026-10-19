import { MathUtils, Vector3 } from 'three';

const moonDirection = new Vector3(0.35, 0.48, -1).normalize();

/** One celestial direction for the sky, water highlights and shadow camera. */
export function qingmingLightDirection(night: number, out = new Vector3()): Vector3 {
  const n = Number.isFinite(night) ? MathUtils.clamp(night, 0, 1) : 0;
  const dusk = MathUtils.smoothstep(n, 0, 0.45);
  const moon = MathUtils.smoothstep(n, 0.55, 1);
  out.set(-80 + dusk * 115, 140 - dusk * 128, 60 - dusk * 160).normalize();
  return out.lerp(moonDirection, moon).normalize();
}

/** Shared GLSL for the moving cloud field. No screen-space noise or texture downloads. */
export const QINGMING_CLOUD_GLSL = /* glsl */ `
float qmHash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float qmNoise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(qmHash(i),qmHash(i+vec2(1.,0.)),f.x),
    mix(qmHash(i+vec2(0.,1.)),qmHash(i+1.),f.x),f.y);
}
float qmCloud(vec2 p){
  float f=0.; float a=.52;
  for(int i=0;i<5;i++){ f+=qmNoise(p)*a; p=mat2(1.6,-1.2,1.2,1.6)*p+17.3; a*=.48; }
  return f;
}
`;

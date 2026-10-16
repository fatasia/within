// Adapted from Sakura Fantasy, Copyright (c) 2026 Bill Chan. MIT.
// See public/assets/sakura/LICENSE and docs/sakura-reference.md.
export const SAKURA_NOISE = `
float sfHash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float sfHash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float sfNoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(sfHash12(i), sfHash12(i+vec2(1,0)), u.x), mix(sfHash12(i+vec2(0,1)), sfHash12(i+vec2(1,1)), u.x), u.y); }
float sfFbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * sfNoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; } return s; }
float sfFbm3(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++){ s += a * sfNoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; } return s; }
// fallen petals: rotated ovals in jittered cells over two scales; dens 0..1 keeps that share of cells.
// px = fwidth of p in metres per pixel (from the caller, so this stays legal in vertex shaders); once a petal
// falls under a pixel it is replaced by its mean coverage instead of shimmering
float sfPetals(vec2 p, float dens, float px){
  float acc = 0.0;
  for (int l = 0; l < 2; l++) {
    float fl = float(l);
    vec2 q = p * (7.0 + fl * 4.3) + fl * 17.3;
    vec2 c = floor(q), f = fract(q) - 0.5;
    float h = sfHash12(c + fl * 31.0);
    if (fract(h * 91.7) < dens) {
      vec2 d = f - (vec2(h, fract(h * 37.1)) - 0.5) * 0.45;
      float a = h * 6.283;
      d = mat2(cos(a), -sin(a), sin(a), cos(a)) * d;
      acc = max(acc, smoothstep(0.17, 0.1, length(d * vec2(1.0, 1.7))));
    }
  }
  return mix(acc, dens * 0.09, smoothstep(0.012, 0.04, px));
}
`;
export const SAKURA_WIND = `
// gust fronts: bands of stronger wind, long across the wind and short along it, rolling downwind
float sfGust(vec2 xz){
  vec2 wd = normalize(uWind.xy);
  vec2 q = vec2(dot(xz, wd), dot(xz, vec2(-wd.y, wd.x)));
  vec2 g = vec2((q.x - uTime * (3.0 + uWind.z * 5.0)) * 0.045, q.y * 0.014);
  return smoothstep(0.35, 0.8, sfNoise(g) * 0.65 + sfNoise(g * 2.3 + 7.1) * 0.35);
}
vec3 sfWindOffset(vec3 wpRoot, float h, float stiff){
  vec2 wd = normalize(uWind.xy);
  float gust = 0.15 + 0.85 * sfGust(wpRoot.xz);
  float s = uWind.z * (0.6 + gust) * stiff;
  float bend = h * h * 0.02;
  float flutter = sin(uTime * 2.7 + wpRoot.x * 0.7 + wpRoot.z * 0.9) * 0.25 + sin(uTime * 4.9 + wpRoot.z * 1.3) * 0.12;
  return vec3(wd.x, 0.0, wd.y) * bend * s * (1.0 + flutter) + vec3(0.0, -bend * s * 0.15, 0.0);
}
`;
export const SAKURA_VERTEX = `
  {
    #ifdef USE_INSTANCING
      vec3 root = instanceMatrix[3].xyz;
      mat3 im = mat3(instanceMatrix);
      float s2 = dot(im[0], im[0]);
    #else
      vec3 root = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      mat3 im = mat3(1.0); float s2 = 1.0;
    #endif
    #ifdef SF_SWELL
      // far off, the cards grow about their centres: what thins to sparse fronds in the mip chain stays a full crown
      float sfCamD = distance((modelMatrix * vec4(root, 1.0)).xyz, cameraPosition);
      transformed = aCtr + (transformed - aCtr) * (1.0 + SF_SWELL * smoothstep(22.0, 90.0, sfCamD));
    #endif
    float hW = position.y * sqrt(s2);
    vec3 off = sfWindOffset(root, hW, SF_STIFF);
    #ifdef SF_LEAF
      float ph = aAux.y * 6.2831;
      off += vec3(sin(uTime * 3.1 + ph), sin(uTime * 2.3 + ph * 1.7) * 0.6, cos(uTime * 2.7 + ph)) * 0.035 * (0.4 + uWind.z) * aAux.x;
      vLeaf = aAux;
      vSeed = fract(sin(dot(root.xz, vec2(12.9898, 78.233))) * 43758.5453);
    #endif
    transformed += (transpose(im) * off) / s2;
  }
`;

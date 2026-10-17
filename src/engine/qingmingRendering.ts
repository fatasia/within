import * as THREE from 'three';
import { seededRandom } from './math';
export type QingmingSurface = 'wood' | 'tile' | 'stone' | 'earth' | 'plaster';
/** Shared neutral albedo, relief and roughness; pigment is material colour, not aged-paper yellow. */
export function createQingmingMaterials() {
  const cache = new Map<
    QingmingSurface,
    { map: THREE.DataTexture; bumpMap: THREE.DataTexture; roughnessMap: THREE.DataTexture }
  >();
  return (color: string, kind: QingmingSurface = 'plaster') => {
    let maps = cache.get(kind);
    if (!maps) {
      const size = 256,
        albedo = new Uint8Array(size * size * 4),
        relief = new Uint8Array(size * size * 4),
        rough = new Uint8Array(size * size * 4);
      const random = seededRandom(273 + kind.length * 31);
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const grain = random() - 0.5;
          let h = 0.6 + grain * 0.1,
            t = 0.9 + grain * 0.09,
            r = 0.91;
          if (kind === 'wood') {
            const wave = Math.sin(y * 0.58 + Math.sin(x * 0.026) * 1.4 + Math.sin(x * 0.07) * 0.3);
            h = 0.55 + wave * 0.14 + grain * 0.08;
            t = 0.83 + wave * 0.065 + grain * 0.07;
            r = 0.82 + wave * 0.06;
          } else if (kind === 'tile') {
            const seam = y % 32 < 2,
              weather = Math.sin(x * 0.19 + y * 0.03) * Math.sin(y * 0.061);
            h = seam ? 0.25 : 0.64 + grain * 0.07;
            t = seam ? 0.45 : 0.87 + weather * 0.05 + grain * 0.05;
            r = 0.87 + grain * 0.05;
          } else if (kind === 'stone') {
            const xx = (x + (Math.floor(y / 32) % 2) * 32) % 64,
              seam = xx < 2 || y % 32 < 2;
            h = seam ? 0.2 : 0.7 + grain * 0.14;
            t = seam
              ? 0.54
              : 0.89 +
                Math.sin(Math.floor(x / 64) * 18 + Math.floor(y / 32) * 11) * 0.06 +
                grain * 0.07;
          } else if (kind === 'earth') {
            const pebble = random() > 0.985;
            h = pebble ? 0.8 : 0.5 + grain * 0.2;
            t = pebble ? 0.68 : 0.87 + grain * 0.09;
          }
          const i = (y * size + x) * 4;
          albedo.set([t * 255, t * 255, t * 255, 255], i);
          relief.set([h * 255, h * 255, h * 255, 255], i);
          rough.set([r * 255, r * 255, r * 255, 255], i);
        }
      const texture = (data: Uint8Array, srgb = false) => {
        const t = new THREE.DataTexture(data, size, size);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.magFilter = THREE.LinearFilter;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.generateMipmaps = true;
        t.anisotropy = 4;
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.needsUpdate = true;
        return t;
      };
      maps = { map: texture(albedo, true), bumpMap: texture(relief), roughnessMap: texture(rough) };
      cache.set(kind, maps);
    }
    const m = new THREE.MeshStandardMaterial({
      color,
      ...maps,
      bumpScale: kind === 'wood' ? 0.025 : kind === 'stone' ? 0.045 : 0.018,
      roughness: 1,
    });
    m.userData = { surfaceColor: color, surfaceKind: kind };
    return m;
  };
}
/** Focus shadow texels where the viewer actually is, rather than spreading 1024 texels across 320m. */
export function fitQingmingShadow(eye: THREE.Vector3, target: THREE.Vector3, resolution: number) {
  const distance = eye.distanceTo(target),
    extent = THREE.MathUtils.clamp(distance * 0.62 + 15, 28, 180);
  const texel = (extent * 2) / resolution;
  const x = Math.round(target.x / texel) * texel,
    z = Math.round(target.z / texel) * texel;
  return {
    extent,
    target: new THREE.Vector3(x, 3, z),
    position: new THREE.Vector3(x - 80, 143, z + 60),
    normalBias: 0.025,
    bias: -0.00008,
  };
}

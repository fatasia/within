import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createQingmingMaterials, fitQingmingShadow } from './qingmingRendering';
import { buildQingmingMerchantHallSteps } from './qingmingMerchantHall';
import { disposeObject } from './resources';
import type { StreetMaterials } from './qingmingEpisodes';

describe('Qingming material and merchant architecture rebuild', () => {
  it('shares bounded texture sets by surface, with linear relief and sRGB pigment', () => {
    const make = createQingmingMaterials();
    const wood = make('#736051', 'wood'),
      dark = make('#494238', 'wood'),
      tile = make('#687174', 'tile');
    expect(wood.map).toBe(dark.map);
    expect(wood.bumpMap).toBe(dark.bumpMap);
    expect(wood.roughnessMap).toBe(dark.roughnessMap);
    expect(tile.map).not.toBe(wood.map);
    expect(wood.map!.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(wood.bumpMap!.colorSpace).toBe(THREE.NoColorSpace);
    expect((wood.map!.image as {width:number}).width).toBe(256);
    const g = new THREE.Group();
    for (const m of [wood, dark, tile]) g.add(new THREE.Mesh(new THREE.BoxGeometry(), m));
    const dispose = vi.spyOn(wood.map!, 'dispose');
    disposeObject(g);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
  it('concentrates shadow resolution around close subjects without changing sunlight direction', () => {
    const target = new THREE.Vector3(84.4, 6.5, -55);
    const close = fitQingmingShadow(new THREE.Vector3(102, 11, -34), target, 1024);
    const wide = fitQingmingShadow(new THREE.Vector3(100, 200, 200), target, 1024);
    expect(close.extent).toBeLessThan(wide.extent);
    expect(close.extent).toBeGreaterThanOrEqual(28);
    expect(close.extent).toBeLessThan(40);
    expect(close.position.clone().sub(close.target).toArray()).toEqual([-80, 140, 60]);
    const texel = (close.extent * 2) / 1024;
    expect(Math.abs(close.target.x - target.x)).toBeLessThanOrEqual(texel / 2);
    expect(Math.abs(close.target.z - target.z)).toBeLessThanOrEqual(texel / 2);
    expect(close.normalBias).toBeLessThan(0.05);
  });
  it('builds an open five-bay compound rather than repeating six detached houses', () => {
    const make = createQingmingMaterials();
    const materials = Object.fromEntries(
      ['wood', 'dark', 'linen', 'earth', 'stone', 'blue', 'clay', 'skin'].map((k) => [
        k,
        make('#aaa'),
      ]),
    ) as unknown as StreetMaterials;
    const steps = buildQingmingMerchantHallSteps(materials, materials.dark, materials.linen);
    let next = steps.next();
    while (!next.done) next = steps.next();
    const g = next.value;
    expect(g.userData.inventory).toEqual({
      frontBays: 5,
      storeys: 2,
      courtyardWings: 3,
      sourcePanel: 6,
    });
    const bounds = new THREE.Box3().setFromObject(g);
    expect(bounds.min.y).toBeGreaterThanOrEqual(2.79);
    expect(bounds.max.y).toBeLessThan(12);
    expect(bounds.getSize(new THREE.Vector3()).x).toBeLessThan(23);
    let finite = true;
    g.traverse((o) => {
      if (o instanceof THREE.Mesh)
        finite &&= o.geometry.attributes.position!.array.every(Number.isFinite);
    });
    expect(finite).toBe(true);
    disposeObject(g);
  });
});

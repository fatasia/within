import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildQingmingEpisodes, rammedWallSegment, type StreetMaterials } from './qingmingEpisodes';
import { disposeObject } from './resources';

function materials(): StreetMaterials {
  const stone = new THREE.MeshStandardMaterial({ color: '#9d937a' });
  const earth = new THREE.MeshStandardMaterial({ color: '#a18e68' });
  return {
    stone,
    earth,
    wood: stone,
    dark: stone,
    linen: stone,
    blue: stone,
    clay: stone,
    skin: stone,
  };
}

describe('Qingming street narrative groups', () => {
  it('keeps the wall tapered and separates earthen fabric from gate masonry', () => {
    const palette = materials(),
      wall = rammedWallSegment(palette);
    const shell = wall.children[0] as THREE.Mesh;
    expect(shell.material).toBe(palette.earth);
    const p = shell.geometry.attributes.position!;
    let top = 0,
      bottom = 0;
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) > 7) top = Math.max(top, Math.abs(p.getX(i)));
      if (p.getY(i) < 0.1) bottom = Math.max(bottom, Math.abs(p.getX(i)));
    }
    expect(top).toBeLessThan(bottom * 0.8);
    expect(wall.children.length).toBeGreaterThan(20);
    disposeObject(wall);
  });

  it('keeps both serving hands at the shared bowl rather than at unrelated props', () => {
    const scene = buildQingmingEpisodes(materials());
    scene.updateMatrixWorld(true);
    const bowl = scene.getObjectByName('shared-bowl')!;
    const bowlPoint = bowl.localToWorld(new THREE.Vector3(0, 0.04, 0));
    const seller = scene.getObjectByName('server')!;
    const patron = scene.getObjectByName('patron')!;
    const sellerHand = seller.localToWorld(new THREE.Vector3(0.2, 0.985, 0.645));
    const patronHand = patron.localToWorld(new THREE.Vector3(0.3, 0.985, 0.715));
    expect(sellerHand.distanceTo(bowlPoint)).toBeLessThan(0.1);
    expect(patronHand.distanceTo(bowlPoint)).toBeLessThan(0.1);
    expect(
      new THREE.Box3().setFromObject(scene.getObjectByName('wine-shop-huanmen')!).max.y,
    ).toBeGreaterThan(7);
    disposeObject(scene);
  });

  it('keeps complete traffic on the ground before the gate and bounds added geometry', () => {
    const scene = buildQingmingEpisodes(materials());
    scene.updateMatrixWorld(true);
    const transport = scene.getObjectByName('gate-donkey-cart')!;
    const bounds = new THREE.Box3().setFromObject(transport);
    expect(bounds.min.y).toBeGreaterThanOrEqual(2.79);
    expect(bounds.max.x).toBeLessThan(51.5);
    expect(bounds.min.z).toBeGreaterThan(-48);
    expect(bounds.max.z).toBeLessThan(-42);
    expect(transport.getObjectByName('donkey-body')).toBeDefined();
    expect(transport.getObjectByName('donkey-handler')).toBeDefined();
    let triangles = 0;
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const p = object.geometry.attributes.position!;
      expect(p.array.every(Number.isFinite)).toBe(true);
      triangles += (object.geometry.index?.count ?? p.count) / 3;
    });
    expect(triangles).toBeLessThan(18_000);
    disposeObject(scene);
  });
});

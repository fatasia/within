import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { clothCanopy, qingmingCitizen, qingmingPassageBoat, wovenBasket } from './qingmingDetails';
import { cityGround, qingmingBridgeHeight, qingmingRiver } from './cityLayout';
import { disposeObject } from './resources';

describe('Qingming close-up models', () => {
  it.each([false, true])('keeps adult proportions and bounded geometry (detail=%s)', (detail) => {
    const material = new THREE.MeshStandardMaterial();
    const citizen = qingmingCitizen(
      { robe: material, skin: material, hair: material, trim: material },
      0,
      detail,
    );
    const bounds = new THREE.Box3().setFromObject(citizen);
    expect(bounds.max.y).toBeGreaterThan(1.7);
    expect(bounds.max.y).toBeLessThan(1.82);
    let triangles = 0;
    citizen.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      triangles += (object.geometry.index?.count ?? object.geometry.attributes.position!.count) / 3;
      expect(object.geometry.attributes.position!.array.every(Number.isFinite)).toBe(true);
    });
    expect(triangles).toBeLessThan(detail ? 2000 : 500);
    disposeObject(citizen);
  });
  it('uses draped cloth and an open basket instead of solid boxes', () => {
    const material = new THREE.MeshStandardMaterial();
    const canopy = clothCanopy(3, 2, material);
    canopy.geometry.computeBoundingBox();
    expect(canopy.geometry.boundingBox!.max.y - canopy.geometry.boundingBox!.min.y).toBeGreaterThan(
      0.15,
    );
    const basket = wovenBasket(0.3, 0.4, material);
    expect(basket.children.length).toBeGreaterThan(10);
    expect((basket.children[0] as THREE.Mesh).geometry.type).toBe('CylinderGeometry');
    canopy.geometry.dispose();
    disposeObject(basket);
  });
  it('fits the lowered-rig scene below the existing timber span and inside the river', () => {
    const material = new THREE.MeshStandardMaterial();
    const boat = qingmingPassageBoat({
      timber: material,
      dark: material,
      cloth: material,
      robe: material,
      skin: material,
    });
    boat.position.set(-25, 0.45, qingmingRiver(-20) - 0.5);
    boat.updateMatrixWorld(true);
    let triangleCount = 0,
      bridgeVertices = 0,
      minimumClearance = Infinity;
    const point = new THREE.Vector3();
    boat.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const position = object.geometry.attributes.position!;
      triangleCount += (object.geometry.index?.count ?? position.count) / 3;
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
        expect(Number.isFinite(point.x + point.y + point.z)).toBe(true);
        expect(Math.abs(point.z - qingmingRiver(point.x))).toBeLessThan(10);
        expect(point.y).toBeGreaterThan(cityGround(point.x, point.z) + 0.5);
        if (object.name !== 'passage-hull') expect(point.y).toBeGreaterThan(0.04);
        if (point.x >= -24.6 && point.x <= -15.4) {
          // The lowest oblique timber is bounded by deck height minus 2.4 units.
          const clearance = qingmingBridgeHeight(point.z) - 2.4 - point.y;
          minimumClearance = Math.min(minimumClearance, clearance);
          bridgeVertices++;
        }
      }
    });
    expect(bridgeVertices).toBeGreaterThan(100);
    expect(minimumClearance).toBeGreaterThan(3.5);
    expect(triangleCount).toBeLessThan(12_000);
    expect(boat.getObjectByName('lowered-mast')).toBeDefined();
    expect(boat.getObjectByName('furled-sail')).toBeDefined();
    expect(boat.children.filter((child) => child.name.startsWith('passage-crew-'))).toHaveLength(3);
    const hullBounds = new THREE.Box3().setFromObject(boat.getObjectByName('passage-hull')!);
    expect(hullBounds.min.y).toBeLessThan(0.04); // Deliberate hull draft, not submerged crew/deck.
    expect(hullBounds.max.y).toBeGreaterThan(0.04);
    disposeObject(boat);
  });
});

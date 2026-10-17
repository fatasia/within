import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildXihu, xihuGroundY, XIHU_BANK_Y, XIHU_PAVING_Y } from './featuredXihu';
import { buildHuangshan } from './featuredHuangshan';
import { disposeObject } from './resources';
import { groundHeight } from './terrain';
import { getPainting } from '../data/paintings';

function metrics(group: THREE.Group) {
  let draws = 0, triangles = 0;
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    draws++;
    triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3 * (object instanceof THREE.InstancedMesh ? object.count : 1);
    const positions = object.geometry.getAttribute('position');
    // Validate every vertex without constructing hundreds of thousands of matcher objects on CI.
    let finite=true;
    for (let i=0;i<positions.count;i++) if(!Number.isFinite(positions.getX(i)+positions.getY(i)+positions.getZ(i))) {finite=false;break;}
    expect(finite).toBe(true);
  });
  return { draws, triangles };
}
describe('West Lake and Huangshan landscapes', () => {
  it('keeps the bridge walk datum aligned and open lake non-walkable', () => {
    expect(XIHU_PAVING_Y - XIHU_BANK_Y).toBeGreaterThan(0.05);
    expect(xihuGroundY(25, 13)).toBe(XIHU_PAVING_Y);
    expect(xihuGroundY(-7, 7)).toBeCloseTo(2.4);
    expect(groundHeight(getPainting('xihu'), -7, 7)).toBeCloseTo(2.4);
    expect(groundHeight(getPainting('xihu'), 0, -60)).toBe(0.8);
    expect(xihuGroundY(-7, -2)).toBeCloseTo(0.72);
    expect(xihuGroundY(-7, 16)).toBeCloseTo(0.72);
    expect(xihuGroundY(0, -28)).toBe(0.8);
    expect(xihuGroundY(-62, 17)).toBe(0.6);
    expect(xihuGroundY(35, -20)).toBe(-1);
  });
  it('retains five octagonal storeys and the requested separated legend figures', () => {
    const world = buildXihu();
    try {
      const pagoda = world.getObjectByName('雷峰塔 · 五层八面')!;
      expect(pagoda.children.filter(child => child.name.startsWith('雷峰塔第'))).toHaveLength(5);
      const white = world.getObjectByName('白娘子 · 断桥同伞')!;
      const scholar = world.getObjectByName('许仙 · 断桥同伞')!;
      const monk = world.getObjectByName('法海 · 远处南屏岸')!;
      expect(white.position.distanceTo(scholar.position)).toBeLessThan(1);
      expect(monk.position.distanceTo(white.position)).toBeGreaterThan(50);
      expect(white.position.y).toBeCloseTo(xihuGroundY(white.position.x, white.position.z));
      expect(white.getObjectByName('白蛇盘尾')).toBeDefined();
      expect(white.getObjectByName('布鞋')).toBeUndefined();
      expect(monk.getObjectByName('发髻')).toBeUndefined();
      expect(white.userData.encounterId).toBe('xihu-white-snake');
      expect(scholar.userData.encounterId).toBe('xihu-xuxian');
      const { draws, triangles } = metrics(world);
      expect(draws).toBeLessThan(90); expect(triangles).toBeLessThan(250000);
      const boat = world.getObjectByName('湖上摇橹船')!;
      world.userData.update(0, 0); const before = boat.position.clone(); world.userData.update(12, 0);
      expect(before.distanceTo(boat.position)).toBeGreaterThan(0.1);
    } finally { disposeObject(world); }
  });
  it('batches peak and pine detail and animates the cloud material', () => {
    const world = buildHuangshan();
    try {
      const { draws, triangles } = metrics(world);
      expect(draws).toBeLessThan(110); expect(triangles).toBeLessThan(350000);
      const cloud = world.getObjectByName('drifting-cloud-inversion') as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
      world.userData.update(12, 0.4);
      expect(cloud.material.uniforms.uTime!.value).toBe(12);
      expect(cloud.material.uniforms.uNight!.value).toBe(0.4);
    } finally { disposeObject(world); }
  });
});



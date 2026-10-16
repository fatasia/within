import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { pickCharacter } from './characterEncounters';
import { disposeObject } from './resources';

describe('visible character picking', () => {
  it('returns the nearest nested tagged root and ignores hidden rigs', () => {
    const content = new THREE.Group(), near = new THREE.Group(), far = new THREE.Group();
    near.userData.encounterId = 'sakura-boatman'; far.userData.encounterId = 'xihu-xuxian';
    near.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
    far.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
    near.position.z = 2; content.add(far, near);
    const ray = new THREE.Raycaster(new THREE.Vector3(0, 0, 5), new THREE.Vector3(0, 0, -1));
    expect(pickCharacter(content, ray)).toEqual({ id: 'sakura-boatman', object: near });
    near.visible = false; expect(pickCharacter(content, ray)?.id).toBe('xihu-xuxian');
    far.children[0].visible = false; expect(pickCharacter(content, ray)).toBeUndefined();
    disposeObject(content);
  });
  it('preserves the original untagged visitor and rejects off-target clicks', () => {
    const content = new THREE.Group(), visitor = new THREE.Group(); visitor.name = 'Quiet visitor';
    visitor.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())); content.add(visitor);
    const ray = new THREE.Raycaster(new THREE.Vector3(0, 0, 5), new THREE.Vector3(0, 0, -1));
    expect(pickCharacter(content, ray)).toEqual({ id: undefined, object: visitor });
    ray.ray.origin.x = 5; expect(pickCharacter(content, ray)).toBeUndefined(); disposeObject(content);
  });
});

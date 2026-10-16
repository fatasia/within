import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { installSakuraBoat } from './sakuraBoat';
import { disposeObject } from './resources';

const mocks = vi.hoisted(() => ({ load: vi.fn(), dispose: vi.fn() }));
vi.mock('three/addons/loaders/KTX2Loader.js', () => ({ KTX2Loader: class {
  setTranscoderPath() { return this; }
  setWorkerLimit() { return this; }
  detectSupport() { return this; }
  dispose() { mocks.dispose(); }
} }));
vi.mock('three/addons/loaders/GLTFLoader.js', () => ({ GLTFLoader: class {
  setKTX2Loader() { return this; }
  setMeshoptDecoder() { return this; }
  loadAsync(url: string) { return mocks.load(url); }
} }));

function fixture() {
  const root = new THREE.Group(), boat = new THREE.Group();
  boat.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())); root.add(boat);
  root.userData.sakuraAssetsReady = Promise.resolve();
  return { root, boat, integration: installSakuraBoat(root, boat) };
}

describe('original Sakura boat resource lifecycle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not start loading after its scene has been disposed', async () => {
    const { root, integration } = fixture(); disposeObject(root);
    await integration.prepare({} as THREE.WebGLRenderer);
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it('loads once, cleans late assets and never mounts them on a disposed scene', async () => {
    const pending: ((value: {scene: THREE.Group}) => void)[] = [];
    mocks.load.mockImplementation(() => new Promise(resolve => pending.push(resolve)));
    const { root, boat, integration } = fixture();
    const first = integration.prepare({} as THREE.WebGLRenderer);
    expect(integration.prepare({} as THREE.WebGLRenderer)).toBe(first);
    expect(mocks.load).toHaveBeenCalledTimes(4);
    disposeObject(root);
    const disposals = pending.map(resolve => {
      const scene = new THREE.Group(), geometry = new THREE.BoxGeometry(), material = new THREE.MeshStandardMaterial();
      const spy = vi.spyOn(geometry, 'dispose'); scene.add(new THREE.Mesh(geometry, material)); resolve({ scene }); return spy;
    });
    await first;
    disposals.forEach(spy => expect(spy).toHaveBeenCalledOnce());
    expect(boat.getObjectByName('sakura-fantasy-original-tomabune')).toBeUndefined();
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });

  it('keeps the fallback visible and disposes successful siblings after a failed asset', async () => {
    const geometry = new THREE.BoxGeometry(), material = new THREE.MeshStandardMaterial();
    const dispose = vi.spyOn(geometry, 'dispose');
    mocks.load.mockImplementation((url: string) => {
      if (url.includes('/boat.glb')) return Promise.reject(new Error('boat unavailable'));
      const scene = new THREE.Group(); scene.add(new THREE.Mesh(geometry.clone(), material.clone()));
      if (url.includes('/boatman.glb')) scene.add(new THREE.Mesh(geometry, material));
      return Promise.resolve({ scene });
    });
    const { root, boat, integration } = fixture();
    await expect(integration.prepare({} as THREE.WebGLRenderer)).rejects.toThrow('boat unavailable');
    await expect(root.userData.sakuraAssetsReady).rejects.toThrow('boat unavailable');
    expect(root.userData.sakuraAssetError).toContain('boat unavailable');
    expect(boat.getObjectByName('tomabune-loading-proxy')!.visible).toBe(true);
    expect(dispose).toHaveBeenCalledOnce(); expect(mocks.dispose).toHaveBeenCalledOnce();
    disposeObject(root);
  });
});

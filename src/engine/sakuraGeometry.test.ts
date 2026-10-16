import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { SakuraGeometryQueue } from './sakuraGeometry';
import { geometryTransfers, packGeometry, unpackGeometry } from './sakuraGeometryData';

describe('Sakura worker geometry', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('transfers typed buffers without changing geometry, indexing or UVs', () => {
    const original = new THREE.BoxGeometry(3, 4, 5), packed = packGeometry(original);
    const restored = unpackGeometry(packed);
    expect(restored.index!.array).toEqual(original.index!.array);
    expect(restored.attributes.position.array).toEqual(original.attributes.position.array);
    expect(restored.attributes.uv.array).toEqual(original.attributes.uv.array);
    expect(restored.boundingSphere!.radius).toBeCloseTo(Math.sqrt(50) / 2);
    const transfers = geometryTransfers({ wood: packed, leaf: packed });
    expect(transfers.length).toBe(4); original.dispose(); restored.dispose();
  });

  it('rejects pending work and terminates the worker on disposal, without late mounts', async () => {
    const terminate = vi.fn(), post = vi.fn();
    vi.stubGlobal('Worker', class { onmessage = null; onerror = null; postMessage = post; terminate = terminate; });
    const queue = new SakuraGeometryQueue();
    const a = queue.generate('sakura', 101), b = queue.generate('cedar', 707);
    const results = Promise.allSettled([a, b]); queue.dispose();
    expect((await results).map(result => result.status)).toEqual(['rejected', 'rejected']);
    expect(post).toHaveBeenCalledTimes(2); expect(terminate).toHaveBeenCalledOnce();
    await expect(queue.generate('sakura', 202)).rejects.toThrow('disposed');
  });
});

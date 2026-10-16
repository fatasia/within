import { sakura, cedar } from './sakuraVendor/trees.js';
import { geometryTransfers, packGeometry } from './sakuraGeometryData';

self.onmessage = (event: MessageEvent<{ id: number; kind: 'sakura' | 'cedar'; seed: number; distant: boolean }>) => {
  const { id, kind, seed, distant } = event.data;
  try {
    const geometry = kind === 'sakura' ? sakura(seed, distant) : cedar(seed, 2);
    const tree = { wood: packGeometry(geometry.wood), leaf: packGeometry(geometry.leaf) };
    self.postMessage({ id, tree }, { transfer: geometryTransfers(tree) });
  } catch (error) { self.postMessage({ id, error: String(error) }); }
};

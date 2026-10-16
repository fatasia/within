import { sakura, cedar } from './sakuraVendor/trees.js';
import { unpackGeometry, type PackedTree, type SakuraTreeGeometry } from './sakuraGeometryData';

/** Transfer buffers instead of generating every recursive twig on the UI thread. */
export class SakuraGeometryQueue {
  private worker: Worker | undefined;
  private disposed = false;
  private serial = 0;
  private timeout: ReturnType<typeof setTimeout> | undefined;
  private pending = new Map<number, { resolve: (value: SakuraTreeGeometry) => void; reject: (reason: Error) => void }>();

  generate(kind: 'sakura' | 'cedar', seed: number, distant = false): Promise<SakuraTreeGeometry> {
    if (this.disposed) return Promise.reject(new Error('Sakura geometry queue disposed'));
    // Node-based geometry tests have no Worker; browsers always use the non-blocking path.
    if (typeof Worker === 'undefined') return Promise.resolve(kind === 'sakura' ? sakura(seed, distant) : cedar(seed, 2));
    if (!this.worker) {
      this.worker = new Worker(new URL('./sakuraGeometry.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (event: MessageEvent<{ id: number; tree?: PackedTree; error?: string }>) => {
        const job = this.pending.get(event.data.id);
        if (!job) return;
        this.pending.delete(event.data.id);
        if (!this.pending.size) { clearTimeout(this.timeout); this.timeout = undefined; }
        if (!event.data.tree) job.reject(new Error(event.data.error ?? 'Sakura geometry worker failed'));
        else job.resolve({ wood: unpackGeometry(event.data.tree.wood), leaf: unpackGeometry(event.data.tree.leaf) });
      };
      this.worker.onerror = event => this.fail(new Error(event.message || 'Sakura geometry worker failed'));
    }
    const id = ++this.serial;
    const promise = new Promise<SakuraTreeGeometry>((resolve, reject) => this.pending.set(id, { resolve, reject }));
    if (!this.timeout) this.timeout = setTimeout(() => this.fail(new Error('Sakura geometry worker timed out')), 15000);
    this.worker.postMessage({ id, kind, seed, distant });
    return promise;
  }

  private fail(error: Error): void {
    clearTimeout(this.timeout); this.timeout = undefined;
    this.pending.forEach(job => job.reject(error)); this.pending.clear();
    this.worker?.terminate(); this.worker = undefined;
  }

  dispose(): void {
    this.disposed = true;
    this.fail(new Error('Sakura geometry queue disposed'));
  }
}

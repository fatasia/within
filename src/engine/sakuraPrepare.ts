import * as THREE from 'three';

export interface SakuraRenderContext { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.Camera }
const initializedPrograms = new WeakMap<object, Promise<void>>();

/** Planar reflections use a different output/tone-mapping program from the canvas. */
export async function compileSakuraPrograms(
  renderer: THREE.WebGLRenderer, object: THREE.Object3D, scene: THREE.Scene, camera: THREE.Camera,
): Promise<void> {
  await renderer.compileAsync(object, camera, scene);
  const targets: THREE.WebGLRenderTarget[] = [];
  scene.traverse(item => {
    const reflector = item as THREE.Object3D & { isReflector?: boolean; getRenderTarget?: () => THREE.WebGLRenderTarget };
    if (reflector.isReflector && reflector.getRenderTarget) targets.push(reflector.getRenderTarget());
  });
  for (const target of targets) {
    const previous = renderer.getRenderTarget();
    let compiling: Promise<THREE.Object3D>;
    try {
      renderer.setRenderTarget(target);
      compiling = renderer.compileAsync(object, camera, scene);
    } finally { renderer.setRenderTarget(previous); }
    await compiling;
  }
  // Three defers uniform/attribute introspection until onFirstUse, even after
  // parallel linking. Spread that driver work across tasks before the object appears.
  for (const program of renderer.info.programs ?? []) {
    let preparation = initializedPrograms.get(program);
    if (!preparation) {
      preparation = (async () => {
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        if (!program.program || program.usedTimes <= 0) return;
        // Double-sided materials have a separate back-face program that Three's
        // material-level compileAsync check does not necessarily wait for.
        const parallel = program as typeof program & { isReady?: () => boolean };
        while (program.program && parallel.isReady && !parallel.isReady()) {
          await new Promise<void>(resolve => setTimeout(resolve, 10));
        }
        if (!program.program || program.usedTimes <= 0) return;
        program.getUniforms(); program.getAttributes();
      })();
      initializedPrograms.set(program, preparation);
    }
    // Concurrent tree/boat preparation must await the same in-flight operation,
    // not mistake a program scheduled by another builder for an initialized one.
    await preparation;
  }
}

export async function prepareSakuraObject(parent: THREE.Group, object: THREE.Object3D): Promise<void> {
  const context = parent.userData.sakuraRenderContext as SakuraRenderContext | undefined;
  if (context) await compileSakuraPrograms(context.renderer, object, context.scene, context.camera);
}

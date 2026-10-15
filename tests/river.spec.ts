import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('river compiles and renders scene geometry into its real reflection target', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route('**/river-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body style="margin:0"></body></html>',
    }),
  );
  await page.goto('/river-test');
  const reflectedPixels = await page.evaluate(async () => {
    // Standalone scene isolates reflector compilation from the gallery lifecycle.
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { buildRiver } = await import('/src/engine/river.ts');
    const { getPainting } = await import('/src/data/paintings.ts');
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(1000, 700);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#d7e0dd');
    const camera = new THREE.PerspectiveCamera(45, 1000 / 700, 0.1, 1000);
    camera.position.set(16, 15, 30);
    camera.lookAt(0, 2, -4);
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(6, 14, 9),
      new THREE.MeshBasicMaterial({ color: '#c93424' }),
    );
    mountain.position.set(0, 7, -9);
    scene.add(mountain);
    const river = buildRiver(getPainting('qianli'), 'balanced');
    river.update(1, 0);
    scene.add(river.mesh);
    renderer.render(scene, camera);
    const target = river.mesh.getRenderTarget();
    const pixels = new Uint16Array(target.width * target.height * 4);
    renderer.readRenderTargetPixels(target, 0, 0, target.width, target.height, pixels);
    let redPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = THREE.DataUtils.fromHalfFloat(pixels[i]);
      const g = THREE.DataUtils.fromHalfFloat(pixels[i + 1]);
      if (r > g * 2 && r > 0.1) redPixels++;
    }
    // Keep the rendered canvas available for a diagnostic screenshot.
    river.dispose();
    mountain.geometry.dispose();
    mountain.material.dispose();
    renderer.dispose();
    return redPixels;
  });
  expect(reflectedPixels).toBeGreaterThan(100);
  expect(errors).toEqual([]);
  await mkdir('artifacts/screenshots', { recursive: true });
  await page.screenshot({ path: 'artifacts/screenshots/river-reflection-check.png' });
});

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createBoatman, createPassenger, createWagasa, headLook } from './sakuraVendor/figures.js';
import { disposeObject } from './resources';
import { compileSakuraPrograms } from './sakuraPrepare';

/** Original MIT tomabune and CC0-based rigged people, decoded once per scene. */
export function installSakuraBoat(parent: THREE.Group, boat: THREE.Group) {
  const fallback = new THREE.Group(); fallback.name = 'tomabune-loading-proxy';
  [...boat.children].forEach(child => fallback.add(child)); boat.add(fallback);
  const proxy = fallback.children.find(child => child instanceof THREE.Mesh) as THREE.Mesh;
  const sentinel = (Array.isArray(proxy.material) ? proxy.material[0] : proxy.material);
  // Keep the light count stable from the first frame. Adding lights after GLB decode
  // invalidates every tree/building shader, not just the new figure materials.
  const lightRig = new THREE.Group(); lightRig.rotation.y = Math.PI / 2; boat.add(lightRig);
  const lamp = new THREE.PointLight('#ffc17d', 0, 7, 2); lamp.position.set(0, 1.82, 4.18); lightRig.add(lamp);
  const bounce = new THREE.PointLight('#fff1dc', 7, 7, 2); bounce.position.set(-1.5, 2.5, -2.6); lightRig.add(bounce);
  let disposed = false;
  let transcoder: KTX2Loader | undefined;
  let loading: Promise<void> | undefined;
  let animate: ((time: number, night: number) => void) | undefined;
  let latestTime = 0, latestNight = 0, greetingUntil = -1;
  let passengerView = false;
  let setPassenger: ((active: boolean) => void) | undefined;
  parent.userData.setPassengerView = (active: boolean) => {
    passengerView = active; setPassenger?.(active);
    // The short loading proxy's bow lantern sits only 40 cm from the real passenger
    // eye. Hide that proxy-only obstruction while the original boat is preparing.
    fallback.children.forEach(child => { if (child.name === 'sakura-loading-bow-lantern') child.visible = !active; });
  };
  sentinel.addEventListener('dispose', () => { disposed = true; });
  const textureReady = parent.userData.sakuraAssetsReady as Promise<unknown>;

  const prepare = (renderer: THREE.WebGLRenderer, scene?: THREE.Scene, camera?: THREE.Camera): Promise<void> => {
    if (loading) return loading;
    if (disposed) return Promise.resolve();
    const started = performance.now();
    let targetScene: THREE.Object3D = scene ?? parent;
    while (targetScene.parent) targetScene = targetScene.parent;
    const compileCamera = camera ?? new THREE.PerspectiveCamera();
    if (targetScene instanceof THREE.Scene) parent.userData.sakuraRenderContext = { renderer, scene: targetScene, camera: compileCamera };
    const base = `${import.meta.env.BASE_URL}assets/sakura/`;
    transcoder = new KTX2Loader().setTranscoderPath(`${base}basis/`).setWorkerLimit(2).detectSupport(renderer);
    const loader = new GLTFLoader().setKTX2Loader(transcoder).setMeshoptDecoder(MeshoptDecoder);
    const assets = ['boat', 'boatman', 'passenger', 'wagasa'];
    loading = (async () => {
      const results = await Promise.allSettled(assets.map(name => loader.loadAsync(`${base}models/${name}.glb`)));
      const loaded = results.flatMap(result => result.status === 'fulfilled' ? [result.value.scene] : []);
      let assembled: THREE.Group | undefined;
      try {
        const failure = results.find(result => result.status === 'rejected');
        if (disposed || failure) {
          if (failure?.status === 'rejected') throw failure.reason;
          loaded.forEach(disposeObject);
          return;
        }
        const [hullSource, boatmanSource, passengerSource, umbrellaSource] = loaded;
        const model = new THREE.Group(); assembled = model; model.name = 'sakura-fantasy-original-tomabune';
        // Upstream bow is +Z; the shared voyage sampler authors its bow along +X.
        model.rotation.y = Math.PI / 2;
        const hull = hullSource.getObjectByName('hull')!;
        const lantern = hullSource.getObjectByName('lantern')!;
        const oarMesh = hullSource.getObjectByName('ro')!;
        model.add(hull, lantern);
        const oar = new THREE.Group(); oar.name = 'original-ro-sculling-pivot';
        oar.position.set(0.42, 0.62, -3.85); oar.add(oarMesh); model.add(oar);
        const passenger = createPassenger(passengerSource);
        const passengerSeat = new THREE.Group(); passengerSeat.position.set(0, -0.05, 1.8);
        passengerSeat.add(passenger.root); model.add(passengerSeat);
        const look = headLook(passenger);
        const umbrella = new THREE.Group(); umbrella.add(createWagasa(umbrellaSource)); model.add(umbrella);
        setPassenger = active => { passenger.head.scale.setScalar(active ? 0.0001 : 1); umbrella.visible = !active; };
        setPassenger(passengerView);
        const rower = new THREE.Group(); rower.name = 'sakura-fantasy-sendo';
        rower.position.set(-0.03, -0.0355, -3.12); rower.rotation.y = 1.25;
        const man = createBoatman(boatmanSource); rower.add(man.root); model.add(rower);
        man.root.userData.encounterId = 'sakura-boatman';
        man.root.userData.onEncounter = () => { greetingUntil = latestTime + 3; };
        const paper: THREE.MeshStandardMaterial[] = [];
        const figureLights = new Set<{
          uSunCol: { value: THREE.Color }; uSkyHor: { value: THREE.Color }; uAmbUp: { value: THREE.Color };
        }>();
        model.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = true; object.receiveShadow = true;
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            if (material.userData.sakuraFigureLight) figureLights.add(material.userData.sakuraFigureLight);
            if (material instanceof THREE.MeshStandardMaterial) {
              material.aoMapIntensity = 0.75;
              if (material.name === 'paper') { material.emissiveMap = material.map; paper.push(material); }
            }
          }
        });
        // KHR_parallel_shader_compile keeps complex original skin/cloth shaders off
        // the first visible frame. The fallback remains usable during preparation.
        if (targetScene instanceof THREE.Scene) {
          await compileSakuraPrograms(renderer, model, targetScene, compileCamera);
        }
        const textures = new Set<THREE.Texture>();
        model.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return;
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
          }
        });
        for (const texture of textures) {
          if (disposed) break;
          renderer.initTexture(texture);
          // Upload at most one texture per task instead of a large first-draw burst.
          await new Promise<void>(resolve => setTimeout(resolve, 0));
        }
        if (disposed) { disposeObject(model); loaded.forEach(disposeObject); return; }
        boat.add(model);
        const g = new THREE.Vector3(), g2 = new THREE.Vector3(), gw = new THREE.Vector3(), gw2 = new THREE.Vector3();
        const forward = new THREE.Vector3(), qr = new THREE.Quaternion(), hands = new THREE.Quaternion();
        const axis = new THREE.Vector3(), spin = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
        const grip = new THREE.Vector3(0, 0.4, 0.93), loom = new THREE.Vector3(0, 0.28, 0.66);
        const umbrellaHand = new THREE.Vector3(0.14, 0.37, 2.04);
        animate = (time, night) => {
          const phase = time * 1.65, stroke = Math.sin(phase);
          oar.rotation.set(0.04 * Math.sin(phase * 2), 0.3 * stroke, 0.28 * Math.cos(phase), 'YXZ');
          oar.updateMatrix(); g.copy(grip).applyMatrix4(oar.matrix); g2.copy(loom).applyMatrix4(oar.matrix);
          forward.set(Math.sin(rower.rotation.y), 0, Math.cos(rower.rotation.y));
          const shift = 0.05 * stroke;
          const ahead = (g.x - rower.position.x) * forward.x + (g.z - rower.position.z) * forward.z - shift;
          const lean = Math.min(0.35, Math.max(-0.12, (ahead - 0.49) * 0.9));
          boat.updateMatrixWorld(true);
          model.localToWorld(gw.copy(g)); model.localToWorld(gw2.copy(g2));
          model.getWorldQuaternion(qr); hands.copy(qr).multiply(oar.quaternion).multiply(qr.invert());
          man.pose({ shift, dip: 0.015 * Math.abs(stroke), lean, turn: 0.1 * stroke, grips: [gw, gw2], hands,
            look: [time < greetingUntil ? Math.sin(time * 5) * 0.14 : -lean * 0.8 + 0.04 * Math.sin(time * 0.4), time < greetingUntil ? 0.35 : -0.95 + 0.25 * Math.sin(time * 0.13), 0] });
          look(0.06 * Math.sin(time * 0.23) - 0.03, 0.42 * Math.sin(time * 0.11) + 0.14 * Math.sin(time * 0.37), 0.04 * Math.sin(time * 0.17));
          axis.set(0.04 + 0.025 * Math.sin(time * 0.5), 0.927, -0.374 + 0.02 * Math.sin(time * 0.41 + 1)).normalize();
          umbrella.quaternion.setFromUnitVectors(up, axis).multiply(spin.setFromAxisAngle(up, Math.sin(time * 0.35) * 0.5));
          umbrella.position.copy(umbrellaHand).addScaledVector(axis, -0.12);
          for (const material of paper) {
            material.emissive.set('#ffc17d'); material.emissiveIntensity = night * 2.6;
          }
          lamp.intensity = night * 5;
          bounce.intensity = 7 - night * 6.3;
          for (const light of figureLights) {
            light.uSunCol.value.setRGB(1.5 - night * 1.35, 1.3 - night * 1.15, 1.1 - night * 0.9);
            light.uSkyHor.value.setRGB(0.5 - night * 0.4, 0.55 - night * 0.42, 0.6 - night * 0.43);
            light.uAmbUp.value.setRGB(0.4 - night * 0.31, 0.45 - night * 0.34, 0.5 - night * 0.36);
          }
        };
        fallback.visible = false;
        animate(latestTime, latestNight);
        parent.userData.sakuraOriginalBoatLoaded = true;
        performance.measure('sakura:boat-ready', { start: started });
      } catch (error) {
        fallback.visible = true;
        if (assembled) { assembled.removeFromParent(); disposeObject(assembled); }
        loaded.forEach(disposeObject);
        throw error;
      } finally {
        transcoder?.dispose(); transcoder = undefined;
      }
    })();
    // Keep the rejected promise observable to explicit asset validation, but never leave it unhandled.
    loading.catch(error => { parent.userData.sakuraAssetError = String(error); });
    const ready = Promise.all([textureReady, loading]);
    ready.catch(error => { parent.userData.sakuraAssetError = String(error); });
    parent.userData.sakuraAssetsReady = ready;
    return loading;
  };
  parent.userData.prepareAssets = prepare;
  proxy.onBeforeRender = renderer => { void prepare(renderer); };
  return { prepare, update(time: number, night: number) { latestTime = time; latestNight = night; animate?.(time, night); } };
}

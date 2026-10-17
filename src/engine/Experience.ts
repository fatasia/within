import { fitQingmingShadow } from './qingmingRendering';
import * as THREE from 'three';
import { pickCharacter } from './characterEncounters';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ExperienceState, Painting, Telemetry } from '../types';
import { getPainting } from '../data/paintings';
import { clamp, seededRandom } from './math';
import { buildTerrainSteps, groundHeight } from './terrain';
import { buildForest, buildVillage, buildEmpire, boat, bridge } from './props';
import { mistMaterial } from './materials';
import { batchStatic, disposeObject, estimateSceneBytes } from './resources';
import { createLandscapeSky, createWindowHalos } from './atmosphere';
import { buildNearDetails } from './details';
import { buildWinterDetails, createWinterSky, refineWinterTerrain } from './winter';
import { buildEmpireDetails } from './empireDetails';
import { attachVegetationMotion, type VegetationMotion } from './vegetationMotion';
import { buildLivingActors, type LivingActors } from './livingActors';
import { buildLakeBirds } from './lakeBirds';
import { createLightingState, resolveSceneNight, sampleSceneLighting } from './sceneLighting';
import { createWaterfall, updateWaterfall, type Waterfall } from './waterfall';
import { getWalkStart, walkFieldOfView } from './viewpoints';
import { createPainterlyStarrySky, buildStarryDetails } from './starry';
import { buildRiver, type River } from './river';
import { paintFilmFrame } from './film';
import { getCinematicView, type CinematicView } from './cinematography';
import { buildEasterEgg } from './easterEgg';
import { buildQingmingSteps } from './qingming';
import { buildLandscapeDetails } from './landscapes';
import { buildFeaturedWorld, featuredUpdate, isFeaturedWorld, type FeaturedUpdate } from './featuredWorlds';
import { buildWuhan, updateWuhan } from './wuhan';
import { getWuhanGround, wuhanPath, wuhanWalkHeight } from './wuhanLayout';
import { pointerDistance, scrollZoom, walkInput, wheelPixels } from './interaction';
import { orientCanvasEvent } from '../components/viewport';
import { sampleSakuraPassengerView, sampleSakuraVoyage } from './sakuraVoyage';
import { compileSakuraPrograms } from './sakuraPrepare';
import { sampleRoadsterMotion, sampleRoadsterCockpit } from './roadsterMotion';
import { SAKURA_SUN_DIRECTION } from './sakuraLight';

interface Callbacks {
  onTelemetry: (data: Telemetry) => void;
  onError: (message: string) => void;
  onEncounter?: (id?: string) => void;
}
interface SceneBundle {
  retainedBytes: number;
  content: THREE.Group;
  river: River | null;
  sky: THREE.Mesh | null;
  halos: THREE.Mesh | null;
  mist: THREE.Group;
  empire: THREE.Group | null;
  wuhan: THREE.Group | null;
  vegetation: VegetationMotion | null;
  livingActors: LivingActors | null;
  lakeBirds: ReturnType<typeof buildLakeBirds> | null;
  waterfall: Waterfall | null;
  boats: THREE.Group[];
  birds: THREE.LineSegments | null;
  scenePeriod: number;
  featured: FeaturedUpdate | null;
}
const vector = (v: readonly number[]) => new THREE.Vector3(v[0], v[1], v[2]);
export class Experience {
  readonly ready: Promise<void>;
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(39, 1, 0.1, 1600);
  private controls: OrbitControls;
  private content = new THREE.Group();
  private sun = new THREE.DirectionalLight('#fff0d2', 2.1);
  private ambient = new THREE.HemisphereLight('#f4f0df', '#7c8468', 2.4);
  private river: River | null = null;
  private sky: THREE.Mesh | null = null;
  private halos: THREE.Mesh | null = null;
  private mist = new THREE.Group();
  private empire: THREE.Group | null = null;
  private wuhan: THREE.Group | null = null;
  private vegetation: VegetationMotion | null = null;
  private livingActors: LivingActors | null = null;
  private lakeBirds: ReturnType<typeof buildLakeBirds> | null = null;
  private waterfall: Waterfall | null = null;
  private boats: THREE.Group[] = [];
  private birds: THREE.LineSegments | null = null;
  private featured: FeaturedUpdate | null = null;
  private route: THREE.CatmullRomCurve3;
  private state: ExperienceState;
  private painting: Painting;
  private progress = 0;
  private currentEye = new THREE.Vector3();
  private currentTarget = new THREE.Vector3();
  private walkingPosition = new THREE.Vector3();
  private yaw = 0;
  private pitch = 0;
  private keys = new Set<string>();
  private pointers = new Map<number, { x: number; y: number }>();
  private walkPointer: number | null = null;
  private pointerTravel = 0;
  private pickPointers = new Map<number, { x: number; y: number; travel: number }>();
  private pickBlocked = false;
  private suppressPointerLockClick = false;
  private encounterRay = new THREE.Raycaster();
  private walkInitialized = false;
  private stick = { x: 0, y: 0 };
  private scrollMagnification = 1;
  private frame = 0;
  private lastTime = 0;
  private statsTime = 0;
  private frameCount = 0;
  private elapsed = 0;
  private roadsterMusicClock?: () => number | undefined;
  private resizeObserver: ResizeObserver;
  private abort = new AbortController();
  private disposed = false;
  private sceneBuilding = false;
  private sceneReady = false;
  private sceneQuality: ExperienceState['quality'] = 'high';
  private scenePeriod = 0;
  // Two retained worlds plus the active world; never preload the whole collection.
  private sceneCache = new Map<string, SceneBundle>();
  private sceneRequest = 0;
  private pendingScene: ExperienceState | null = null;
  private sceneTask: Promise<void> | null = null;
  private filmActive = false;
  private filmCancel: (() => void) | null = null;
  private offline: { state: ExperienceState; progress: number; canvas: HTMLCanvasElement } | null =
    null;
  private night = 0;
  private lighting = createLightingState();
  private idleTime = 0;
  private host: HTMLElement;
  private callbacks: Callbacks;
  constructor(host: HTMLElement, state: ExperienceState, callbacks: Callbacks) {
    this.host = host;
    this.callbacks = callbacks;
    this.state = { ...state };
    this.painting = getPainting(state.painting);
    this.route = new THREE.CatmullRomCurve3(this.painting.route.map(vector));
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.info.autoReset = false;
    // Three r186 removed PCFSoft; its first shadow pass would silently switch the
    // type and invalidate every precompiled program. Use the actual supported type.
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.domElement.setAttribute('aria-label', '可交互三维画境');
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.tabIndex = 0;
    host.appendChild(this.renderer.domElement);
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'wheel'] as const)
      this.renderer.domElement.addEventListener(
        type,
        (event) => orientCanvasEvent(this.renderer.domElement, event),
        {
          capture: true,
          signal: this.abort.signal,
        },
      );
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 300;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    this.controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    this.renderer.domElement.style.touchAction = 'none';
    this.controls.enabled = false;
    this.scene.add(this.sun, this.sun.target, this.ambient, this.content);
    this.sun.position.set(-80, 140, 60);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, {
      left: -160,
      right: 160,
      top: 130,
      bottom: -130,
      near: 1,
      far: 400,
    });
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.22;
    this.loadPainting();
    this.setQuality(false);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.bindEvents();
    this.ready = this.prepareInitialScene();
    this.frame = requestAnimationFrame(this.tick);
  }
  private async prepareInitialScene(): Promise<void> {
    if (this.painting.id !== 'sakura') return;
    const version = this.sceneRequest;
    this.sceneBuilding = true;
    try {
      this.updateCamera(10); this.updateAtmosphere(10);
      await compileSakuraPrograms(this.renderer, this.scene, this.scene, this.camera);
    } finally {
      if (!this.disposed && version === this.sceneRequest) this.sceneBuilding = false;
    }
  }
  private loadPainting(): void {
    for (const _ of this.loadPaintingSteps()) void _;
  }
  private captureScene(): SceneBundle {
    return {
      retainedBytes: estimateSceneBytes(this.content),
      content: this.content,
      river: this.river,
      sky: this.sky,
      halos: this.halos,
      mist: this.mist,
      empire: this.empire,
      wuhan: this.wuhan,
      vegetation: this.vegetation,
      livingActors: this.livingActors,
      lakeBirds: this.lakeBirds,
      waterfall: this.waterfall,
      boats: this.boats,
      birds: this.birds,
      scenePeriod: this.scenePeriod,
      featured: this.featured,
    };
  }
  private disposeScene(bundle: SceneBundle): void {
    bundle.livingActors?.dispose();
    bundle.vegetation?.dispose();
    bundle.river?.dispose();
    disposeObject(bundle.content);
  }
  private *loadPaintingSteps(): Generator<void> {
    this.clearInput();
    this.releasePointerLock();
    this.walkInitialized = false;
    this.scrollMagnification = 1;
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.content.removeFromParent();
    if (this.sceneReady) {
      const oldKey = `${this.painting.id}:${this.sceneQuality}`;
      const duplicate = this.sceneCache.get(oldKey);
      if (duplicate) this.disposeScene(duplicate);
      this.sceneCache.set(oldKey, this.captureScene());
    } else this.disposeScene(this.captureScene());
    this.sceneReady = false;
    this.painting = getPainting(this.state.painting);
    this.sceneQuality = this.state.quality;
    const key = `${this.painting.id}:${this.sceneQuality}`;
    const cached = this.sceneCache.get(key);
    this.sceneCache.delete(key);
    while (
      this.sceneCache.size > 2 ||
      [...this.sceneCache.values()].reduce((sum, bundle) => sum + bundle.retainedBytes, 0) >
        96 * 1024 * 1024
    ) {
      const oldest = this.sceneCache.keys().next().value!;
      this.disposeScene(this.sceneCache.get(oldest)!);
      this.sceneCache.delete(oldest);
    }
    if (cached) {
      Object.assign(this, cached);
      this.scene.add(this.content);
      this.route = new THREE.CatmullRomCurve3(this.painting.route.map(vector));
      this.progress = 0;
      if (this.painting.id === 'empire' && this.scenePeriod !== this.state.period)
        this.setPeriod(this.state.period);
      this.resetSceneView();
      this.sceneReady = true;
      return;
    }
    this.content = new THREE.Group();
    this.scene.add(this.content);
    this.river = null;
    this.vegetation = null;
    this.livingActors = null;
    this.boats = [];
    this.mist = new THREE.Group();
    this.sky = null;
    this.halos = null;
    this.empire = null;
    this.wuhan = null;
    this.lakeBirds = null;
    this.waterfall = null;
    this.featured = null;
    this.painting = getPainting(this.state.painting);
    this.route = new THREE.CatmullRomCurve3(this.painting.route.map(vector));
    this.progress = 0;
    // The seabed owns both its relief and material. A generic plane at -0.27
    // cuts through its troughs and exposes a hard rectangular patch underwater.
    if (!['deepsea', 'roadster'].includes(this.painting.id)) {
      const terrain = yield* buildTerrainSteps(this.painting);
      if (this.painting.id === 'winter') refineWinterTerrain(terrain.group);
      this.content.add(terrain.group);
    }
    const featured = isFeaturedWorld(this.painting);
    if (featured) {
      const world = buildFeaturedWorld(this.painting);
      this.content.add(world);
      this.featured = featuredUpdate(world);
      world.userData.prepareAssets?.(this.renderer, this.scene, this.camera);world.userData.setQuality?.(this.state.quality);
    }
    const custom = ['qingming', 'zhangjiajie', 'guilin', 'wuhan'].includes(this.painting.id) || featured;
    yield;
    const village = custom ? new THREE.Group() : buildVillage(this.painting);
    this.content.add(village);
    yield;
    this.halos = createWindowHalos(village);
    village.removeFromParent();
    this.content.add(batchStatic(village), this.halos);
    yield;
    if (!custom) this.content.add(buildForest(this.painting));
    yield;
    if (!featured) this.content.add(buildNearDetails(this.painting));
    yield;
    if (this.painting.id === 'winter') this.content.add(buildWinterDetails(this.painting));
    yield;
    if (this.painting.id === 'starry') this.content.add(buildStarryDetails(this.painting));
    yield;
    if (this.painting.id === 'qingming') {
      const city = yield* buildQingmingSteps(this.painting);
      this.content.add(city);
      this.featured = featuredUpdate(city);
    }
    if (this.painting.id === 'zhangjiajie' || this.painting.id === 'guilin')
      this.content.add(buildLandscapeDetails(this.painting));
    yield;
    if (this.painting.id === 'wuhan') {
      this.wuhan = buildWuhan(this.painting, this.state.quality);
      this.content.add(this.wuhan);
      this.lakeBirds = buildLakeBirds();
      this.content.add(this.lakeBirds.mesh);
    }
    if (this.painting.id !== 'roadster') this.content.add(
      buildEasterEgg(
        this.painting,
        this.painting.id === 'wuhan'
          ? {
              x: 18,
              z: wuhanPath(18) - 0.5,
              y: getWuhanGround(18, wuhanPath(18) - 0.5) + 0.05,
              yaw: 0,
            }
          : undefined,
      ),
    );
    yield;
    this.rebuildRiver();
    if (this.painting.id === 'starry' || this.painting.id === 'winter') {
      this.sky = this.painting.id === 'starry' ? createPainterlyStarrySky() : createWinterSky();
      this.content.add(this.sky);
    } else {
      this.sky = createLandscapeSky(this.painting);
      this.content.add(this.sky);
    }
    yield;
    if (this.painting.id === 'empire') {
      this.scenePeriod = this.state.period;
      this.empire = this.createEmpire(this.state.period);
      this.content.add(this.empire);
    }
    // Xishan is a mountain stream composition, not a navigable river village.
    if (!custom && !['starry', 'winter', 'xishan'].includes(this.painting.id)) {
      for (let i = 0; i < 5; i++) {
        const b = batchStatic(boat(this.painting.id === 'empire' ? 'classical' : 'river'));
        b.scale.setScalar(0.6 + i * 0.04);
        const point = this.route.getPointAt((i + 0.4) / 6);
        b.position.copy(point);
        if (this.painting.id === 'empire') {
          const berths = [
            [27, -20],
            [29, -40],
            [34, -69],
            [-30, 20],
            [0, 14],
          ] as const;
          b.position.set(berths[i]![0], 0.4, berths[i]![1]);
        }
        b.position.y = 0.4;
        b.rotation.y = -0.3 + i * 0.6;
        if (this.painting.id === 'empire' && i < 3) b.rotation.y = Math.PI * 0.5;
        this.boats.push(b);
        if (this.painting.id === 'empire') b.visible = this.state.period === 2;
        this.content.add(b);
      }
      if (this.painting.id !== 'empire') this.content.add(batchStatic(bridge(this.painting, 1, 7)));
    }
    for (let i = 0; i < 10; i++) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(155 + (i % 3) * 35, 14 + (i % 4) * 7),
        mistMaterial(),
      );
      mesh.position.set(((i % 3) - 1) * 60, 4 + i * 3.6, 5 - i * 16);
      this.mist.add(mesh);
    }
    this.content.add(this.mist);
    const birdPositions: number[] = [];
    const random = seededRandom(23);
    for (let i = 0; i < 20; i++) {
      const x = random() * 180 - 90,
        y = 22 + random() * 30,
        z = -20 - random() * 60;
      birdPositions.push(x - 0.65, y + 0.2, z, x, y, z, x, y, z, x + 0.65, y + 0.2, z);
    }
    const birdGeometry = new THREE.BufferGeometry();
    birdGeometry.setAttribute('position', new THREE.Float32BufferAttribute(birdPositions, 3));
    this.birds = new THREE.LineSegments(
      birdGeometry,
      new THREE.LineBasicMaterial({
        color: this.painting.id === 'starry' ? '#a0aac2' : '#576654',
        transparent: true,
        opacity: 0.55,
      }),
    );
    this.content.add(this.birds);
    this.birds.visible = !['winter', 'starry', 'wuhan', 'arctic', 'dunhuang', 'deepsea', 'roadster'].includes(
      this.painting.id,
    );
    if (this.painting.id === 'xishan') this.addWaterfall();
    this.content.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    yield;
    this.vegetation = attachVegetationMotion(this.content);
    this.livingActors = buildLivingActors(this.painting, this.content);
    this.resetSceneView();
    this.sceneReady = true;
  }
  private resetSceneView(): void {
    this.renderer.shadowMap.needsUpdate = true;
    this.currentEye.copy(vector(this.painting.overview.eye));
    this.currentTarget.copy(vector(this.painting.overview.target));
    this.camera.position.copy(this.currentEye);
    this.camera.lookAt(this.currentTarget);
    this.controls.target.copy(this.currentTarget);
    this.scene.background = new THREE.Color(this.painting.palette.sky);
    this.scene.fog = new THREE.Fog(this.painting.palette.sky, 100, 340);
    this.night = resolveSceneNight(this.painting.id, this.state.time, this.progress);
    this.idleTime = 0;
  }
  private addWaterfall(): void {
    this.waterfall = createWaterfall(this.painting);
    this.content.add(this.waterfall);
  }
  /** Yield between model groups; rapid selections supersede unfinished geometry. */
  suspendForSceneSwitch(): void {
    this.sceneBuilding = true;
    this.clearInput();
  }
  async configureAsync(next: ExperienceState): Promise<void> {
    this.pendingScene = { ...next };
    this.sceneRequest++;
    if (!this.sceneTask) {
      this.sceneTask = this.drainSceneChanges().finally(() => {
        this.sceneTask = null;
      });
    }
    return this.sceneTask;
  }
  private async drainSceneChanges(): Promise<void> {
    this.sceneBuilding = true;
    try {
      while (this.pendingScene && !this.disposed) {
        const next = this.pendingScene;
        const version = this.sceneRequest;
        this.pendingScene = null;
        const previous = this.state;
        this.state = { ...next };
        let complete = true;
        let sliceStart = performance.now();
        for (const _ of this.loadPaintingSteps()) {
          void _;
          if (performance.now() - sliceStart >= 8) {
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
            sliceStart = performance.now();
          }
          if (this.disposed || version !== this.sceneRequest) {
            complete = false;
            break;
          }
        }
        if (!complete) continue;
        if (this.painting.id === 'sakura') await compileSakuraPrograms(this.renderer, this.scene, this.scene, this.camera);
        else await this.renderer.compileAsync(this.scene, this.camera);
        if (this.disposed || version !== this.sceneRequest) continue;
        // Geometry is ready. Reuse the normal transition path for input, quality and mode.
        this.state = { ...previous, painting: next.painting };
        this.configure(next);
        this.renderer.shadowMap.needsUpdate = true;
        // Keep the preview until the selected world has produced its first real frame.
        this.updateCamera(10);
        this.updateAtmosphere(10);
        this.renderer.info.reset();
        this.renderer.render(this.scene, this.camera);
      }
    } finally {
      this.sceneBuilding = false;
      this.lastTime = 0;
    }
  }
  configure(next: ExperienceState): void {
    const previous = this.state;
    this.state = { ...next };
    if (next.painting !== previous.painting) this.loadPainting();
    if (Math.abs(next.progress - this.progress) > 0.003) this.progress = clamp(next.progress);
    if (next.quality !== previous.quality) {
      this.sceneQuality = next.quality;
      this.setQuality(next.painting === previous.painting);
      if (this.wuhan && next.painting === previous.painting) {
        this.vegetation?.dispose();
        this.wuhan.removeFromParent();
        disposeObject(this.wuhan);
        this.wuhan = buildWuhan(this.painting, next.quality);
        this.content.add(this.wuhan);
        this.vegetation = attachVegetationMotion(this.content);
      }
    }
    if (next.period !== previous.period && next.painting === 'empire') this.setPeriod(next.period);
    if (next.mode !== previous.mode || next.entered !== previous.entered) {
      this.clearInput();
      if (next.mode !== 'walk' || !next.entered) this.releasePointerLock();
      this.resize();
      this.controls.enabled = next.entered && next.mode === 'orbit';
      if (next.mode === 'orbit') {
        // Flush old orbit inertia without inheriting an earlier visit's camera.
        const eye = this.currentEye.clone(),
          target = this.currentTarget.clone();
        this.controls.enableDamping = false;
        this.controls.update();
        this.camera.position.copy(eye);
        this.controls.target.copy(target);
        this.controls.update();
        this.controls.enableDamping = true;
      }
      if (next.mode === 'walk' && !this.walkInitialized) this.resetWalk();
    }
    this.mist.visible = next.mist && next.quality !== 'low';
  }
  private setPeriod(period: number): void {
    this.scenePeriod = period;
    if (this.empire) {
      this.content.remove(this.empire);
      disposeObject(this.empire);
    }
    this.empire = this.createEmpire(period);
    this.content.add(this.empire);
    for (const boat of this.boats) boat.visible = period === 2;
    this.renderer.shadowMap.needsUpdate = true;
  }
  private createEmpire(period: number): THREE.Group {
    const group = new THREE.Group();
    group.add(batchStatic(buildEmpire(period)), buildEmpireDetails(this.painting, period));
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    return group;
  }
  setRoadsterMusicClock(clock: () => number | undefined): void { this.roadsterMusicClock = clock; }
  setRoadsterInput(input:Partial<import('./roadsterMotion').RoadsterDriveInput>):void {if(this.painting.id==='roadster'){this.state.playing=false;for(const world of this.content.children)world.userData.setDriveInput?.(input);this.emitStats();}}
  getRoadsterChallenge():string {for(const world of this.content.children){const s=world.userData.getChallenge?.();if(s)return `${s.complete?'完成':'检查点'} ${s.passed}/${s.total} · ${s.time.toFixed(1)}s${s.best!==null?` · 最快 ${s.best.toFixed(1)}s`:''}`;}return '检查点 0/5 · 0.0s';}
  getRoadsterSpeed():number {return this.content.children.reduce((speed,world)=>speed+Math.abs(world.userData.getDriveState?.().speed??0),0)*3.6;}
  private roadsterDriveState():import('./roadsterMotion').RoadsterMotionSample|undefined {for(const world of this.content.children){const s=world.userData.getDriveState?.();if(s?.manual)return s;}return undefined;}
  triggerRoadster(action:'boost'|'grip'|'dance'|'reset'):void {if(this.painting.id==='roadster')for(const world of this.content.children){if(action==='boost')world.userData.triggerBoost?.();else if(action==='dance')world.userData.triggerDance?.();else if(action==='reset')world.userData.resetVehicle?.();else world.userData.triggerGrip?.();}}
  private roadsterLift():number {return this.content.children.reduce((lift,world)=>lift+(world.userData.getVehicleLift?.()??0),0);}
  setRoadsterPaint(hex: string): void {
    if (this.painting.id === 'roadster') for (const world of this.content.children) world.userData.setPaint?.(hex);
  }
  private resetWalk(): void {
    this.walkInitialized = true;
    const p = this.painting;
    if(p.id==='roadster'){this.yaw=0;this.pitch=0;const v=sampleRoadsterCockpit(this.progress,this.elapsed);this.currentEye.set(...v.eye);this.currentTarget.set(...v.target);return;}
    if (p.id === 'sakura') {
      this.yaw = 0;
      this.pitch = 0;
      const view = sampleSakuraPassengerView(this.progress, this.elapsed);
      this.currentEye.copy(vector(view.eye));
      this.currentTarget.copy(vector(view.target));
      return;
    }
    const { x, z, yaw, pitch } = getWalkStart(p.id);
    this.walkingPosition.set(x, Math.max(0.3, groundHeight(p, x, z)) + 1.8, z);
    this.currentEye.copy(this.walkingPosition);
    this.yaw = yaw;
    this.pitch = pitch;
  }
  private rebuildRiver(): void {
    this.river?.dispose();
    this.river = null;
    // Dunhuang, Huangshan and Deepsea have no open water surface at eye level;
    // a mirrored plane would read as an unrelated lake.
    if (
      this.painting.id === 'starry' ||
      this.painting.id === 'winter' ||
      this.painting.id === 'dunhuang' ||
      this.painting.id === 'huangshan' ||
      this.painting.id === 'deepsea' || this.painting.id === 'roadster'
    )
      return;
    this.river = buildRiver(this.painting, this.state.quality);
    this.content.add(this.river.mesh);
  }
  private setQuality(rebuildWater = true): void {
    if (rebuildWater) this.rebuildRiver();
    for(const world of this.content.children)world.userData.setQuality?.(this.state.quality);
    const cap =
      this.state.quality === 'high' ? 1.75 : this.state.quality === 'balanced' ? 1.25 : 0.8;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    this.renderer.shadowMap.enabled =
      this.state.quality === 'high' ||
      (this.painting.id === 'qingming' && this.state.quality === 'balanced');
    const shadowSize = this.state.quality === 'high' ? 2048 : 1024;
    if (this.sun.shadow.mapSize.x !== shadowSize) {
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
      this.sun.shadow.mapSize.set(shadowSize, shadowSize);
    }
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.setSize(this.host.clientWidth, this.host.clientHeight, false);
  }
  private resize(): void {
    if (this.offline) return;
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.fov =
      this.state.entered && this.state.mode === 'walk' ? walkFieldOfView(w, h) : w < h ? 52 : 39;
    this.camera.zoom =
      this.state.entered && this.state.mode === 'scroll' && !this.filmActive
        ? this.scrollMagnification
        : 1;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }
  private bindEvents(): void {
    const canvas = this.renderer.domElement,
      options = { signal: this.abort.signal };
    // Picking tracks its own gesture so it also works while OrbitControls owns navigation.
    canvas.addEventListener(
      'pointerdown',
      (event) => {
        if (!this.state.entered || this.filmActive || event.button !== 0) return;
        if (this.pickPointers.size === 0) {
          this.pickBlocked = false;
          this.suppressPointerLockClick = false;
          this.pointerTravel = 0;
        } else this.pickBlocked = true;
        this.pickPointers.set(event.pointerId, { x: event.clientX, y: event.clientY, travel: 0 });
      },
      options,
    );
    canvas.addEventListener(
      'pointermove',
      (event) => {
        const pointer = this.pickPointers.get(event.pointerId);
        if (!pointer) return;
        pointer.travel +=
          document.pointerLockElement === canvas
            ? Math.hypot(event.movementX, event.movementY)
            : Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y);
        pointer.x = event.clientX;
        pointer.y = event.clientY;
      },
      options,
    );
    canvas.addEventListener(
      'pointerup',
      (event) => {
        const pointer = this.pickPointers.get(event.pointerId);
        if (
          pointer &&
          event.button === 0 &&
          !this.pickBlocked &&
          this.pickPointers.size === 1 &&
          pointer.travel <= 6 &&
          this.pointerTravel <= 6 &&
          this.pickEncounter(event.clientX, event.clientY)
        ) {
          this.suppressPointerLockClick = true;
        }
        this.pickPointers.delete(event.pointerId);
      },
      options,
    );
    const cancelPick = (event: PointerEvent) => this.pickPointers.delete(event.pointerId);
    canvas.addEventListener('pointercancel', cancelPick, options);
    canvas.addEventListener('lostpointercapture', cancelPick, options);
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (this.state.mode === 'scroll' && this.state.entered && !this.filmActive) {
          e.preventDefault();
          const delta = wheelPixels(e, this.host.clientHeight);
          if (e.ctrlKey) this.adjustScrollZoom(Math.exp(-clamp(delta.dominant, -500, 500) * 0.002));
          else {
            this.state.playing = false;
            this.progress = clamp(this.progress + clamp(delta.dominant, -1000, 1000) * 0.00035);
          }
          this.emitStats();
        }
      },
      { ...options, passive: false },
    );
    canvas.addEventListener(
      'pointerdown',
      (e) => {
        if (this.state.mode === 'orbit' || this.filmActive || !this.state.entered) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (this.state.mode === 'walk') {
          // The left half belongs to the joystick; one right-hand pointer owns look.
          if (
            this.painting.id !== 'sakura' &&
            e.pointerType === 'touch' &&
            e.clientX < canvas.getBoundingClientRect().left + canvas.clientWidth / 2
          )
            return;
          if (this.walkPointer !== null) return;
          this.walkPointer = e.pointerId;
        }
        canvas.focus({ preventScroll: true });
        if (this.pointers.size >= 2) return;
        this.pointerTravel = 0;
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (document.pointerLockElement !== canvas) canvas.setPointerCapture(e.pointerId);
      },
      options,
    );
    canvas.addEventListener(
      'pointermove',
      (e) => {
        if (this.filmActive || document.pointerLockElement === canvas) return;
        const pointer = this.pointers.get(e.pointerId);
        if (!pointer) return;
        const distance = pointerDistance(this.pointers.values());
        const dx = e.clientX - pointer.x,
          dy = e.clientY - pointer.y;
        this.pointerTravel += Math.hypot(dx, dy);
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.state.mode === 'walk') {
          if (e.pointerId === this.walkPointer) this.look(dx, dy);
        } else if (this.state.mode === 'scroll' && this.state.entered) {
          if (this.pointers.size === 2) {
            const nextDistance = pointerDistance(this.pointers.values());
            if (distance > 1 && nextDistance > 1) this.adjustScrollZoom(nextDistance / distance);
          } else this.progress = clamp(this.progress - dx * 0.001);
          this.state.playing = false;
          this.emitStats();
        }
      },
      options,
    );
    const release = (event: PointerEvent) => {
      this.pointers.delete(event.pointerId);
      if (this.walkPointer === event.pointerId) this.walkPointer = null;
    };
    canvas.addEventListener('pointerup', release, options);
    canvas.addEventListener('pointercancel', release, options);
    canvas.addEventListener('lostpointercapture', release, options);
    canvas.addEventListener(
      'click',
      (event) => {
        if (this.suppressPointerLockClick) {
          this.suppressPointerLockClick = false;
          return;
        }
        if (
          this.state.mode !== 'walk' ||
          !this.state.entered ||
          this.filmActive ||
          (event instanceof PointerEvent && event.pointerType !== 'mouse') ||
          this.pointerTravel > 5 ||
          !canvas.requestPointerLock ||
          document.pointerLockElement === canvas
        )
          return;
        try {
          // Unsupported or denied pointer lock falls back to drag-to-look.
          const request = canvas.requestPointerLock();
          if (request) void request.catch(() => {});
        } catch {
          /* Drag-to-look remains available. */
        }
      },
      options,
    );
    document.addEventListener(
      'mousemove',
      (event) => {
        if (
          document.pointerLockElement === canvas &&
          this.state.mode === 'walk' &&
          !this.filmActive
        )
          this.look(event.movementX, event.movementY);
      },
      options,
    );
    document.addEventListener(
      'pointerlockchange',
      () => {
        this.clearInput();
      },
      options,
    );
    window.addEventListener(
      'keydown',
      (e) => {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLSelectElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          document.querySelector('dialog[open]') ||
          this.filmActive
        )
          return;
        if (e.code === 'Escape') {
          this.releasePointerLock();
          this.clearInput();
          return;
        }
        if (
          this.state.entered &&
          this.state.mode === 'scroll' &&
          ['Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract'].includes(e.code)
        ) {
          e.preventDefault();
          this.adjustScrollZoom(['Minus', 'NumpadSubtract'].includes(e.code) ? 1 / 1.12 : 1.12);
          return;
        }
        if (
          [
            'KeyW',
            'KeyA',
            'KeyS',
            'KeyD',
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'ShiftLeft',
            'ShiftRight',
          ].includes(e.code) &&
          this.state.entered
        ) {
          e.preventDefault();
          this.keys.add(e.code);
          if(this.painting.id==='roadster'){this.state.playing=false;this.emitStats();}
          if (this.state.mode === 'scroll' && ['ArrowLeft', 'ArrowRight'].includes(e.code)) {
            this.state.playing = false;
            this.emitStats();
          }
        }
      },
      options,
    );
    window.addEventListener('keyup', (e) => this.keys.delete(e.code), options);
    window.addEventListener(
      'blur',
      () => {
        this.clearInput();
        this.releasePointerLock();
      },
      options,
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        this.lastTime = 0;
        this.clearInput();
        if (document.hidden) this.releasePointerLock();
      },
      options,
    );
    canvas.addEventListener(
      'webglcontextlost',
      (e) => {
        e.preventDefault();
        this.callbacks.onError('图形上下文已中断，请刷新页面重新进入。');
        cancelAnimationFrame(this.frame);
      },
      options,
    );
  }
  private look(dx: number, dy: number): void {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    if (this.painting.id === 'sakura') {
      this.yaw = clamp(this.yaw + dx * 0.004, -Math.PI * 0.85, Math.PI * 0.85);
      this.pitch = clamp(this.pitch - dy * 0.003, -0.65, 0.65);
    } else {
      this.yaw -= dx * 0.004;
      this.pitch = clamp(this.pitch - dy * 0.003, -1.35, 1.35);
    }
  }
  private pickEncounter(clientX: number, clientY: number): boolean {
    if (!this.state.entered || this.filmActive || !this.callbacks.onEncounter) return false;
    const canvas = this.renderer.domElement;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return false;
    const point =
      document.pointerLockElement === canvas
        ? new THREE.Vector2(0, 0)
        : new THREE.Vector2(
            ((clientX - bounds.left) / canvas.clientWidth) * 2 - 1,
            1 - ((clientY - bounds.top) / canvas.clientHeight) * 2,
          );
    this.camera.updateMatrixWorld();
    this.encounterRay.setFromCamera(point, this.camera);
    const encounter = pickCharacter(this.content, this.encounterRay);
    if (!encounter) return false;
    if (encounter.id) {
      encounter.object.userData.onEncounter?.();
      for (const world of this.content.children) world.userData.onCharacterClick?.(encounter.id);
      this.callbacks.onEncounter(encounter.id);
      return true;
    }
    this.state.playing = false;
    this.emitStats();
    this.clearInput();
    this.releasePointerLock();
    this.callbacks.onEncounter();
    return true;
  }
  private adjustScrollZoom(factor: number): void {
    this.scrollMagnification = scrollZoom(this.scrollMagnification, factor);
    this.camera.zoom = this.scrollMagnification;
    this.camera.updateProjectionMatrix();
  }
  private releasePointerLock(): void {
    if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock();
  }
  private clearInput(): void {
    this.keys.clear();
    for(const world of this.content.children)world.userData.clearDriveInput?.();
    this.stick = { x: 0, y: 0 };
    for (const id of this.pointers.keys()) {
      if (this.renderer.domElement.hasPointerCapture(id))
        this.renderer.domElement.releasePointerCapture(id);
    }
    this.pointers.clear();
    this.pickPointers.clear();
    this.walkPointer = null;
  }
  /** Analogue movement: x is right, y is forward; releasing the stick sends (0, 0). */
  setWalkInput(x: number, y: number): void {
    this.stick = walkInput(x, y);
  }
  setMovement(key: string, pressed: boolean): void {
    if (pressed) this.keys.add(key);
    else this.keys.delete(key);
  }
  private walk(dt: number): void {
    let forward =
      Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) -
      Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) +
      this.stick.y;
    let side =
      Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) -
      Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft')) +
      this.stick.x;
    const magnitude = Math.hypot(forward, side);
    if (magnitude > 1) {
      forward /= magnitude;
      side /= magnitude;
    }
    const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 11 : 5;
    const x =
      this.walkingPosition.x +
      (-Math.sin(this.yaw) * forward + Math.cos(this.yaw) * side) * dt * speed;
    const z =
      this.walkingPosition.z +
      (-Math.cos(this.yaw) * forward - Math.sin(this.yaw) * side) * dt * speed;
    const ground =
        this.painting.id === 'wuhan' ? wuhanWalkHeight(x, z) : groundHeight(this.painting, x, z),
      old =
        this.painting.id === 'wuhan'
          ? wuhanWalkHeight(this.walkingPosition.x, this.walkingPosition.z)
          : groundHeight(this.painting, this.walkingPosition.x, this.walkingPosition.z);
    // Waterless featured worlds walk their full relief; lake scenes stay ashore.
    const wadeable =
      this.painting.id === 'arctic' ||
      this.painting.id === 'dunhuang' ||
      this.painting.id === 'huangshan' ||
      this.painting.id === 'deepsea';
    if (
      (wadeable || ground > 0.15) &&
      Math.abs(ground - old) < 1.4 &&
      Math.abs(x) < 135 &&
      z > -110 &&
      z < 75
    ) {
      this.walkingPosition.set(x, ground + 1.8, z);
    }
    this.currentEye.lerp(this.walkingPosition, 1 - Math.exp(-dt * 5));
    const look = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    this.currentTarget.copy(this.currentEye).add(look.multiplyScalar(20));
  }
  private updateCamera(dt: number): void {
    if(this.painting.id==='roadster') for(const world of this.content.children) {world.userData.setVoyageProgress?.(this.progress);world.userData.setCockpitView?.(this.state.entered && this.state.mode==='walk' && !this.filmActive);}
    if (this.painting.id === 'sakura') {
      const voyage = sampleSakuraVoyage(this.progress, this.elapsed);
      this.river?.setSakuraHull(voyage.boatPosition, voyage.boatRotation);
      for (const world of this.content.children) {
        world.userData.setVoyageProgress?.(this.progress);
        world.userData.setPassengerView?.(this.state.entered && this.state.mode === 'walk' && !this.filmActive);
      }
    }
    if (this.state.mode === 'orbit' && this.state.entered && !this.filmActive) {
      this.controls.update();
      this.currentEye.copy(this.camera.position);
      this.currentTarget.copy(this.controls.target);
      return;
    }
    if (this.state.mode === 'walk' && this.state.entered && !this.filmActive) {
      if (this.painting.id === 'sakura') {
        const view = sampleSakuraPassengerView(this.progress, this.elapsed, this.yaw, this.pitch);
        // Seat coordinates stay rigidly attached to the moving vessel, including while paused.
        this.currentEye.copy(vector(view.eye));
        this.currentTarget.copy(vector(view.target));
      } else if (this.painting.id === 'roadster') {const d=this.roadsterDriveState();const view=d?{eye:d.cockpitEye,target:[d.cockpitEye[0]-Math.sin(d.rotation[1]+this.yaw)*12*Math.cos(this.pitch),d.cockpitEye[1]+Math.sin(this.pitch)*12,d.cockpitEye[2]-Math.cos(d.rotation[1]+this.yaw)*12*Math.cos(this.pitch)] as [number,number,number]}:sampleRoadsterCockpit(this.progress,this.elapsed,this.yaw,this.pitch);this.currentEye.set(...view.eye);this.currentTarget.set(...view.target);const lift=this.roadsterLift();this.currentEye.y+=lift;this.currentTarget.y+=lift;} else this.walk(dt);
    } else {
      const overviewEye = vector(this.painting.overview.eye),
        overviewTarget = vector(this.painting.overview.target);
      let eye = overviewEye,
        target = overviewTarget;
      if (this.state.entered) {
        const shot = this.painting.id === 'roadster' ? (this.roadsterDriveState()??sampleRoadsterMotion(this.progress,this.elapsed)) : this.painting.id === 'sakura'
          ? sampleSakuraVoyage(this.progress, this.elapsed)
          : getCinematicView(this.painting, this.progress, this.host.clientWidth < this.host.clientHeight);
        eye = vector(shot.eye);
        target = vector(shot.target);
        if(this.painting.id==='roadster'){eye.y+=this.roadsterLift()*.6;target.y+=this.roadsterLift();}
      } else {
        eye.x += Math.sin(this.idleTime * 0.07) * 2;
        eye.z += Math.cos(this.idleTime * 0.07) * 2;
      }
      if(this.painting.id==='roadster'&&this.host.clientWidth<this.host.clientHeight)eye=target.clone().add(eye.clone().sub(target).multiplyScalar(1.4));
      const amount = 1 - Math.exp(-dt * 2.4);
      this.currentEye.lerp(eye, amount);
      this.currentTarget.lerp(target, amount);
    }
    this.camera.position.copy(this.currentEye);
    this.camera.lookAt(this.currentTarget);
  }
  private updateAtmosphere(dt: number): void {
    const desired = resolveSceneNight(this.painting.id, this.state.time, this.progress);
    this.night += (desired - this.night) * (1 - Math.exp(-dt * 5));
    const light = sampleSceneLighting(
      this.painting,
      this.night,
      this.state.mist,
      this.state.period,
      this.lighting,
    );
    (this.scene.background as THREE.Color).copy(light.background);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(light.fogColor);
      this.scene.fog.near = light.fogNear;
      this.scene.fog.far = light.fogFar;
    }
    this.sun.intensity = light.sunIntensity;
    if (this.painting.id === 'sakura') {
      this.sun.position.set(...SAKURA_SUN_DIRECTION).multiplyScalar(180);
      this.sun.target.position.set(0, 0, 0);
      Object.assign(this.sun.shadow.camera, { left: -160, right: 160, top: 130, bottom: -130 });
      this.sun.shadow.camera.updateProjectionMatrix();
      this.sun.shadow.normalBias = 0.22;
      this.sun.shadow.bias = -0.0004;
    } else if (this.painting.id === 'qingming') {
      const fit = fitQingmingShadow(this.currentEye, this.currentTarget, this.sun.shadow.mapSize.x);
      this.sun.position.copy(fit.position);
      this.sun.target.position.copy(fit.target);
      Object.assign(this.sun.shadow.camera, {
        left: -fit.extent,
        right: fit.extent,
        top: fit.extent,
        bottom: -fit.extent,
      });
      this.sun.shadow.camera.updateProjectionMatrix();
      this.sun.shadow.normalBias = fit.normalBias;
      this.sun.shadow.bias = fit.bias;
    } else {
      this.sun.position.set(-80, 140, 60);
      this.sun.target.position.set(0, 0, 0);
      Object.assign(this.sun.shadow.camera, { left: -160, right: 160, top: 130, bottom: -130 });
      this.sun.shadow.camera.updateProjectionMatrix();
      this.sun.shadow.normalBias = 0.22;
      this.sun.shadow.bias = -0.0004;
    }
    this.sun.color.copy(light.sunColor);
    this.ambient.intensity = light.ambientIntensity;
    this.ambient.color.copy(light.ambientColor);
    this.ambient.groundColor.copy(light.groundColor);
    this.river?.update(this.elapsed, this.night);
    if (this.waterfall) updateWaterfall(this.waterfall, this.elapsed, this.night);
    if (this.wuhan) updateWuhan(this.wuhan, this.elapsed, this.night);
    if (this.sky) {
      const uniforms = (this.sky.material as THREE.ShaderMaterial).uniforms;
      if (uniforms.uTime) uniforms.uTime.value = this.elapsed;
      if (uniforms.uNight) uniforms.uNight.value = this.night;
    }
    if (this.halos)
      (this.halos.material as THREE.ShaderMaterial).uniforms.uNight!.value = this.night;
    this.mist.children.forEach((child) => {
      const m = (child as THREE.Mesh).material as THREE.ShaderMaterial;
      m.uniforms.uTime!.value = this.elapsed;
      m.uniforms.uColor!.value.copy(light.mistColor);
      m.uniforms.uOpacity!.value = light.mistOpacity;
    });
  }
  private tick = (time: number): void => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.tick);
    if (this.sceneBuilding) {
      this.lastTime = 0;
      return;
    }
    if (document.hidden && !this.filmActive) {
      this.lastTime = 0;
      return;
    }
    const wallDelta = this.lastTime ? Math.max(0, (time - this.lastTime) / 1000) : 0.016;
    const dt = Math.min(wallDelta, 0.1);
    this.lastTime = time;
    this.elapsed += dt;
    this.vegetation?.update(this.elapsed);
    this.livingActors?.update(this.elapsed);
    this.lakeBirds?.update(this.elapsed);
    this.idleTime += dt;
    if(this.painting.id==='roadster' && this.state.entered){const input={throttle:Number(this.keys.has('KeyW')||this.keys.has('ArrowUp'))-Number(this.keys.has('KeyS')),steer:Number(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-Number(this.keys.has('KeyA')||this.keys.has('ArrowLeft')),brake:Number(this.keys.has('ArrowDown')||this.keys.has('ShiftLeft')||this.keys.has('ShiftRight'))};for(const world of this.content.children)world.userData.setKeyboardInput?.(input);}
    if (
      this.state.playing &&
      this.state.entered &&
      !this.filmActive &&
      (this.state.mode === 'scroll' || (['sakura', 'roadster'].includes(this.painting.id) && this.state.mode === 'walk'))
    )
      this.progress = clamp(this.progress + (dt * this.state.speed) / (this.painting.id === 'roadster' ? 75 : 150));
    if (this.painting.id!=='roadster' && this.state.mode === 'scroll' && this.state.entered && !this.filmActive) {
      const direction = Number(this.keys.has('ArrowRight')) - Number(this.keys.has('ArrowLeft'));
      const boost = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 4 : 1;
      this.progress = clamp(this.progress + direction * dt * 0.075 * boost);
    }
    this.updateCamera(dt);
    this.updateAtmosphere(dt);
    if (this.painting.id === 'roadster') for (const world of this.content.children) world.userData.danceTime = this.roadsterMusicClock?.();
    this.featured?.(this.elapsed, this.night);
    const shadowHz = this.painting.id === 'qingming' && this.host.clientWidth < 768 ? 12 : 20;
    if (['qingming', 'arctic', 'sakura', 'roadster'].includes(this.painting.id) &&
        Math.floor(this.elapsed * shadowHz) !== Math.floor((this.elapsed - dt) * shadowHz))
      this.renderer.shadowMap.needsUpdate = true;
    this.boats.forEach((b, i) => {
      b.position.y = 0.4 + Math.sin(this.elapsed * 0.8 + i) * 0.065;
      b.rotation.z = Math.sin(this.elapsed * 0.6 + i) * 0.013;
    });
    if (this.birds) {
      this.birds.position.x = Math.sin(this.elapsed * 0.035) * 12;
      this.birds.position.y = Math.sin(this.elapsed * 0.23) * 0.4;
    }
    this.renderer.info.reset();
    this.renderer.render(this.scene, this.camera);
    this.frameCount++;
    this.statsTime += wallDelta;
    if (this.statsTime > 0.35) {
      this.emitStats();
      this.statsTime = 0;
      this.frameCount = 0;
    }
  };
  private emitStats(): void {
    if (this.filmActive) return;
    this.callbacks.onTelemetry({
      playing: this.state.playing,
      progress: this.progress,
      fps: Math.round(this.frameCount / Math.max(this.statsTime, 0.001)),
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
    });
  }
  resetView(): void {
    for(const world of this.content.children)world.userData.resetVehicle?.();
    this.progress = 0;
    this.scrollMagnification = 1;
    this.clearInput();
    this.resize();
    if (this.state.mode === 'walk') this.resetWalk();
    if (this.state.mode === 'orbit') {
      this.camera.position.copy(vector(this.painting.overview.eye));
      this.controls.target.copy(vector(this.painting.overview.target));
      this.controls.update();
    }
    this.emitStats();
  }
  capture(): string {
    this.renderer.info.reset();
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }
  /** Frame-stepped renderer used by the reproducible MP4 delivery pipeline. */
  beginOfflineFilm(width: number, height: number): void {
    if (this.disposed || this.filmActive || this.offline) throw new Error('影片渲染器正忙');
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width > 4096 ||
      height > 4096
    )
      throw new Error('无效的影片尺寸');
    cancelAnimationFrame(this.frame);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    this.offline = { state: { ...this.state }, progress: this.progress, canvas };
    this.filmActive = true;
    this.state = {
      ...this.state,
      entered: true,
      mode: 'scroll',
      playing: false,
      time: ['starry', 'winter'].includes(this.painting.id) ? 'night' : 'journey',
    };
    this.controls.enabled = false;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = width < height ? 52 : 39;
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
  }
  renderOfflineFrame(progress: number, time: number, view?: CinematicView): string {
    if (!this.offline || this.disposed) throw new Error('请先初始化逐帧渲染');
    this.progress = clamp(progress);
    this.elapsed = Math.max(0, Number.isFinite(time) ? time : 0);
    this.vegetation?.update(this.elapsed);
    this.livingActors?.update(this.elapsed);
    this.lakeBirds?.update(this.elapsed);
    if (this.painting.id === 'empire') {
      const period = Math.min(4, Math.floor(this.progress * 5));
      if (period !== this.state.period) {
        this.state.period = period;
        this.setPeriod(period);
      }
    }
    this.updateCamera(10);
    if (view) {
      this.currentEye.set(...view.eye);
      this.currentTarget.set(...view.target);
      this.camera.position.copy(this.currentEye);
      this.camera.lookAt(this.currentTarget);
    }
    this.updateAtmosphere(10);
    this.featured?.(this.elapsed, this.night);
    if (['qingming', 'arctic', 'sakura', 'roadster'].includes(this.painting.id)) this.renderer.shadowMap.needsUpdate = true;
    this.boats.forEach((b, i) => {
      b.position.y = 0.4 + Math.sin(this.elapsed * 0.8 + i) * 0.065;
      b.rotation.z = Math.sin(this.elapsed * 0.6 + i) * 0.013;
    });
    if (this.birds) {
      this.birds.position.x = Math.sin(this.elapsed * 0.035) * 12;
      this.birds.position.y = Math.sin(this.elapsed * 0.23) * 0.4;
    }
    this.renderer.info.reset();
    this.renderer.render(this.scene, this.camera);
    paintFilmFrame(
      this.offline.canvas.getContext('2d')!,
      this.renderer.domElement,
      this.painting,
      this.progress,
    );
    return this.offline.canvas.toDataURL('image/jpeg', 0.94);
  }
  endOfflineFilm(): void {
    if (!this.offline) return;
    this.state = this.offline.state;
    this.progress = this.offline.progress;
    this.offline = null;
    this.filmActive = false;
    if (this.disposed) return;
    if (this.painting.id === 'empire') this.setPeriod(this.state.period);
    this.controls.enabled = this.state.entered && this.state.mode === 'orbit';
    this.setQuality();
    this.resize();
    this.lastTime = 0;
    this.frame = requestAnimationFrame(this.tick);
  }
  async recordFilm(
    onProgress: (progress: number) => void,
    portrait = false,
    duration = 24,
  ): Promise<Blob> {
    if (this.disposed) throw new Error('画境已关闭');
    if (this.filmActive) throw new Error('已有视频正在录制');
    if (!Number.isFinite(duration) || duration <= 0 || duration > 600)
      throw new Error('视频时长须在 0 至 600 秒之间');
    if (typeof MediaRecorder === 'undefined' || typeof AudioContext === 'undefined')
      throw new Error('当前浏览器不支持录制，请使用新版 Chrome 或 Edge');
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(
      (m) => MediaRecorder.isTypeSupported(m),
    );
    if (!mime) throw new Error('当前浏览器没有可用的视频编码器');

    this.filmActive = true;
    const original = { ...this.state },
      originalProgress = this.progress;
    let audioContext: AudioContext | null = null;
    let destination: MediaStreamAudioDestinationNode | null = null;
    let source: AudioBufferSourceNode | null = null;
    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let raf = 0;
    let rejectCancellation: (reason: Error) => void = () => {};
    const cancellation = new Promise<never>((_, reject) => {
      rejectCancellation = reject;
    });
    // Cancellation also covers preparation, before a MediaRecorder exists.
    void cancellation.catch(() => {});
    this.filmCancel = () => rejectCancellation(new DOMException('视频录制已取消', 'AbortError'));
    try {
      // Create and resume synchronously in the click handler, before rendering the score.
      audioContext = new AudioContext();
      const resumed = audioContext.resume();
      void resumed.catch(() => {});
      const { renderSoundtrack } = await Promise.race([import('./audio'), cancellation]);
      const soundtrack = await Promise.race([
        renderSoundtrack(this.painting.id, duration),
        cancellation,
      ]);
      const bytes = await Promise.race([soundtrack.arrayBuffer(), cancellation]);
      const buffer = await Promise.race([audioContext.decodeAudioData(bytes), cancellation]);
      await Promise.race([resumed, cancellation]);
      if (this.disposed) throw new DOMException('视频录制已取消', 'AbortError');
      destination = audioContext.createMediaStreamDestination();
      source = audioContext.createBufferSource();
      source.buffer = buffer;
      // Export has its own mix. Do not double the live scene sound through the speakers.
      source.connect(destination);

      const canvas = document.createElement('canvas');
      canvas.width = portrait ? 720 : 1280;
      canvas.height = portrait ? 1280 : 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法创建视频画布');
      this.state = {
        ...this.state,
        entered: true,
        mode: 'scroll',
        playing: false,
        time: ['starry', 'winter'].includes(this.painting.id) ? 'night' : 'journey',
      };
      this.progress = 0;
      this.controls.enabled = false;
      this.resize();
      this.updateCamera(10);
      this.updateAtmosphere(10);
      this.renderer.render(this.scene, this.camera);
      paintFilmFrame(ctx, this.renderer.domElement, this.painting, 0);
      stream = canvas.captureStream(30);
      for (const track of destination.stream.getAudioTracks()) stream.addTrack(track);
      recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 8_000_000,
        audioBitsPerSecond: 160_000,
      });
      const activeRecorder = recorder;
      const audioSource = source;
      const chunks: Blob[] = [];
      const recording = new Promise<Blob>((resolve, reject) => {
        activeRecorder.ondataavailable = (event) => {
          if (event.data.size) chunks.push(event.data);
        };
        activeRecorder.onerror = () => reject(new Error('视频编码失败，请降低画质重试'));
        activeRecorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
        activeRecorder.start(1000);
        audioSource.start();
        const started = performance.now();
        const draw = () => {
          try {
            if (this.disposed) throw new DOMException('视频录制已取消', 'AbortError');
            const t = clamp((performance.now() - started) / (duration * 1000));
            this.progress = t;
            onProgress(t);
            if (this.painting.id === 'empire') {
              const period = Math.min(4, Math.floor(t * 5));
              if (this.state.period !== period) {
                this.state.period = period;
                this.setPeriod(period);
              }
            }
            paintFilmFrame(ctx, this.renderer.domElement, this.painting, t);
            if (t >= 1) {
              activeRecorder.stop();
              return;
            }
            raf = requestAnimationFrame(draw);
          } catch (error) {
            reject(error);
          }
        };
        draw();
      });
      return await Promise.race([recording, cancellation]);
    } finally {
      cancelAnimationFrame(raf);
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        if (recorder.state !== 'inactive') recorder.stop();
      }
      try {
        source?.stop();
      } catch {
        /* Preparation may stop before source.start(). */
      }
      source?.disconnect();
      stream?.getTracks().forEach((track) => track.stop());
      destination?.stream.getTracks().forEach((track) => track.stop());
      destination?.disconnect();
      this.filmActive = false;
      this.filmCancel = null;
      this.state = original;
      this.progress = originalProgress;
      if (!this.disposed) {
        this.controls.enabled = original.entered && original.mode === 'orbit';
        if (original.painting === 'empire') this.setPeriod(original.period);
        this.resize();
      }
      if (audioContext && audioContext.state !== 'closed')
        await audioContext.close().catch(() => {});
    }
  }
  dispose(): void {
    this.livingActors?.dispose();
    this.disposed = true;
    this.sceneRequest++;
    this.pendingScene = null;
    this.vegetation?.dispose();
    this.clearInput();
    this.releasePointerLock();
    this.filmCancel?.();
    cancelAnimationFrame(this.frame);
    this.abort.abort();
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.river?.dispose();
    disposeObject(this.content);
    for (const bundle of this.sceneCache.values()) this.disposeScene(bundle);
    this.sceneCache.clear();
    this.sun.shadow.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

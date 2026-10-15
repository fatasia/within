import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ExperienceState, Painting, Telemetry } from '../types';
import { getPainting } from '../data/paintings';
import { clamp, seededRandom } from './math';
import { buildTerrain, groundHeight } from './terrain';
import { buildForest, buildVillage, buildEmpire, boat, bridge } from './props';
import { mistMaterial } from './materials';
import { batchStatic, disposeObject } from './resources';
import { createLandscapeSky, createWindowHalos } from './atmosphere';
import { buildNearDetails } from './details';
import { buildWinterDetails, createWinterSky } from './winter';
import { getWalkStart, walkFieldOfView } from './viewpoints';
import { createPainterlyStarrySky, buildStarryDetails } from './starry';
import { buildRiver, type River } from './river';
import { paintFilmFrame } from './film';
import { buildQingming } from './qingming';
import { buildLandscapeDetails } from './landscapes';

interface Callbacks {
  onTelemetry: (data: Telemetry) => void;
  onError: (message: string) => void;
}
const vector = (v: readonly number[]) => new THREE.Vector3(v[0], v[1], v[2]);
export class Experience {
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
  private boats: THREE.Group[] = [];
  private birds: THREE.LineSegments | null = null;
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
  private pointer: { x: number; y: number; id: number } | null = null;
  private frame = 0;
  private lastTime = 0;
  private statsTime = 0;
  private frameCount = 0;
  private elapsed = 0;
  private resizeObserver: ResizeObserver;
  private abort = new AbortController();
  private disposed = false;
  private filmActive = false;
  private filmCancel: (() => void) | null = null;
  private offline: { state: ExperienceState; progress: number; canvas: HTMLCanvasElement } | null =
    null;
  private night = 0;
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
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.domElement.setAttribute('aria-label', '可交互三维画境');
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.tabIndex = 0;
    host.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 300;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.enabled = false;
    this.scene.add(this.sun, this.ambient, this.content);
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
    this.setQuality();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.bindEvents();
    this.frame = requestAnimationFrame(this.tick);
  }
  private loadPainting(): void {
    this.river?.dispose();
    this.river = null;
    disposeObject(this.content);
    this.boats = [];
    this.mist = new THREE.Group();
    this.sky = null;
    this.halos = null;
    this.empire = null;
    this.painting = getPainting(this.state.painting);
    this.route = new THREE.CatmullRomCurve3(this.painting.route.map(vector));
    this.progress = 0;
    const terrain = buildTerrain(this.painting);
    const custom = ['qingming', 'zhangjiajie', 'guilin'].includes(this.painting.id);
    const village = custom ? new THREE.Group() : buildVillage(this.painting);
    this.halos = createWindowHalos(village);
    this.content.add(
      terrain.group,
      custom ? new THREE.Group() : buildForest(this.painting),
      batchStatic(village),
      this.halos,
      buildNearDetails(this.painting),
    );
    if (this.painting.id === 'winter') this.content.add(buildWinterDetails(this.painting));
    if (this.painting.id === 'starry') this.content.add(buildStarryDetails(this.painting));
    if (this.painting.id === 'qingming') this.content.add(buildQingming(this.painting));
    if (this.painting.id === 'zhangjiajie' || this.painting.id === 'guilin')
      this.content.add(buildLandscapeDetails(this.painting));
    this.rebuildRiver();
    if (this.painting.id === 'starry' || this.painting.id === 'winter') {
      this.sky = this.painting.id === 'starry' ? createPainterlyStarrySky() : createWinterSky();
      this.content.add(this.sky);
    } else {
      this.sky = createLandscapeSky(this.painting);
      this.content.add(this.sky);
    }
    if (this.painting.id === 'empire') {
      this.empire = batchStatic(buildEmpire(this.state.period));
      this.content.add(this.empire);
    }
    if (!custom && this.painting.id !== 'starry' && this.painting.id !== 'winter') {
      for (let i = 0; i < 5; i++) {
        const b = boat(this.painting.id === 'empire' ? 'classical' : 'river');
        b.scale.setScalar(0.6 + i * 0.04);
        const point = this.route.getPointAt((i + 0.4) / 6);
        b.position.copy(point);
        b.position.y = 0.4;
        b.rotation.y = -0.3 + i * 0.6;
        this.boats.push(b);
        this.content.add(b);
      }
      if (this.painting.id !== 'empire')
        this.content.add(
          batchStatic(
            bridge(
              this.painting,
              this.painting.id === 'xishan' ? -3 : 1,
              this.painting.id === 'xishan' ? 19 : 7,
            ),
          ),
        );
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
    this.birds.visible = this.painting.id !== 'winter' && this.painting.id !== 'starry';
    if (this.painting.id === 'xishan') this.addWaterfall();
    this.content.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    this.renderer.shadowMap.needsUpdate = true;
    this.currentEye.copy(vector(this.painting.overview.eye));
    this.currentTarget.copy(vector(this.painting.overview.target));
    this.camera.position.copy(this.currentEye);
    this.camera.lookAt(this.currentTarget);
    this.controls.target.copy(this.currentTarget);
    this.scene.background = new THREE.Color(this.painting.palette.sky);
    this.scene.fog = new THREE.Fog(this.painting.palette.sky, 100, 340);
    this.idleTime = 0;
  }
  private addWaterfall(): void {
    const points = [];
    // Trace the front face of the actual heightfield so the cascade cannot be buried.
    for (let i = 0; i <= 70; i++) {
      const t = i / 70;
      const x = 14 + Math.sin(t * 4) * 0.6,
        z = -41 + t * 21;
      points.push(new THREE.Vector3(x, groundHeight(this.painting, x, z) + 0.28, z));
    }
    const fall = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 100, 0.25, 6, false),
      new THREE.MeshBasicMaterial({ color: '#e4e5d6', transparent: true, opacity: 0.77 }),
    );
    this.content.add(fall);
  }
  configure(next: ExperienceState): void {
    const previous = this.state;
    this.state = { ...next };
    if (next.painting !== previous.painting) this.loadPainting();
    if (Math.abs(next.progress - this.progress) > 0.003) this.progress = clamp(next.progress);
    if (next.quality !== previous.quality) this.setQuality();
    if (next.period !== previous.period && next.painting === 'empire') this.setPeriod(next.period);
    if (next.mode !== previous.mode || next.entered !== previous.entered) {
      this.resize();
      this.controls.enabled = next.entered && next.mode === 'orbit';
      if (next.mode === 'orbit') {
        this.controls.target.copy(this.currentTarget);
        this.controls.update();
      }
      if (next.mode === 'walk') this.resetWalk();
    }
    this.mist.visible = next.mist && next.quality !== 'low';
  }
  private setPeriod(period: number): void {
    if (this.empire) {
      this.content.remove(this.empire);
      disposeObject(this.empire);
    }
    this.empire = batchStatic(buildEmpire(period));
    this.content.add(this.empire);
  }
  private resetWalk(): void {
    const p = this.painting;
    const { x, z, yaw, pitch } = getWalkStart(p.id);
    this.walkingPosition.set(x, Math.max(0.3, groundHeight(p, x, z)) + 1.8, z);
    this.yaw = yaw;
    this.pitch = pitch;
  }
  private rebuildRiver(): void {
    this.river?.dispose();
    this.river = null;
    if (this.painting.id === 'starry' || this.painting.id === 'winter') return;
    this.river = buildRiver(this.painting, this.state.quality);
    this.content.add(this.river.mesh);
  }
  private setQuality(): void {
    this.rebuildRiver();
    const cap =
      this.state.quality === 'high' ? 1.75 : this.state.quality === 'balanced' ? 1.25 : 0.8;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    this.renderer.shadowMap.enabled = this.state.quality === 'high';
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
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }
  private bindEvents(): void {
    const canvas = this.renderer.domElement,
      options = { signal: this.abort.signal };
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (this.state.mode === 'scroll' && this.state.entered) {
          e.preventDefault();
          this.state.playing = false;
          this.progress = clamp(this.progress + e.deltaY * 0.00035);
          this.emitStats();
        }
      },
      { ...options, passive: false },
    );
    canvas.addEventListener(
      'pointerdown',
      (e) => {
        if (this.state.mode === 'orbit' || this.filmActive) return;
        canvas.focus({ preventScroll: true });
        this.pointer = { x: e.clientX, y: e.clientY, id: e.pointerId };
        canvas.setPointerCapture(e.pointerId);
      },
      options,
    );
    canvas.addEventListener(
      'pointermove',
      (e) => {
        if (!this.pointer) return;
        const dx = e.clientX - this.pointer.x,
          dy = e.clientY - this.pointer.y;
        if (this.state.mode === 'walk') {
          this.yaw -= dx * 0.004;
          this.pitch = clamp(this.pitch - dy * 0.003, -1, 1);
        } else if (this.state.entered) {
          this.progress = clamp(this.progress - dx * 0.001);
          this.state.playing = false;
        }
        this.pointer = { x: e.clientX, y: e.clientY, id: e.pointerId };
      },
      options,
    );
    const release = () => {
      this.pointer = null;
    };
    canvas.addEventListener('pointerup', release, options);
    canvas.addEventListener('pointercancel', release, options);
    window.addEventListener(
      'keydown',
      (e) => {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLSelectElement ||
          e.target instanceof HTMLTextAreaElement
        )
          return;
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
          ].includes(e.code) &&
          this.state.entered
        ) {
          e.preventDefault();
          this.keys.add(e.code);
        }
      },
      options,
    );
    window.addEventListener('keyup', (e) => this.keys.delete(e.code), options);
    window.addEventListener('blur', () => this.keys.clear(), options);
    document.addEventListener(
      'visibilitychange',
      () => {
        this.lastTime = 0;
        this.keys.clear();
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
  setMovement(key: string, pressed: boolean): void {
    if (pressed) this.keys.add(key);
    else this.keys.delete(key);
  }
  private walk(dt: number): void {
    let forward =
      Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) -
      Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));
    let side =
      Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) -
      Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const magnitude = Math.hypot(forward, side);
    if (magnitude > 0) {
      forward /= magnitude;
      side /= magnitude;
    }
    const speed = this.keys.has('ShiftLeft') ? 11 : 5;
    const x =
      this.walkingPosition.x +
      (-Math.sin(this.yaw) * forward + Math.cos(this.yaw) * side) * dt * speed;
    const z =
      this.walkingPosition.z +
      (-Math.cos(this.yaw) * forward - Math.sin(this.yaw) * side) * dt * speed;
    const ground = groundHeight(this.painting, x, z),
      old = groundHeight(this.painting, this.walkingPosition.x, this.walkingPosition.z);
    if (ground > 0.15 && Math.abs(ground - old) < 1.4 && Math.abs(x) < 135 && z > -110 && z < 75) {
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
    if (this.state.mode === 'orbit' && this.state.entered && !this.filmActive) {
      this.controls.update();
      this.currentEye.copy(this.camera.position);
      this.currentTarget.copy(this.controls.target);
      return;
    }
    if (this.state.mode === 'walk' && this.state.entered && !this.filmActive) {
      this.walk(dt);
    } else {
      const overviewEye = vector(this.painting.overview.eye),
        overviewTarget = vector(this.painting.overview.target);
      let eye = overviewEye,
        target = overviewTarget;
      if (this.state.entered) {
        const p = this.route.getPointAt(clamp(this.progress)),
          next = this.route.getPointAt(clamp(this.progress + 0.07));
        const height = this.painting.id === 'qianli' ? 43 : 29;
        eye = new THREE.Vector3(
          p.x + 21,
          height + Math.sin(this.progress * Math.PI) * 7,
          p.z + 104,
        );
        target = new THREE.Vector3(next.x, this.painting.id === 'qianli' ? 27 : 16, -30);
        if (this.painting.id === 'xishan') {
          eye.set(p.x + 28, 34 + this.progress * 18, p.z + 155);
          target.set(0, 47, -35);
        }
        if (this.painting.id === 'starry') {
          eye.set(p.x + 18, 15 + this.progress * 9, p.z + 49);
          target.set(next.x, 13, -32);
        }
        if (this.painting.id === 'winter') {
          eye.set(
            18 - this.progress * 26,
            11 + Math.sin(this.progress * Math.PI) * 9,
            142 - this.progress * 38,
          );
          target.set(0, 35, -65);
        }
        if (this.painting.id === 'qingming') {
          eye.set(p.x + 24, 37 + Math.sin(this.progress * Math.PI) * 9, p.z + 100);
          target.set(next.x, 4, -25);
        }
        if (this.painting.id === 'zhangjiajie') {
          eye.set(p.x + 12, 44 + Math.sin(this.progress * Math.PI) * 13, p.z + 130);
          target.set(next.x, 39, -30);
        }
        if (this.painting.id === 'guilin') {
          eye.set(p.x + 18, 25 + Math.sin(this.progress * Math.PI) * 9, p.z + 112);
          target.set(next.x, 22, -37);
        }
        // Gentle establish and resolve: avoid an abrupt jump into a cropped mountain.
        const intro = 1 - THREE.MathUtils.smoothstep(this.progress, 0, 0.12);
        eye.lerp(overviewEye, intro);
        target.lerp(overviewTarget, intro);
        const end = THREE.MathUtils.smoothstep(this.progress, 0.82, 1);
        eye.lerp(overviewEye, end);
        target.lerp(overviewTarget, end);
      } else {
        eye.x += Math.sin(this.idleTime * 0.07) * 2;
        eye.z += Math.cos(this.idleTime * 0.07) * 2;
      }
      const amount = 1 - Math.exp(-dt * 2.4);
      this.currentEye.lerp(eye, amount);
      this.currentTarget.lerp(target, amount);
    }
    this.camera.position.copy(this.currentEye);
    this.camera.lookAt(this.currentTarget);
  }
  private updateAtmosphere(dt: number): void {
    const starry = this.painting.id === 'starry';
    const winter = this.painting.id === 'winter';
    const desired =
      starry || winter
        ? 1
        : this.state.time === 'night'
          ? 1
          : this.state.time === 'day'
            ? 0
            : this.state.time === 'sunset'
              ? 0.4
              : clamp((this.progress - 0.48) * 2);
    this.night += (desired - this.night) * (1 - Math.exp(-dt * 5));
    const color = new THREE.Color(this.painting.palette.sky)
      .lerp(new THREE.Color('#d3aa83'), Math.sin(this.night * Math.PI) * 0.3)
      .lerp(new THREE.Color('#253c51'), this.night);
    if (this.state.painting === 'empire' && this.state.period === 3)
      color.lerp(new THREE.Color('#4e5352'), 0.7);
    (this.scene.background as THREE.Color).copy(color);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(color);
      this.scene.fog.near = this.state.mist ? 100 : 260;
      this.scene.fog.far = this.state.mist ? 430 : 700;
    }
    this.sun.intensity = starry ? 1.2 : 2.15 - this.night * 1.25;
    this.ambient.intensity = starry ? 1.4 : 1.35 - this.night * 0.45;
    this.sun.color
      .set('#fff0d2')
      .lerp(new THREE.Color('#e3ad74'), Math.sin(this.night * Math.PI) * 0.7)
      .lerp(new THREE.Color('#9ebfe7'), this.night);
    this.ambient.color.set('#e4e6d7').lerp(new THREE.Color('#7d9fc9'), this.night);
    this.ambient.groundColor.set('#6d795b').lerp(new THREE.Color('#23394c'), this.night);
    if (winter) {
      this.sun.intensity = 2.4;
      this.sun.color.set('#c1d4ef');
      this.ambient.intensity = 1.15;
      this.ambient.color.set('#7a9ecf');
      this.ambient.groundColor.set('#344e72');
      color.set('#223650');
      if (this.scene.fog instanceof THREE.Fog) this.scene.fog.color.copy(color);
    }
    this.river?.update(this.elapsed, this.night);
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
      m.uniforms.uColor!.value.copy(color).lerp(new THREE.Color('#d7e1d5'), (1 - this.night) * 0.3);
      m.uniforms.uOpacity!.value = winter ? 0.1 : this.painting.id === 'fuchun' ? 0.33 : 0.22;
    });
  }
  private tick = (time: number): void => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.tick);
    if (document.hidden && !this.filmActive) {
      this.lastTime = 0;
      return;
    }
    const dt = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.1) : 0.016;
    this.lastTime = time;
    this.elapsed += dt;
    this.idleTime += dt;
    if (
      this.state.playing &&
      this.state.entered &&
      !this.filmActive &&
      this.state.mode === 'scroll'
    )
      this.progress = clamp(this.progress + (dt * this.state.speed) / 150);
    if (this.state.mode === 'scroll' && this.state.entered) {
      const direction = Number(this.keys.has('ArrowRight')) - Number(this.keys.has('ArrowLeft'));
      this.progress = clamp(this.progress + direction * dt * 0.075);
    }
    this.updateCamera(dt);
    this.updateAtmosphere(dt);
    this.boats.forEach((b, i) => {
      b.position.y = 0.4 + Math.sin(this.elapsed * 0.8 + i) * 0.065;
      b.rotation.z = Math.sin(this.elapsed * 0.6 + i) * 0.013;
    });
    if (this.birds) {
      this.birds.position.x = Math.sin(this.elapsed * 0.035) * 12;
      this.birds.position.y = Math.sin(this.elapsed * 0.23) * 0.4;
    }
    this.renderer.render(this.scene, this.camera);
    this.frameCount++;
    this.statsTime += dt;
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
    this.progress = 0;
    if (this.state.mode === 'walk') this.resetWalk();
    if (this.state.mode === 'orbit') {
      this.camera.position.copy(vector(this.painting.overview.eye));
      this.controls.target.copy(vector(this.painting.overview.target));
      this.controls.update();
    }
    this.emitStats();
  }
  capture(): string {
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
    this.camera.updateProjectionMatrix();
  }
  renderOfflineFrame(progress: number, time: number): string {
    if (!this.offline || this.disposed) throw new Error('请先初始化逐帧渲染');
    this.progress = clamp(progress);
    this.elapsed = Math.max(0, Number.isFinite(time) ? time : 0);
    if (this.painting.id === 'empire') {
      const period = Math.min(4, Math.floor(this.progress * 5));
      if (period !== this.state.period) {
        this.state.period = period;
        this.setPeriod(period);
      }
    }
    this.updateCamera(10);
    this.updateAtmosphere(10);
    this.boats.forEach((b, i) => {
      b.position.y = 0.4 + Math.sin(this.elapsed * 0.8 + i) * 0.065;
      b.rotation.z = Math.sin(this.elapsed * 0.6 + i) * 0.013;
    });
    if (this.birds) {
      this.birds.position.x = Math.sin(this.elapsed * 0.035) * 12;
      this.birds.position.y = Math.sin(this.elapsed * 0.23) * 0.4;
    }
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
    this.disposed = true;
    this.filmCancel?.();
    cancelAnimationFrame(this.frame);
    this.abort.abort();
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.river?.dispose();
    disposeObject(this.content);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

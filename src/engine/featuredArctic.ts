import * as THREE from 'three';
import {
  addMesh,
  canvasTexture,
  mat,
  particleField,
  registerUpdate,

  scatterInstanced,
  type Placement,
} from './featuredShared';
import { fbm } from './math';
import { arcticIceGeometry, arcticAuroraGeometry, glacierSheetGeometry, mergeArcticMeshes } from './arcticIce';
import { buildArcticBear, animateArcticBear, buildArcticSeal, buildPolarPenguin, animatePolarPenguin } from './arcticWildlife';
import { polarChase, polarPlay } from './arcticPlay';
import { buildPolarGames } from './arcticGames';

/**
 * "Arctic glacier · aurora" — a polar night on shore-fast ice.  The global
 * reflector at y≈0 is the dark sea; every landform sits above it so leads of
 * open water catch the aurora.  One registered update drives the ribbons, the
 * snowfall and the fill light; no per-frame allocations, no module state.
 */

/** Shore-fast ice height: a drifted walking field ending at the tide crack. */
export function snowHeight(x: number, z: number): number {
  const drift = (fbm(x * 0.045, z * 0.06, 2401) - 0.5) * 1.1;
  const sastrugi = Math.sin(x * 0.9 + fbm(x * 0.2, z * 0.2, 71) * 5) * 0.07;
  const dunes = 0.2 * Math.sin(x * 0.075 + z * 0.04) ** 2;
  const shore = 0.88 + drift * 0.45 + sastrugi + dunes;
  return shore - THREE.MathUtils.smoothstep(-z, 26, 41) * 2.3;
}

/** Vertical striation and layering for the glacier front. */
function iceTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 256, (ctx, rand) => {
    ctx.fillStyle = '#d9edf4';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 46; i++) {
      const x = rand() * 256;
      const width = 2 + rand() * 9;
      const shade = 140 + Math.floor(rand() * 90);
      ctx.fillStyle = `rgba(${shade - 60},${shade - 20},${Math.min(255, shade + 30)},${0.08 + rand() * 0.12})`;
      ctx.fillRect(x, 0, width, 256);
    }
    for (let i = 0; i < 8; i++) {
      const y = rand() * 256;
      ctx.strokeStyle = `rgba(238,250,255,${0.07 + rand() * 0.12})`;
      ctx.lineWidth = 0.5 + rand() * 0.7;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 256; x += 32) ctx.lineTo(x, y + (rand() - 0.5) * 14);
      ctx.stroke();
    }
    // Hairline fractures only: dark ellipses previously read as holes or fish eyes.
    for (let i = 0; i < 35; i++) {
      let x = rand() * 256, y = rand() * 170;
      ctx.strokeStyle = `rgba(65,126,152,${0.15 + rand() * .18})`; ctx.lineWidth = .4 + rand() * .65;
      ctx.beginPath(); ctx.moveTo(x,y);
      for (let segment=0;segment<5;segment++){x+=(rand()-.5)*6;y+=6+rand()*9;ctx.lineTo(x,y);}ctx.stroke();
      ctx.strokeStyle='rgba(235,251,255,0.32)';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(x+1,y);ctx.lineTo(x+4,y-12);ctx.stroke();
    }  });
}

/** Wind-ripple pattern pressed into the snowfield. */
function snowTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 256, (ctx, rand) => {
    ctx.fillStyle = '#e9f1f5';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 90; i++) {
      const y = rand() * 256;
      ctx.strokeStyle = rand() > 0.5
        ? 'rgba(255,255,255,0.2)'
        : `rgba(168,196,214,${0.1 + rand() * 0.16})`;
      ctx.lineWidth = 1.5 + rand() * 4;
      ctx.beginPath();
      ctx.moveTo(-10, y);
      for (let x = 0; x <= 266; x += 24) ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 6);
      ctx.stroke();
    }
  }, [18, 14]);
}

/** Aurora curtain: additive shader with flow noise and a vertical colour ramp. */
function auroraMaterial(seed: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: seed },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uSeed;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        float wave = sin(uv.x * 9.0 + uSeed * 3.1 + uTime * 0.38) * 3.6
          + sin(uv.x * 23.0 - uTime * 0.63 + uSeed) * 1.9;
        p.y += wave * (0.25 + 0.75 * uv.y);
        p.z += sin(uv.x * 16.0 + uTime * 0.43 + uSeed) * (3.0 + uv.y * 6.0);
        p.x += sin(uv.x * 21.0 - uTime * 0.37 + uSeed) * uv.y * 2.4;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uSeed;
      varying vec2 vUv;
      float hash(float p) { return fract(sin(p * 127.1 + uSeed * 13.7) * 43758.5453); }
      float noise(float p) { float i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(hash(i), hash(i + 1.0), f); }
      void main() {
        float drift = sin(vUv.x * 11.0 + uSeed - uTime * .34) * .018 + sin(vUv.x * 27.0 - uTime * .26) * .006;
        float columns = vUv.x + drift + vUv.y * .007 * sin(vUv.x * 32.0 + uTime * .45);
        float fine = pow(noise(columns * 620.0), 2.4);
        float broad = noise(columns * 37.0 + uTime * .24);
        float ray = .15 + fine * .3 + broad * .5;
        float edge = smoothstep(0.0,.06,vUv.x) * smoothstep(1.0,.92,vUv.x);
        float falloff = smoothstep(0.0,.07,vUv.y) * exp(-vUv.y * (2.7 + noise(columns * 53.0) * 2.0)) * smoothstep(1.0,.72,vUv.y);
        vec3 color = mix(vec3(.12,.94,.38), vec3(.16,.65,.44), smoothstep(.18,.64,vUv.y));
        color = mix(color,vec3(.65,.16,.32),smoothstep(.57,.9,vUv.y)*.62);
        float veil = .7 + sin(uTime*.47 + columns*8.0+uSeed)*.22;
        gl_FragColor = vec4(color * (.5 + ray), edge * falloff * ray * veil * .9);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

export function buildArctic(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Arctic glacier · aurora';

  // Shore-fast snowfield (the walking area) sloping under the sea at the crack.
  const snowGeometry = new THREE.PlaneGeometry(330, 210, 96, 60);
  snowGeometry.rotateX(-Math.PI / 2);
  snowGeometry.translate(0, 0, 40);
  const snowPositions = snowGeometry.attributes.position!;
  for (let i = 0; i < snowPositions.count; i++) {
    snowPositions.setY(i, snowHeight(snowPositions.getX(i)!, snowPositions.getZ(i)!));
  }
  snowGeometry.computeVertexNormals();
  const snowfield = addMesh(
    group,
    snowGeometry,
    mat('#eef4f7', { roughness: 0.97, map: snowTexture() }),
  );
  snowfield.name = 'snowfield';
  snowfield.receiveShadow = true;

  // The snow surface itself carries the drifts: collision and render use snowHeight.
  // Floes are rigid groups, so their snow skin and resting animals bob together.
  const floes: { root: THREE.Group; phase: number }[] = [];
  const iceSkin = mat('#83bed4', { roughness: 0.36, metalness: 0.02 });
  const snowSkin = mat('#e8f1f3', { roughness: 0.94 });
  for (let i = 0; i < 28; i++) {
    const floe = new THREE.Group(); floe.name = 'moving sea ice floe';
    floe.position.set(-102 + (i % 10) * 22 + Math.sin(i * 4.3) * 6, -0.12, -36 - Math.floor(i / 10) * 14 - (i % 4) * 2.2);
    floe.rotation.y = i * 2.399;
    const radius = 3.5 + (i % 4) * 1.3;
    const shape = new THREE.CylinderGeometry(radius, radius * 1.09, 0.76, 9, 1);
    const p = shape.attributes.position!;
    for(let v=0;v<p.count;v++) {
      const angle=Math.atan2(p.getZ(v),p.getX(v));
      const uneven=1+Math.sin(angle*3+i)*.12+Math.cos(angle*5-i)*.08;
      p.setX(v,p.getX(v)*uneven); p.setZ(v,p.getZ(v)*uneven*.74);
    }
    shape.computeVertexNormals();
    addMesh(floe, shape, iceSkin);
    const top=shape.clone(); top.scale(.96,.13,.96); top.translate(0,.39,0);
    addMesh(floe,top,snowSkin);
    group.add(floe); floes.push({root:floe,phase:i*1.72});
  }

  // Stranded bergs listing where they ran aground along the crack.
  const bergPlacements: Placement[] = [];
  for (let i = 0; i < 9; i++) {
    const x = -80 + i * 20 + (i % 3) * 4;
    const z = -50 - (i % 4) * 4;
    bergPlacements.push({
      position: [x, 0.6 + (i % 3) * 0.4, z],
      rotationY: (i * 1.7) % Math.PI,
      tilt: 0.28 + (i % 3) * 0.12,
      scale: [4.5 + (i % 4) * 1.8, 2.6 + (i % 2) * 1.4, 3.4 + (i % 3) * 1.2],
    });
  }
  const strandedBergs = scatterInstanced(
    group,
    new THREE.DodecahedronGeometry(1, 0),
    mat('#8fc4d8', {
      roughness: 0.28,
      metalness: 0.05,
      emissive: '#123a4d',
      intensity: 0.22,
    }),
    bergPlacements,
  );

  // A fractured tidewater glacier: staggered, tilted seracs with deep blue slots.
  // No rectangular panels or separate white coping strips.
  const iceMap = iceTexture();
  const iceMaterial = mat('#e8f4f8', { map: iceMap, vertexColors: true, roughness: 0.48, metalness: 0.015 });
  const glacier = new THREE.Group(); glacier.name = 'fractured glacier front'; group.add(glacier);
  const iceSheet = addMesh(glacier, glacierSheetGeometry(), iceMaterial); iceSheet.name = 'continuous inland ice sheet'; iceSheet.receiveShadow = true;
  for (let row = 0; row < 2; row++) for (let i = 0; i < 19; i++) {
    const x = -142 + i * 16 + Math.sin(i * 3.7 + row) * 5.2;
    const height = 8 + row * 8 + (Math.sin(i * 1.91 + row * 2) * .5 + .5) * 18;
    const z = -85 - row * 13 + Math.sin(i * .86) * 7;
    const serac = addMesh(glacier, arcticIceGeometry(861 + i * 73 + row * 301, 21 + (i % 3) * 4, height, 26 + row * 6), iceMaterial, [x,0,z]);
    serac.name = 'fractured blue glacier serac'; serac.rotation.y = Math.sin(i * 3.7 + row) * .26;
    serac.castShadow=true; serac.receiveShadow=true;
  }

  mergeArcticMeshes(glacier);

  // Wildlife on grounded snow and on individual sea-ice floes.
  const hero = buildArcticBear();
  hero.root.name = 'polar bear · playful adult';
  hero.root.position.set(-15, snowHeight(-15, 14), 14); group.add(hero.root);
  const farBear = buildArcticBear();
  const bearFloe = floes[3]!.root;
  farBear.root.position.set(0,.43,0); farBear.root.rotation.y=Math.PI*.7; farBear.root.scale.setScalar(.74); bearFloe.add(farBear.root);
  const seal = buildArcticSeal();
  const sealFloe = floes[5]!.root;
  seal.root.position.set(0,.43,0); seal.root.rotation.y=.3; sealFloe.add(seal.root);

  // Requested penguins are kept as an explicitly non-native polar-gallery interpretation.
  const penguins = Array.from({ length: 5 }, (_, index) => {
    const rig = buildPolarPenguin(); rig.root.scale.setScalar(.85 + index % 3 * .12); group.add(rig.root); return rig;
  });
  const updateGames = buildPolarGames(group, penguins, snowHeight);

  // Elevated atmospheric curtains: the fourth emerges behind the ice skyline,
  // not from the snow or from a ground-emissive plane.
  const auroras: THREE.ShaderMaterial[] = [];
  for (let band = 0; band < 4; band++) {
    const horizon = band === 3;
    const span = horizon ? 300 : [180, 225, 135][band]!;
    const center = horizon ? 0 : [-45, 24, 65][band]!;
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 11 }, (_, i) => {
      const t = i / 10;
      return new THREE.Vector3(center + (t - .5) * span + Math.sin(t * 15 + band) * (horizon ? 2 : 9),
        (horizon ? 24 : 43 + band * 6) + Math.sin(t * 9 + band * 1.9) * (horizon ? 7 : 11),
        (horizon ? -153 : -70 - band * 25) + Math.cos(t * 12 + band) * (horizon ? 17 : 29));
    }));
    const material = auroraMaterial(band * 4.7); auroras.push(material);
    const curtain = new THREE.Mesh(arcticAuroraGeometry(curve, horizon ? 75 : 30 + band * 8), material);
    curtain.name = horizon ? 'aurora · beyond glacier horizon' : `aurora · vertical curtain ${band + 1}`;
    curtain.frustumCulled = false; group.add(curtain);
  }
  // Snowfall, ground sparkles, and one breathing teal fill for the aurora.
  const snow = particleField({
    count: 1300,
    area: [170, 42, 170],
    origin: [0, 0, 20],
    color: '#f5faff',
    size: 0.52,
    fall: 1.7,
    sway: 1.5,
    opacity: 0.83,
  });
  snow.name = 'snowfall';
  group.add(snow);
  const nearSnow = particleField({ count: 250, area: [80, 34, 80], origin: [0, 4, 28], color: '#f5faff', size: .95, sizeJitter: .65, fall: 2.1, sway: 1.8, opacity: .76 });
  nearSnow.name = 'near snowflakes'; group.add(nearSnow);
  const sparkle = particleField({
    count: 240,
    area: [130, 2.5, 130],
    origin: [0, 0.4, 10],
    color: '#bfefff',
    size: 0.1,
    additive: true,
    twinkle: 1,
    opacity: 0.8,
  });
  group.add(sparkle);
  const fill = new THREE.PointLight('#39e6b8', 0.7, 190, 2);
  fill.position.set(0, 42, -62);
  group.add(fill);

  let latestTime = 0;
  for (const rig of [hero, farBear, ...penguins])
    rig.root.userData.onEncounter = () => { rig.root.userData.greetingUntil = latestTime + 2.5; };
  registerUpdate(group, (elapsed) => {
    latestTime = elapsed;
    for (const floe of floes) {
      floe.root.position.y = -.12 + Math.sin(elapsed * .62 + floe.phase) * .15;
      floe.root.rotation.x = Math.sin(elapsed * .39 + floe.phase) * .019;
      floe.root.rotation.z = Math.cos(elapsed * .47 + floe.phase) * .025;
    }
    // The glacier is grounded; the detached bergs rise and list with the tide.
    strandedBergs.position.y = Math.sin(elapsed * .41) * .22;
    strandedBergs.rotation.x = Math.sin(elapsed * .29) * .002;
    const play = polarPlay(elapsed), chase = polarChase(elapsed, 'bear');
    hero.root.position.set(chase.x,snowHeight(chase.x,chase.z),chase.z);
    hero.root.rotation.y = chase.heading;
    animateArcticBear(hero,elapsed * (chase.running ? 1.75 : 1),chase.running || play.approach < .6); animateArcticBear(farBear,elapsed*.67,false);
    if (!chase.running) { hero.head.rotation.z += play.paw * .32;hero.legs[0]!.rotation.z -= play.paw * .62;hero.paws[0]!.rotation.z += play.paw * .3; }
    seal.body.scale.y = .38 * (1 + Math.sin(elapsed * 1.6) * .025);
    seal.head.rotation.y = Math.sin(elapsed * .27) * .12;
    seal.root.rotation.x = Math.sin(elapsed * .37) * .055;
    seal.flippers.forEach((flipper,index)=>{ flipper.rotation.x = Math.sin(elapsed * .9 + index) * .09; });
    penguins.forEach((rig,index)=>{
      const pose = index < 2 ? polarChase(elapsed, index as 0 | 1) : null;
      const x=pose?.x ?? [2,8,11][index-2]!, z=pose?.z ?? (index===4?16:12);
      rig.root.position.set(x,snowHeight(x,z)+(index<2&&!chase.running?play.hop:0),z);
      rig.root.rotation.set(0,pose?.heading ?? (index===2?Math.PI/2:-Math.PI/2),0);
      animatePolarPenguin(rig,elapsed*(pose?.running?1.55:1)+index*.7,index<2);
      rig.head.rotation.x=0;rig.flippers.forEach(fin=>{fin.rotation.x=0;});
      if(index<2&&!chase.running) rig.flippers.forEach((fin,i)=>{fin.rotation.z+=(i===0?-1:1)*play.paw*(.4+Math.sin(elapsed*5)*.2);});
    });
    updateGames(elapsed);
    for (const rig of [hero, farBear]) if (elapsed < (rig.root.userData.greetingUntil ?? -1)) {
      rig.head.rotation.y += Math.sin(elapsed * 5) * 0.25;
      rig.legs[0]!.rotation.z -= 0.55;
      rig.paws[0]!.rotation.z += 0.25;
    }
    for (const rig of penguins) if (elapsed < (rig.root.userData.greetingUntil ?? -1)) {
      rig.root.position.y += Math.abs(Math.sin(elapsed * 7)) * 0.2;
      rig.flippers.forEach((fin, i) => { fin.rotation.z += (i ? 1 : -1) * (0.4 + Math.sin(elapsed * 9) * 0.25); });
    }
    for (const material of auroras) material.uniforms.uTime!.value = elapsed;
    (snow.material as THREE.ShaderMaterial).uniforms.uTime!.value = elapsed;
    (nearSnow.material as THREE.ShaderMaterial).uniforms.uTime!.value = elapsed;
    (sparkle.material as THREE.ShaderMaterial).uniforms.uTime!.value = elapsed;
    fill.intensity = 0.55 + Math.sin(elapsed * 0.5) * 0.25 + Math.sin(elapsed * 1.7) * 0.08;
  });
  return group;
}




import * as THREE from 'three';
import { addMesh, mat } from './featuredShared';
import { mergeArcticMeshes } from './arcticIce';


/** Smooth joined torso/skull profiles, avoiding visible intersecting body spheres. */
function animalLoft(profiles: number[][]): THREE.BufferGeometry {
  const centers = new THREE.CatmullRomCurve3(profiles.map(p => new THREE.Vector3(p[0]!, p[1]!, p[2]!)));
  const heights = new THREE.CatmullRomCurve3(profiles.map((p, i) => new THREE.Vector3(i, p[3]!, 0)));
  const positions: number[] = [], uv: number[] = [], index: number[] = [], rings = 38, sides = 24;
  for (let i = 0; i <= rings; i++) {
    const t = i / rings, center = centers.getPoint(t), radiusY = heights.getPoint(t).y;
    for (let j = 0; j <= sides; j++) { const a = j / sides * Math.PI * 2; positions.push(center.x, center.y + Math.cos(a) * radiusY, Math.sin(a) * Math.max(0.005, center.z)); uv.push(j / sides, t); if (i < rings && j < sides) { const n = i * (sides + 1) + j; index.push(n, n + 1, n + sides + 1, n + 1, n + sides + 2, n + sides + 1); } }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(index); geometry.computeVertexNormals(); return geometry;
}
export interface BearRig { root: THREE.Group; head: THREE.Group; legs: THREE.Group[]; paws: THREE.Group[]; }

/** Long low skull, heavy plantigrade paws, short round ears: not a brown-bear hump. */
export function buildArcticBear(): BearRig {
  const root = new THREE.Group();
  root.name = 'polar bear'; root.userData.encounterId = 'arctic-bear';
  const fur = mat('#f3f0e5', { roughness: 0.94 });
  const furData = new Uint8Array(128 * 128 * 4);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){const value=230+Math.floor((Math.sin(x*127.1+y*311.7)*43758.5453%1+.5)*14);const n=(y*128+x)*4;furData[n]=furData[n+1]=furData[n+2]=value;furData[n+3]=255;}const furMap=new THREE.DataTexture(furData,128,128);furMap.wrapS=furMap.wrapT=THREE.RepeatWrapping;furMap.magFilter=THREE.LinearFilter;furMap.minFilter=THREE.LinearMipmapLinearFilter;furMap.generateMipmaps=true;furMap.repeat.set(8,4);furMap.needsUpdate=true;fur.map=furMap;fur.bumpMap=furMap;fur.bumpScale=.004;
  const shade = mat('#dfdbce', { roughness: 0.98 });
  const dark = mat('#191e20', { roughness: 0.6 });
  const eye = mat('#090e11', { roughness: 0.17 });
  const ball = new THREE.SphereGeometry(1, 16, 12);
  const ellipsoid = (g: THREE.Object3D, m: THREE.Material, p: readonly [number, number, number], s: readonly [number, number, number]) => addMesh(g, ball, m, p, s);
  addMesh(root, animalLoft([[-2.05,1.66,.29,.31],[-1.6,1.7,.35,.4],[-1.1,1.76,.48,.53],[-.6,1.72,.6,.64],[.1,1.62,.68,.74],[.8,1.5,.6,.67],[1.35,1.43,.39,.46],[1.55,1.41,.005,.03]]), fur);  const head = new THREE.Group(); head.name = 'bear articulated head'; head.position.set(-1.98, 1.66, 0); root.add(head);
  addMesh(head, animalLoft([[-.64,-.09,.19,.14],[-.43,-.045,.25,.22],[-.18,.02,.325,.31],[.1,.035,.34,.34],[.38,0,.005,.04]]), fur);
  ellipsoid(head, shade, [-0.36, -0.25, 0], [0.3, 0.08, 0.22]);
  ellipsoid(head, dark, [-0.64, -0.08, 0], [0.055, 0.07, 0.15]);
  for (const side of [-1, 1]) {
    ellipsoid(head, fur, [0.13, 0.32, side * 0.27], [0.085, 0.09, 0.075]);
    ellipsoid(head, shade, [0.1, 0.33, side * 0.32], [0.045, 0.05, 0.018]);

    ellipsoid(head, shade, [-0.25, .085, side*.31], [.065,.045,.024]);
    ellipsoid(head, eye, [-0.27, 0.075, side * 0.333], [0.024, 0.018, 0.013]);

    const mouth = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.66,-0.19,side*0.17),new THREE.Vector3(-0.44,-0.235,side*0.245),new THREE.Vector3(-0.25,-0.245,side*0.27)]);
    addMesh(head, new THREE.TubeGeometry(mouth, 8, 0.005, 4, false), shade);
  }
  const legs: THREE.Group[] = [], paws: THREE.Group[] = [];
  for (const x of [-0.82, 0.82]) for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.name = 'bear leg'; leg.position.set(x, 1.25, side * 0.44); root.add(leg); legs.push(leg);
    const limb = animalLoft([[-1.12,0,.18,.18],[-.8,0,.22,.21],[-.35,0,.27,.28],[.05,0,.3,.32],[.32,0,.01,.02]]); limb.rotateZ(Math.PI/2); addMesh(leg,limb,fur);
    const paw = new THREE.Group(); paw.position.set(-0.09, -1.1, 0); leg.add(paw); paws.push(paw);
    ellipsoid(paw, fur, [-0.07, 0.015, 0], [0.36, 0.16, 0.29]);
    ellipsoid(paw, dark, [-0.04, -0.105, 0], [0.22, 0.035, 0.2]);
    for (let toe = 0; toe < 5; toe++) {
      const z = (toe - 2) * 0.105;
      ellipsoid(paw, fur, [-0.29, 0.015, z], [0.08, 0.075, 0.062]);
      const claw = ellipsoid(paw, dark, [-0.375, -0.02, z], [0.052, 0.022, 0.023]); claw.rotation.z = -0.16;
    }
  }
  ellipsoid(root, fur, [1.45, 1.4, 0], [0.13, 0.12, 0.14]);
  root.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
  mergeArcticMeshes(root);
  return { root, head, legs, paws };
}

export function animateArcticBear(rig: BearRig, time: number, walking: boolean): void {
  rig.head.rotation.y = Math.sin(time * 0.44) * 0.22;
  rig.head.rotation.z = Math.sin(time * 0.51) * 0.12;
  rig.legs.forEach((leg, index) => {
    const phase = time * 1.9 + [0, Math.PI, Math.PI * 0.7, Math.PI * 1.7][index]!;
    leg.rotation.z = walking ? Math.sin(phase) * 0.29 : 0;
    // Leg pendulum shortens its vertical projection. Lower its pivot to keep the stance foot planted.
    leg.position.y = 1.25 - 1.1 * (1 - Math.cos(leg.rotation.z)) + (walking ? Math.max(0, Math.cos(phase)) * 0.1 : 0);
    rig.paws[index]!.rotation.z = -leg.rotation.z;
  });
}

export function buildArcticSeal(): { root: THREE.Group; body: THREE.Mesh; head: THREE.Group; flippers: THREE.Group[] } {
  const root = new THREE.Group(); root.name = 'ringed seal';
  const skin = mat('#8999a3', { roughness: 0.7 });
  const belly = mat('#b9c3c5', { roughness: 0.88 });
  const dark = mat('#14252e', { roughness: 0.2 });
  const ball = new THREE.SphereGeometry(1, 20, 12);
  const body = addMesh(root, ball, skin, [0, 0.38, 0], [0.88, 0.38, 0.39]);
  addMesh(root, ball, belly, [0.1, 0.28, 0], [0.72, 0.2, 0.36]);
  const head = new THREE.Group(); head.position.set(0.76, 0.52, 0); root.add(head);
  addMesh(head, ball, skin, [0, 0, 0], [0.28, 0.25, 0.25]);
  for (const side of [-1,1]) {
    addMesh(head, ball, belly, [0.2, -0.07, side * 0.07], [0.13, 0.09, 0.1]);
    addMesh(head, ball, dark, [0.1, 0.07, side * 0.214], [0.043, 0.046, 0.025]);
    for (let i=0;i<4;i++) {
      const line = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.23,-0.055,side*0.12),new THREE.Vector3(0.24+i*.024,-0.08+i*.025,side*(0.29+i*.017))]);
      head.add(new THREE.Line(line,new THREE.LineBasicMaterial({color:'#d1dad9'})));
    }
  }
  addMesh(head,ball,dark,[0.29,-0.025,0],[0.045,0.035,0.07]);
  const flippers: THREE.Group[]=[];
  for(const side of [-1,1]) {
    const flipper=new THREE.Group(); flipper.position.set(-0.66,0.17,side*0.14); root.add(flipper); flippers.push(flipper);
    const fin=addMesh(flipper,ball,skin,[-0.28,0,side*0.12],[0.36,0.075,0.16]); fin.rotation.y=side*-0.4;
    const front=addMesh(root,ball,skin,[0.25,0.14,side*0.36],[0.33,0.06,0.14]); front.rotation.y=side*-0.55;
  }
  // Broken pale rings are characteristic of the ringed seal's dorsal coat.
  const rings = new THREE.Group(); body.add(rings);
  for(let i=0;i<18;i++) {
    const x=-0.7+(i%6)*0.26, angle=0.3+Math.floor(i/6)*0.65;
    const radial=Math.sqrt(1-x*x);
    const ring=addMesh(rings,new THREE.TorusGeometry(0.075,0.012,4,10,Math.PI*1.65),belly,[x,Math.cos(angle)*radial,Math.sin(angle)*radial]);
    ring.rotation.x=-angle;
  }
  return {root,body,head,flippers};
}

export interface PenguinRig { root: THREE.Group; flippers: THREE.Group[]; feet: THREE.Group[]; head: THREE.Group; }
/** Requested polar-gallery visitor; not represented as native Arctic wildlife. */
export function buildPolarPenguin(): PenguinRig {
  const root = new THREE.Group(); root.name = 'penguin · polar interpretation'; root.userData.nonNativeArctic = true; root.userData.encounterId = 'arctic-penguin';
  const black = mat('#26313a', { roughness: 0.86 }), white = mat('#e4e7df', { roughness: 0.93 }), beak = mat('#9c7150'), eye = mat('#080d10', { roughness: 0.2 });
  const ball = new THREE.SphereGeometry(1, 18, 12);
  addMesh(root, ball, black, [0,.69,0], [.32,.58,.29]); addMesh(root,ball,white,[0,.63,.16],[.265,.46,.17]);
  const head = new THREE.Group(); head.position.set(0,1.16,0); root.add(head);
  addMesh(head,ball,black,[0,0,0],[.23,.24,.22]);
  for (const side of [-1,1]) { addMesh(head,ball,white,[side*.142,.035,.151],[.052,.051,.046]); addMesh(head,ball,eye,[side*.145,.04,.196],[.025,.026,.018]); }
  const bill = addMesh(head,new THREE.ConeGeometry(.075,.25,10),beak,[0,-.055,.28]); bill.rotation.x=Math.PI/2;
  const flippers: THREE.Group[]=[], feet: THREE.Group[]=[];
  for(const side of [-1,1]) {
    const flipper=new THREE.Group();flipper.position.set(side*.285,.9,0);root.add(flipper);flippers.push(flipper);
    const fin=addMesh(flipper,ball,black,[side*.06,-.23,0],[.07,.31,.12]);fin.rotation.z=side*.22;
    const foot=new THREE.Group();foot.position.set(side*.15,.065,.1);root.add(foot);feet.push(foot);addMesh(foot,ball,beak,[0,0,.07],[.12,.055,.22]);
  }
  addMesh(root,ball,black,[0,.25,-.25],[.13,.09,.24]);root.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=true;}});mergeArcticMeshes(root);return {root,head,feet,flippers};
}
export function animatePolarPenguin(rig: PenguinRig,time:number,walking:boolean):void {
  const gait = time*2.1;rig.root.rotation.z=walking?Math.sin(gait)*.105:Math.sin(time*.5)*.025;rig.head.rotation.y=Math.sin(time*.57)*.28;
  rig.flippers.forEach((fin,i)=>{fin.rotation.z=(i===0?-1:1)*(.2+Math.sin(time*1.4+i)*.28);});
  rig.feet.forEach((foot,i)=>{foot.position.y=.065+(walking?Math.max(0,Math.sin(gait+i*Math.PI))*.08:0);foot.rotation.x=walking?Math.sin(gait+i*Math.PI)*.15:0;});
}




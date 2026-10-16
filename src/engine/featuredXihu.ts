import * as THREE from 'three';
import { addMesh, mat, registerUpdate } from './featuredShared';
import { branch, compactLandscape, rod } from './featuredLandscapeKit';
import { seededRandom } from './math';
import { whiteSerpent, dressMonk } from './xihuCharacters';

export const XIHU_BANK_Y = 0.6;
export const XIHU_PAVING_Y = 0.68;

/** Shared with walking: shallow stone arch, short causeway, sunset shore and near bank. */
export function xihuGroundY(x: number, z: number): number {
  if (Math.abs(x + 7) <= 3.05 && z >= -2 && z <= 16) return bridgeY(z);
  if (Math.abs(x + 7) <= 3.05 && z >= -9 && z < -2) return 0.72;
  if (Math.hypot(x, z + 28) < 21 || (Math.abs(x) < 21 && z <= -28 && z >= -85)) return 0.8;
  if (z >= 10.9 && z <= 15.1) return XIHU_PAVING_Y;
  if (z >= 10) return XIHU_BANK_Y;
  return -1;
}
function bridgeY(z: number): number { return 0.72 + 1.68 * Math.sin(Math.PI * (z + 2) / 18); }

/** West Lake landmarks in a compressed composition, not a geographic survey. */
export function buildXihu(): THREE.Group {
  const group = new THREE.Group(); group.name = '西湖 · 断桥与雷峰夕照';
  group.userData.interpretation = '雷峰塔采用五层八面形制并连接夕照山岸，不置于湖心岛；断桥与塔岸为压缩展陈、非实测地图，白娘子许仙为传说人物。';
  const stone = mat('#aaa997'), seams = mat('#777c70'), timber = mat('#6b4231'), roof = mat('#575d53'), pale = mat('#d0c1a3');
  const grass = mat('#566b49'), bark = mat('#625c45'), rand = seededRandom(1106);
  // Full-width bank has the same level as the walk surface, without an internal water plane.
  addMesh(group, new THREE.BoxGeometry(360, 3, 210), grass, [0, -0.9, 115]);
  // Eight centimetres above the turf: the previous top face was coplanar
  // with the bank at y=.6, producing moving green/stone depth interference.
  addMesh(group, new THREE.BoxGeometry(360, 0.12, 4.2), stone, [0, XIHU_PAVING_Y - 0.06, 13]);
  // Leifeng belongs to the shore at Sunset Hill, never to a freestanding lake island.
  const sunsetShore = new THREE.Group(); sunsetShore.name = '夕照山岸 · 与陆地相连'; group.add(sunsetShore);
  addMesh(sunsetShore, new THREE.CylinderGeometry(21, 23, 2.2, 64), grass, [0, -0.3, -28]);
  addMesh(sunsetShore, new THREE.BoxGeometry(42, 2.2, 57), grass, [0, -0.3, -56.5]);
  const wooded = mat('#405e43');
  for (let i = 0; i < 48; i++) {
    const x = (rand() - 0.5) * 35, z = -38 - rand() * 42;
    if (Math.hypot(x, z + 28) < 13) continue;
    const height = 3.3 + rand() * 2.6;
    addMesh(sunsetShore, new THREE.CylinderGeometry(0.12, 0.21, height, 7), bark, [x, 0.8 + height / 2, z]);
    for (let j = 0; j < 3; j++) addMesh(sunsetShore, new THREE.IcosahedronGeometry(1, 1), wooded, [x + (rand() - 0.5) * 1.8, height + 0.3 + rand(), z + (rand() - 0.5) * 1.8], [1.7 + rand(), 1.5 + rand(), 1.7 + rand()]);
  }
  addMesh(group, new THREE.BoxGeometry(6.1, 1.3, 7), stone, [-7, 0.07, -5.5]);
  for (let i = 0; i < 90; i++) {
    const x = -178 + i * 4;
    addMesh(group, new THREE.BoxGeometry(3.8, 0.48, 0.8), seams, [x, 0.22, 10]);
    addMesh(group, new THREE.BoxGeometry(0.025, 0.015, 4.1), seams, [x, XIHU_PAVING_Y + 0.008, 13]);
  }
  // Forested, rounded Jiangnan hills rather than Huangshan-like spires.
  for (let row = 0; row < 3; row++) for (let i = 0; i < 10; i++) {
    const hillGeometry = new THREE.SphereGeometry(1, 30, 20);
    const hillPositions = hillGeometry.getAttribute('position');
    for (let v = 0; v < hillPositions.count; v++) { const x = hillPositions.getX(v), y = hillPositions.getY(v), z = hillPositions.getZ(v); const r = 1 + Math.sin(x * 8 + i) * Math.sin(z * 7 + row) * 0.09 + Math.sin(x * 17 + z * 13) * 0.025; hillPositions.setXYZ(v, x * r, y * r, z * r); } hillGeometry.computeVertexNormals();
    const hill = addMesh(group, hillGeometry, mat(row === 0 ? '#617661' : row === 1 ? '#748c7f' : '#91a59a'), [-150 + i * 33 + row * 8, -6, -75 - row * 40], [24 + rand() * 16, 16 + rand() * 14, 28 + rand() * 17]);
    hill.name = '江南缓丘';
  }
  const bridge = new THREE.Group(); bridge.name = '断桥 · 低弧单孔石桥'; group.add(bridge);
  const side = new THREE.Shape(); side.moveTo(-2, 0.08);
  for (let i = 0; i <= 36; i++) { const z = -2 + i * 0.5; side.lineTo(z, bridgeY(z)); }
  side.lineTo(16, 0.08); side.lineTo(13.5, 0.08);
  for (let i = 0; i <= 30; i++) { const z = 13.5 - i * 13 / 30; side.lineTo(z, 0.08 + 1.45 * Math.sin(Math.PI * (z - 0.5) / 13)); }
  side.lineTo(-2, 0.08);
  const bridgeGeo = new THREE.ExtrudeGeometry(side, { depth: 6, bevelEnabled: false, curveSegments: 32 });
  const bridgeMesh = addMesh(bridge, bridgeGeo, stone, [-10, 0, 0]); bridgeMesh.rotation.y = -Math.PI / 2;
  // Shape x maps to +z, extrusion to -x after rotation: start at -4, not -10.
  bridgeMesh.position.x = -4;
  for (let i = 0; i <= 36; i++) {
    const z = -2 + i * 0.5, y = bridgeY(z);
    addMesh(bridge, new THREE.BoxGeometry(5.9, 0.012, 0.025), seams, [-7, y + 0.008, z]);
  }
  for (const x of [-9.9, -4.1]) for (let i = 0; i <= 12; i++) {
    const z = -2 + i * 1.5, y = bridgeY(z);
    addMesh(bridge, new THREE.BoxGeometry(0.23, 1.12, 0.23), stone, [x, y + 0.56, z]);
    addMesh(bridge, new THREE.SphereGeometry(0.18, 8, 6), pale, [x, y + 1.16, z]);
    if (i < 12) for (const h of [0.32, 0.85]) rod(bridge, new THREE.Vector3(x, y + h, z), new THREE.Vector3(x, bridgeY(z + 1.5) + h, z + 1.5), 0.075, stone);
  }
  const pagoda = new THREE.Group(); pagoda.name = '雷峰塔 · 五层八面'; pagoda.position.set(0, 0.8, -28); group.add(pagoda);
  addMesh(pagoda, new THREE.CylinderGeometry(8.7, 9.3, 1.15, 8), stone, [0, 0.575, 0]);
  for (let level = 0; level < 5; level++) {
    const radius = 5.2 - level * 0.43, y = 1.15 + level * 4.1;
    const story = new THREE.Group(); story.name = `雷峰塔第${level + 1}层`; pagoda.add(story);
    addMesh(story, new THREE.CylinderGeometry(radius * 0.84, radius * 0.84, 3.15, 8), pale, [0, y + 1.57, 0]);
    addMesh(story, new THREE.CylinderGeometry(radius + 0.35, radius + 0.35, 0.2, 8), timber, [0, y + 0.12, 0]);
    for (let face = 0; face < 8; face++) {
      const a = face * Math.PI / 4 + Math.PI / 8, r = radius * 0.84 * Math.cos(Math.PI / 8);
      const window = addMesh(story, new THREE.BoxGeometry(radius * 0.58, 1.9, 0.1), timber, [Math.sin(a) * r, y + 1.9, Math.cos(a) * r]); window.rotation.y = a;
      for (let s = -2; s <= 2; s++) {
        const slit = addMesh(story, new THREE.BoxGeometry(0.055, 1.72, 0.12), pale, [Math.sin(a) * (r + 0.07) + Math.cos(a) * s * radius * 0.1, y + 1.9, Math.cos(a) * (r + 0.07) - Math.sin(a) * s * radius * 0.1]); slit.rotation.y = a;
      }
      const corner = face * Math.PI / 4;
      addMesh(story, new THREE.CylinderGeometry(0.1, 0.12, 3.2, 8), timber, [Math.sin(corner) * radius, y + 1.6, Math.cos(corner) * radius]);
      const next = corner + Math.PI / 4;
      for (const h of [0.52, 0.92]) rod(story, new THREE.Vector3(Math.sin(corner) * radius, y + h, Math.cos(corner) * radius), new THREE.Vector3(Math.sin(next) * radius, y + h, Math.cos(next) * radius), 0.055, timber);
    }
    // Flared octagonal eaves: lower lip, shallow roof slope and eight curved hips.
    const roofR = radius + 1.05;
    addMesh(story, new THREE.CylinderGeometry(radius * 0.67, roofR, 1.25, 8, 1, true), roof, [0, y + 3.48, 0]);
    addMesh(story, new THREE.CylinderGeometry(roofR, roofR, 0.13, 8), roof, [0, y + 2.9, 0]);
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, point = (r: number, h: number) => new THREE.Vector3(Math.sin(a) * r, h, Math.cos(a) * r);
      branch(story, [point(radius * 0.67, y + 4.1), point(radius, y + 3.15), point(roofR + 0.15, y + 3.14)], 0.075, roof, 10);
    }
  }
  addMesh(pagoda, new THREE.CylinderGeometry(0.05, 0.58, 3.7, 12), timber, [0, 23, 0]);
  for (let i = 0; i < 5; i++) addMesh(pagoda, new THREE.TorusGeometry(0.45 - i * 0.06, 0.045, 6, 16), pale, [0, 21.9 + i * 0.45, 0]).rotation.x = Math.PI / 2;
  // Willow limbs and hanging leaf sprays have independent, restrained wind phases.
  const willowCrowns: THREE.Group[] = [];
  for (let i = 0; i < 20; i++) {
    const x = -106 + i * 11.3; if (Math.abs(x + 7) < 11) continue;
    const tree = new THREE.Group(); tree.position.set(x, 0.6, 11.3 + rand() * 7); tree.name = '垂柳'; group.add(tree);
    branch(tree, [new THREE.Vector3(), new THREE.Vector3(0.2, 2.6, 0), new THREE.Vector3(-0.35, 5.1, 0.2), new THREE.Vector3(0.2, 6.6, 0)], 0.2, bark, 12);
    const crown = new THREE.Group(); crown.userData.landscapeDynamic = true; tree.add(crown); willowCrowns.push(crown);
    const leafPositions: THREE.Vector3[] = [];
    for (let j = 0; j < 68; j++) {
      const a = j * 2.399, r = 2.1 + rand() * 2.1, y = 4.8 + rand() * 1.6;
      const start = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      branch(crown, [new THREE.Vector3(0, 5.3, 0), start.clone().multiplyScalar(0.6).add(new THREE.Vector3(0, 2, 0)), start], 0.025, bark, 5, 3);
      for (let n = 2; n < 8; n++) leafPositions.push(new THREE.Vector3(0, 5.3, 0).lerp(start, n / 8).add(new THREE.Vector3((rand() - 0.5) * 0.45, rand() * 0.4, (rand() - 0.5) * 0.45)));
      const end = start.clone().add(new THREE.Vector3(Math.cos(a) * 0.35, -3.5 - rand(), Math.sin(a) * 0.35));
      branch(crown, [start, start.clone().lerp(end, 0.5).add(new THREE.Vector3(0.2, 0, 0)), end], 0.012, bark, 4, 3);
      for (let k = 0; k < 22; k++) leafPositions.push(start.clone().lerp(end, k / 22).add(new THREE.Vector3(Math.sin(k * 1.3) * 0.08, 0, Math.cos(k * 1.3) * 0.08)));
    }
    const leafShape = new THREE.Shape(); leafShape.moveTo(0, 1); leafShape.lineTo(0.34, 0.15); leafShape.lineTo(0, -1); leafShape.lineTo(-0.34, 0.15); leafShape.closePath();
    const foliage = new THREE.InstancedMesh(new THREE.ShapeGeometry(leafShape, 1), mat('#64814e', { side: THREE.DoubleSide }), leafPositions.length); const dummy = new THREE.Object3D();
    leafPositions.forEach((p, index) => { dummy.position.copy(p); dummy.scale.set(0.22, 0.29, 1); dummy.rotation.y = index * 2.399; dummy.rotation.z = (index % 2 ? 1 : -1) * 0.45; dummy.updateMatrix(); foliage.setMatrixAt(index, dummy.matrix); }); crown.add(foliage); compactLandscape(crown);
  }
  const lotus = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 14, 0.15, Math.PI * 1.92), mat('#5a7850', { side: THREE.DoubleSide }), 240); lotus.name = '荷叶';
  const flower = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), mat('#d4a6a1'), 150); flower.name = '荷花';
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 240; i++) {
    const x = (i < 120 ? -1 : 1) * (15 + rand() * 34), z = 2 + rand() * 7;
    dummy.position.set(x, 0.13 + rand() * 0.09, z); dummy.rotation.set(-Math.PI / 2 + rand() * 0.08, rand() * 0.1, rand() * 6); dummy.scale.setScalar(0.33 + rand() * 0.4); dummy.updateMatrix(); lotus.setMatrixAt(i, dummy.matrix);
    if (i < 30) for (let p = 0; p < 5; p++) { const a = p * Math.PI * 0.4; dummy.position.set(x + Math.cos(a) * 0.12, 0.42, z + Math.sin(a) * 0.12); dummy.rotation.set(Math.cos(a) * 0.6, a, Math.sin(a) * 0.6); dummy.scale.set(0.12, 0.22, 0.075); dummy.updateMatrix(); flower.setMatrixAt(i * 5 + p, dummy.matrix); }
  }
  group.add(lotus, flower);
  function person(name: string, color: string, x: number, z: number, female = false, monk = false): THREE.Group {
    const p = new THREE.Group(); p.name = name; p.position.set(x, xihuGroundY(x, z), z); group.add(p);
    const cloth = mat(color), skin = mat('#c8a181');
    addMesh(p, new THREE.CylinderGeometry(0.18, female ? 0.23 : 0.31, female ? 0.48 : 1.25, 12), cloth, [0, female ? 1.115 : 0.73, 0]);
    if (female) p.add(whiteSerpent());
    addMesh(p, new THREE.SphereGeometry(0.19, 12, 9), skin, [0, 1.53, 0]);
    if (!monk) addMesh(p, new THREE.SphereGeometry(0.19, 10, 7), mat('#2c302b'), [0, 1.64, -0.04], [1, 0.65, 1]).name = '发髻';
    if (female) addMesh(p, new THREE.SphereGeometry(0.13, 9, 7), mat('#2c302b'), [0, 1.81, -0.06]);
    const hair = mat('#2c302b'), trim = mat(female ? '#c8cdba' : '#b9c8bb');
    addMesh(p, new THREE.SphereGeometry(0.05, 7, 5), skin, [0, 1.53, 0.175], [0.7, 0.9, 0.7]);
    for (const side of [-1, 1]) {
      addMesh(p, new THREE.SphereGeometry(0.014, 6, 4), hair, [side * 0.064, 1.57, 0.173]);
      if (!female) addMesh(p, new THREE.BoxGeometry(0.13, 0.09, 0.25), hair, [side * 0.11, 0.045, 0.07]).name = '布鞋';
      addMesh(p, new THREE.SphereGeometry(0.04, 7, 5), skin, [side * 0.18, 1.52, 0], [0.5, monk ? 1.4 : 1, 0.8]);
      rod(p, new THREE.Vector3(side * 0.18, 1.25, 0), new THREE.Vector3(side * 0.27, 0.97, 0.06), 0.1, cloth);
      rod(p, new THREE.Vector3(side * 0.27, 0.97, 0.06), new THREE.Vector3(side * 0.23, 0.92, 0.23), 0.085, cloth);
      addMesh(p, new THREE.SphereGeometry(0.055, 8, 6), skin, [side * 0.23, 0.92, 0.24]);
      rod(p, new THREE.Vector3(side * 0.12, 1.35, 0.12), new THREE.Vector3(-side * 0.08, 1.09, 0.2), 0.018, trim);
    }
    for (let fold = -2; fold <= 2; fold++) rod(p, new THREE.Vector3(fold * 0.055, 0.99, 0.18), new THREE.Vector3(fold * (female ? 0.04 : 0.1), female ? 0.9 : 0.14, female ? 0.21 : 0.25), 0.009, trim);
    addMesh(p, new THREE.TorusGeometry(0.205, 0.025, 6, 16), trim, [0, 1.04, 0]).rotation.x = Math.PI / 2;
    return p;
  }
  const white = person('白娘子 · 断桥同伞', '#e2e1d1', -7.32, 8, true);
  const scholar = person('许仙 · 断桥同伞', '#7a9b9c', -6.7, 8);
  for (const [character, id] of [[white, 'xihu-white-snake'], [scholar, 'xihu-xuxian']] as const) {
    compactLandscape(character); character.userData.landscapeDynamic = true; character.userData.encounterId = id;
  }
  const umbrella = new THREE.Group(); umbrella.name = '同撑油纸伞'; umbrella.position.set(-7, bridgeY(8), 8); group.add(umbrella);
  rod(umbrella, new THREE.Vector3(0, 0.9, 0), new THREE.Vector3(0, 2.35, 0), 0.025, timber);
  addMesh(umbrella, new THREE.ConeGeometry(1.22, 0.38, 20, 1, true), mat('#cbb58a', { side: THREE.DoubleSide }), [0, 2.28, 0]);
  for (let i = 0; i < 20; i++) { const a = i * Math.PI / 10; rod(umbrella, new THREE.Vector3(0, 2.47, 0), new THREE.Vector3(Math.cos(a) * 1.22, 2.09, Math.sin(a) * 1.22), 0.009, timber); }
  const monk = person('法海 · 远处南屏岸', '#a78352', -62, 17, false, true); dressMonk(monk);
  compactLandscape(monk);
  const pavilion = new THREE.Group(); pavilion.name = '南屏钟亭 · 意象'; pavilion.position.set(-66, 0.6, 22); group.add(pavilion);
  addMesh(pavilion, new THREE.BoxGeometry(6, 0.4, 5), stone, [0, 0.2, 0]);
  for (const x of [-2.4, 2.4]) for (const z of [-1.9, 1.9]) addMesh(pavilion, new THREE.CylinderGeometry(0.13, 0.15, 3.8, 8), timber, [x, 2.2, z]);
  addMesh(pavilion, new THREE.ConeGeometry(4.5, 1.6, 4), roof, [0, 4.65, 0]).rotation.y = Math.PI / 4;
  addMesh(pavilion, new THREE.CylinderGeometry(0.5, 0.9, 1.4, 16), mat('#6f7052', { metalness: 0.5 }), [0, 2.8, 0]);
  const boat = new THREE.Group(); boat.name = '湖上摇橹船'; boat.userData.landscapeDynamic = true; group.add(boat);
  addMesh(boat, new THREE.SphereGeometry(1, 18, 9, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), timber, [0, 0.35, 0], [1.1, 0.7, 3.4]);
  addMesh(boat, new THREE.BoxGeometry(1.8, 0.1, 5.1), pale, [0, 0.21, 0]);
  const boatman = person('舟子 · 摇橹', '#8c8170', 24, -5); boat.add(boatman); boatman.position.set(0, 0.25, 1.5);
  const oar = rod(boat, new THREE.Vector3(-0.7, 0.7, 1.4), new THREE.Vector3(-2.8, -0.2, 2.4), 0.055, timber);
  oar.userData.landscapeDynamic = true; compactLandscape(boat);
  compactLandscape(group);
  let latestTime = 0;
  for (const character of [white, scholar]) character.userData.onEncounter = () => { character.userData.greetingUntil = latestTime + 3; };
  registerUpdate(group, time => {
    latestTime = time;
    for (const character of [white, scholar]) character.rotation.y = time < (character.userData.greetingUntil ?? -1) ? Math.sin(time * 2.5) * 0.18 : 0;
    willowCrowns.forEach((crown, i) => { crown.rotation.z = Math.sin(time * 0.7 + i) * 0.015; crown.rotation.x = Math.cos(time * 0.43 + i) * 0.009; });
    const phase = time * 0.012; boat.position.set(24 + Math.sin(phase) * 8, Math.sin(time * 1.25) * 0.045, -8 - (1 - Math.cos(phase)) * 5); boat.rotation.y = Math.atan2(Math.cos(phase) * 8, -Math.sin(phase) * 5); boat.rotation.z = Math.sin(time * 0.7) * 0.015;
    oar.rotation.z = Math.sin(time * 1.2) * 0.12;
  });
  return group;
}









import * as THREE from 'three';
import type { Painting, PaintingId } from '../types';
import { groundHeight } from './terrain';
import { batchStatic } from './resources';

type EasterEggId = PaintingId | 'wuhan';
type Dress = 'robe' | 'dress' | 'coat';
export interface EasterEggPlacement {
  x: number;
  y: number;
  z: number;
  yaw: number;
}
interface Profile {
  color: string;
  colorName: string;
  dress: Dress;
  x: number;
  z: number;
  yaw: number;
  hair: 'bun' | 'long';
}

/** Authored additions requested by the viewer, not figures attributed to the original paintings. */
export const EASTER_EGG_PROFILES: Record<EasterEggId, Profile> = {
  qianli: {
    color: '#a96f61',
    colorName: '赭红',
    dress: 'robe',
    x: -53.5,
    z: 12.8,
    yaw: -0.22,
    hair: 'bun',
  },
  fuchun: {
    color: '#96859b',
    colorName: '烟紫',
    dress: 'robe',
    x: -44,
    z: 7.8,
    yaw: -0.5,
    hair: 'bun',
  },
  xishan: {
    color: '#a48c60',
    colorName: '浅茶',
    dress: 'robe',
    x: -7.4,
    z: 27.3,
    yaw: 0.12,
    hair: 'bun',
  },
  starry: {
    color: '#638b90',
    colorName: '灰青',
    dress: 'dress',
    x: 4.3,
    z: 8.8,
    yaw: 0.1,
    hair: 'long',
  },
  empire: {
    color: '#c2b798',
    colorName: '象牙',
    dress: 'dress',
    x: 15,
    z: -0.3,
    yaw: -0.3,
    hair: 'bun',
  },
  winter: {
    color: '#77748f',
    colorName: '靛紫',
    dress: 'coat',
    x: 11,
    z: 35,
    yaw: 0,
    hair: 'long',
  },
  qingming: {
    color: '#627ba2',
    colorName: '黛蓝',
    dress: 'robe',
    x: -16.9,
    z: 14,
    yaw: 0,
    hair: 'bun',
  },
  zhangjiajie: {
    color: '#82926b',
    colorName: '苔绿',
    dress: 'coat',
    x: -27,
    z: 22.4,
    yaw: 0.25,
    hair: 'long',
  },
  guilin: {
    color: '#b58e96',
    colorName: '藕粉',
    dress: 'dress',
    x: -26,
    z: 22.3,
    yaw: -0.15,
    hair: 'bun',
  },
  wuhan: { color: '#baa35f', colorName: '桂黄', dress: 'coat', x: 0, z: 0, yaw: 0, hair: 'long' },
};

/** Original dialogue for the added visitor; none of these passages is an artist quotation. */
export const ENCOUNTER_TEXT: Record<EasterEggId, { title: string; text: string }> = {
  qianli: {
    title: '桥畔一语',
    text: '我常在桥边看船，早些时候，山是青的，这会儿又添了一点绿。岸上的人家已经亮起灯，我想，走得再远的人，见到这样的光，也会觉得离家近了一些。桥上有风，这里正好歇歇脚。',
  },
  fuchun: {
    title: '江岸闲话',
    text: '屋后的树又长出了一截新枝，我刚才看了许久，才发现。住在江边，日子总有这样细小的变化。你若也喜欢这片水色，便不必急着赶路；傍晚的山影还会慢慢移过来，把岸边照得很柔和。',
  },
  xishan: {
    title: '山脚相逢',
    text: '方才还觉得山高得没有尽头，走到溪边，才看见树后的屋檐。原来这样大的山，也给赶路的人留了一处小小的落脚地。同行的人就在前面，等风轻一点，我们再一同听听远处的水声。',
  },
  starry: {
    title: '窗边的灯',
    text: '镇上的窗灯还没有全熄，有人在收拾晚餐，也有人等着家人回来。我喜欢这个时候，街上安静，天上却十分热闹。那些明亮的弧线像风留下的手迹，仰头看一会儿，连寻常的夜晚也变得柔软了。',
  },
  empire: {
    title: '海湾晚风',
    text: '我记得这片海湾早晨的颜色，浅浅的蓝，和今天几乎一样。岸上的模样会变，山后的光却总会落到水面上。有人曾在这里等一只归船，也有人只是看了一会儿海；那些平常的牵挂，都很值得留下。',
  },
  winter: {
    title: '雪夜微光',
    text: '外衣里还留着屋中的暖意，站在这里，倒不觉得冷。远山的雪映着一点蓝，像夜里没有熄去的微光。我出来时，家人说只看一会儿便回去；可这样安静的山，总让人愿意多陪它片刻。',
  },
  qingming: {
    title: '桥头春日',
    text: '桥头的铺子刚摆好货，河上的船也靠了岸，一早便这样热闹。家里人让我回去时捎些点心，我却又在这里站了一会儿。看看桥上来往的人，便觉得这寻常的一日，也有许多值得慢慢记住的地方。',
  },
  zhangjiajie: {
    title: '松影之间',
    text: '刚才一阵云过去，石峰顶上的小树又露出来了。站在下面看，它们很小，却把这片山衬得格外亲近。溪边有块平坦的石头，我歇脚时听见远鸟叫了两声，像是山里的人轻轻打了个招呼。',
  },
  guilin: {
    title: '一江清影',
    text: '江水静的时候，远山便有了第二个影子。撑筏的人不着急，岸边的竹叶也只是轻轻动一动。我想把这会儿的水色记住，回家讲给没来的人听；说到这里，也许他们就能想见一点江上的风。',
  },
  wuhan: {
    title: '桂香小雨',
    text: '这阵雨很细，桂花的香气倒比晴天更清楚。出门前只想着走一小段，到了树下，又舍不得马上回去。街灯映在湿地上，暖暖的一小片；等雨再轻些，我想带着衣袖里这点秋意，慢慢走回家。',
  },
};

/** Search only a small authored clearing; never silently relocate to an unrelated summit. */
export function findEasterEggPlacement(painting: Painting): EasterEggPlacement | null {
  if (String(painting.id) === 'wuhan') return null;
  const profile = EASTER_EGG_PROFILES[painting.id];
  let selected: EasterEggPlacement | null = null;
  let best = Infinity;
  for (let ring = 0; ring <= 7; ring++) {
    const samples = ring === 0 ? 1 : 16;
    for (let i = 0; i < samples; i++) {
      const angle = (i * Math.PI * 2) / samples;
      const x = profile.x + Math.cos(angle) * ring * 0.38;
      const z = profile.z + Math.sin(angle) * ring * 0.38;
      const y = groundHeight(painting, x, z);
      const footprint = [
        [0, 0],
        [-0.22, 0],
        [0.22, 0],
        [0, -0.22],
        [0, 0.22],
      ].map(([dx, dz]) => groundHeight(painting, x + dx!, z + dz!));
      if (!footprint.every(Number.isFinite) || Math.min(...footprint) < 0.35) continue;
      const relief = Math.max(...footprint) - Math.min(...footprint);
      if (relief > 0.24) continue;
      const score = relief * 6 + ring * 0.055;
      if (score < best) {
        best = score;
        selected = { x, y: y + 0.012, z, yaw: profile.yaw };
      }
    }
  }
  return selected;
}

function fabric(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.96, metalness: 0 });
}

function hemGeometry(style: Dress): THREE.BufferGeometry {
  const coat = style === 'coat';
  const geometry = new THREE.LatheGeometry(
    [
      new THREE.Vector2(coat ? 0.205 : 0.25, 0.11),
      new THREE.Vector2(coat ? 0.2 : 0.24, 0.2),
      new THREE.Vector2(0.205, 0.4),
      new THREE.Vector2(0.175, 0.68),
      new THREE.Vector2(0.155, 0.88),
      new THREE.Vector2(0.14, 1.05),
    ],
    32,
  );
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i),
      z = positions.getZ(i);
    const angle = Math.atan2(z, x);
    const pleat = 1 + Math.sin(angle * 12 + y * 0.6) * (1.05 - y) * 0.042;
    positions.setXYZ(i, x * pleat, y, z * pleat * 0.77);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** A 1.71 m adult silhouette, facing local -Z; the authored viewpoints see her back. */
export function buildEasterEgg(painting: Painting, override?: EasterEggPlacement): THREE.Group {
  const profile = EASTER_EGG_PROFILES[painting.id];
  const placement = override ?? findEasterEggPlacement(painting);
  if (placement && ![placement.x, placement.y, placement.z, placement.yaw].every(Number.isFinite))
    throw new RangeError('彩蛋位置必须是有限坐标');
  const body = new THREE.Group();
  const cloth = fabric(profile.color);
  const seam = fabric(new THREE.Color(profile.color).multiplyScalar(0.77).getStyle());
  const hair = fabric('#2b2927');
  const skin = fabric('#b49a81');
  const shoe = fabric('#423e38');
  const add = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: [number, number, number],
    scale?: [number, number, number],
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    if (scale) mesh.scale.set(...scale);
    body.add(mesh);
    return mesh;
  };
  const limb = (
    from: [number, number, number],
    to: [number, number, number],
    radius: number,
    material: THREE.Material,
  ): void => {
    const a = new THREE.Vector3(...from),
      b = new THREE.Vector3(...to),
      delta = b.clone().sub(a);
    const mesh = add(
      new THREE.CylinderGeometry(radius * 0.82, radius, delta.length(), 9),
      material,
      [0, 0, 0],
    );
    mesh.position.copy(a.addScaledVector(delta, 0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  };

  add(hemGeometry(profile.dress), cloth, [0, 0, 0]);
  add(new THREE.CylinderGeometry(0.185, 0.145, 0.42, 14), cloth, [0, 1.18, 0], [1, 1, 0.66]);
  add(new THREE.CylinderGeometry(0.06, 0.075, 0.11, 10), skin, [0, 1.43, 0]);
  add(new THREE.SphereGeometry(1, 12, 9), hair, [0, 1.555, 0], [0.112, 0.145, 0.105]);
  if (profile.hair === 'bun') add(new THREE.SphereGeometry(0.046, 10, 7), hair, [0, 1.66, 0.061]);
  else add(new THREE.SphereGeometry(1, 12, 8), hair, [0, 1.43, 0.071], [0.105, 0.16, 0.046]);
  // Unadorned back collar, narrow waist seam and long, quiet sleeves.
  const collar = new THREE.TorusGeometry(0.077, 0.015, 5, 16);
  collar.rotateX(Math.PI / 2);
  add(collar, seam, [0, 1.385, 0]);
  add(new THREE.CylinderGeometry(0.15, 0.151, 0.035, 18), seam, [0, 0.99, 0], [1, 1, 0.78]);
  for (const side of [-1, 1]) {
    limb(
      [side * 0.16, 1.34, 0],
      [side * 0.215, 1.14, 0.025],
      profile.dress === 'robe' ? 0.075 : 0.06,
      cloth,
    );
    limb(
      [side * 0.215, 1.14, 0.025],
      [side * 0.19, 0.94, 0.045],
      profile.dress === 'robe' ? 0.068 : 0.049,
      cloth,
    );
    add(new THREE.SphereGeometry(1, 8, 6), skin, [side * 0.19, 0.91, 0.045], [0.031, 0.057, 0.026]);
    let footY = 0.035;
    if (placement && !override) {
      const x = placement.x + Math.cos(placement.yaw) * side * 0.075;
      const z = placement.z - Math.sin(placement.yaw) * side * 0.075;
      footY += groundHeight(painting, x, z) + 0.012 - placement.y;
    }
    add(
      new THREE.SphereGeometry(1, 9, 6),
      shoe,
      [side * 0.075, footY, -0.025],
      [0.043, 0.035, 0.105],
    );
  }
  // A few thin seams provide close-range cloth structure without bright outlines.
  for (const x of [-0.1, 0, 0.1]) {
    const points = [
      new THREE.Vector3(x * 0.7, 0.96, 0.119),
      new THREE.Vector3(x, 0.55, 0.145),
      new THREE.Vector3(x * 1.45, 0.16, 0.174),
    ];
    add(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 8, 0.003, 4, false),
      seam,
      [0, 0, 0],
    );
  }
  const figure = batchStatic(body);
  figure.name = 'Quiet visitor';
  figure.visible = placement !== null;
  if (placement) {
    figure.position.set(placement.x, placement.y, placement.z);
    figure.rotation.y = placement.yaw;
  }
  figure.userData = {
    isEncounter: true,
    kind: 'hidden-visitor',
    paintingId: painting.id,
    adult: true,
    color: profile.color,
    colorName: profile.colorName,
    facing: 'away',
    authoredAddition: true,
    placementPending: placement === null,
    discoveryRadius: 5,
    discoveryPosition: placement ? [placement.x, placement.y + 1.1, placement.z] : null,
  };
  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 1.76, 0.48),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    }),
  );
  hitbox.name = 'Encounter hit area';
  hitbox.position.y = 0.85;
  hitbox.userData.isEncounter = true;
  hitbox.userData.isHitbox = true;
  figure.add(hitbox);
  figure.traverse((object) => {
    if (object instanceof THREE.Mesh && !object.userData.isHitbox) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return figure;
}

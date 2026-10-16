import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seededRandom } from './math';

/** Unequal fractured polygon rings, leaning ice walls, and a sloping broken crown. */
export function arcticIceGeometry(seed: number, width: number, height: number, depth: number): THREE.BufferGeometry {
  const rand = seededRandom(seed), sides = 9, levels = 5;
  const positions: number[] = [], indices: number[] = [], colors: number[] = [], uvs: number[] = [];
  const angles=Array.from({length:sides},(_,i)=>i/sides*Math.PI*2+(rand()-.5)*.25);
  const radii=angles.map(()=>.76+rand()*.3);
  const crowns=angles.map((angle)=>.57+rand()*.32+Math.sin(angle+seed)*.21);
  const leanX=(rand()-.5)*width*.45, leanZ=(rand()-.5)*depth*.5;
  for(let level=0;level<levels;level++) {
    const t=level/(levels-1), taper=1-t*.26;
    for(let side=0;side<sides;side++) {
      const angle=angles[side]!, radius=radii[side]!*(1+(level===1?.1:0));
      const x=Math.cos(angle)*width*.5*radius*taper+leanX*t;
      const z=Math.sin(angle)*depth*.5*radius*taper+leanZ*t;
      const y=-2+t*height*(.72+crowns[side]!*.25)+(level===levels-1?(crowns[side]!-.8)*height*.35:0);
      positions.push(x,y,z); uvs.push(side/sides,t);
      const shade=new THREE.Color().lerpColors(new THREE.Color('#75b9d2'),new THREE.Color('#f4fbfc'),Math.min(.96,.18+t*.72+(rand()-.5)*.12));
      colors.push(shade.r,shade.g,shade.b);
      if(level<levels-1) {
        const a=level*sides+side,b=level*sides+(side+1)%sides,c=a+sides,d=b+sides;
        indices.push(a,c,b,b,c,d);
      }
    }
  }
  for(let side=1;side<sides-1;side++) indices.push((levels-1)*sides,(levels-1)*sides+side+1,(levels-1)*sides+side);
  const indexed=new THREE.BufferGeometry(); indexed.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); indexed.setAttribute('color',new THREE.Float32BufferAttribute(colors,3)); indexed.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2)); indexed.setIndex(indices);
  const geometry=indexed.toNonIndexed(); indexed.dispose(); geometry.computeVertexNormals(); return geometry;
}

/** Continuous sloping ice mass behind the fractured terminus, not isolated crystal towers. */
export function glacierSheetGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(330, 125, 80, 38); geometry.rotateX(-Math.PI / 2); geometry.translate(0, 0, -128);
  const p = geometry.attributes.position, colors: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), inland = THREE.MathUtils.smoothstep(-z, 64, 154);
    const ridge = 5 * Math.sin(x * .025 + .8) + 2.5 * Math.sin(x * .09 + z * .03) + 1.5 * Math.sin(x*.21+z*.15);
    p.setY(i, -2 + inland * (29 + ridge));
    const c = new THREE.Color('#74aec4').lerp(new THREE.Color('#d8e9ed'), inland * .65 + .15); colors.push(c.r,c.g,c.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
}

/** u follows the lower edge, v is height: never use a Frenet tube frame for sky curtains. */
export function arcticAuroraGeometry(curve: THREE.Curve<THREE.Vector3>, height: number, segments = 144): THREE.BufferGeometry {
  const positions: number[] = [], uv: number[] = [], indices: number[] = [], rows = 12;
  for (let i = 0; i <= segments; i++) {
    const u = i / segments, base = curve.getPoint(u);
    for (let j = 0; j <= rows; j++) { const v = j / rows; positions.push(base.x, base.y + v * height, base.z); uv.push(u, v); }
    if (i < segments) for (let j = 0; j < rows; j++) { const a = i * (rows + 1) + j; indices.push(a, a + rows + 1, a + 1, a + 1, a + rows + 1, a + rows + 2); }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

/** Merge siblings only: head/leg/paw group transforms stay independently animatable. */
export function mergeArcticMeshes(root: THREE.Group): void {
  const parents: THREE.Object3D[] = []; root.traverse(object => { if (object.children.length) parents.push(object); });
  const removed = new Set<THREE.BufferGeometry>();
  for (const parent of parents) {
    const materials = new Map<THREE.Material, THREE.Mesh[]>();
    for (const child of parent.children) {
      if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh || Array.isArray(child.material) || child.children.length) continue;
      const bucket = materials.get(child.material) ?? []; bucket.push(child); materials.set(child.material, bucket);
    }
    for (const [material, meshes] of materials) {
      if (meshes.length < 2) continue;
      const parts = meshes.map(mesh => { mesh.updateMatrix(); const transformed = mesh.geometry.clone().applyMatrix4(mesh.matrix); const part = transformed.index ? transformed.toNonIndexed() : transformed; if (part !== transformed) transformed.dispose(); return part; });
      const merged = mergeGeometries(parts); parts.forEach(part => part.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, material); mesh.name = `${parent.name || 'arctic'} material batch`; mesh.castShadow = meshes.some(m => m.castShadow); mesh.receiveShadow = meshes.some(m => m.receiveShadow); parent.add(mesh);
      meshes.forEach(source => { removed.add(source.geometry); source.removeFromParent(); });
    }
  }
  root.traverse(object => { if (object instanceof THREE.Mesh) removed.delete(object.geometry); }); removed.forEach(geometry => geometry.dispose());
}


import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seededRandom } from './math';
import { disposeObject } from './resources';
import { roadsterTrack } from './roadsterMotion';
const BASE = `${import.meta.env.BASE_URL}assets/neon/`;
/** Explicitly licensed Neon Zenith facade/shop modules. WebGL atlas port of its TSL kit shaders. */
function kitMaterial(atlas: THREE.Texture, shop: boolean) {
  const material = new THREE.MeshStandardMaterial({
    color: '#b9b8c6',
    roughness: 0.66,
    side: THREE.DoubleSide,
  });
  Object.assign(material, { neonAtlas: atlas });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.nzAtlas = { value: atlas };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec4 _mat; attribute vec4 _col; varying vec4 nzMat; varying vec4 nzCol; varying vec2 nzUV;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nnzMat=_mat;nzCol=_col;nzUV=uv;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform sampler2D nzAtlas; varying vec4 nzMat; varying vec4 nzCol; varying vec2 nzUV;',
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
      vec2 nuv=vec2(fract(nzUV.x),(fract(nzUV.y)+max(0.,floor(nzMat.x+.1)))/${shop ? '4.' : '1.'});
      vec3 na=nzMat.x<0.?vec3(1.):texture2D(nzAtlas,nuv).rgb;
      diffuseColor.rgb*=na${shop ? '' : '*nzCol.rgb'};
    `,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
      float lit=${shop ? 'step(.5,nzMat.w)*step(nzMat.w,1.5)' : 'step(.5,nzMat.z)*step(nzMat.z,1.5)'};
      float signGlow=${shop ? 'step(1.5,nzMat.w)' : '0.'};
      totalEmissiveRadiance += na*(lit*vec3(.85,.64,.4)*.9+signGlow*.9+vec3(.08,.11,.15));
    `,
      );
  };
  material.customProgramCacheKey = () => `neon-kit-${shop}`;
  return material;
}
function floatGeometry(mesh: THREE.Mesh) {
  const g = mesh.geometry.clone();
  for (const [name, a] of Object.entries(g.attributes)) {
    const data = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++)
      for (let j = 0; j < a.itemSize; j++) data[i * a.itemSize + j] = a.getComponent(i, j);
    g.setAttribute(name, new THREE.BufferAttribute(data, a.itemSize));
  }
  g.applyMatrix4(mesh.matrixWorld);
  return g;
}
export function buildRoadsterNeonCity(owner: THREE.Material) {
  let disposed = false;
  owner.addEventListener('dispose', () => {
    disposed = true;
  });
  const collisionBoxes: { x: number; z: number; w: number; d: number; a: number }[] = [];
  const group = new THREE.Group();
  group.name = 'Neon Zenith · licensed Hong Kong facade and shop kits';
  let loaded = false;
  const ready = async () => {
    if (loaded) return;
    loaded = true;
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const textures = new THREE.TextureLoader();
    const [shops, facade, shopAtlas, facadeAtlas, farAtlas] = await Promise.all([
      loader.loadAsync(BASE + 'models/shops.glb'),
      loader.loadAsync(BASE + 'models/kit_proc.glb'),
      textures.loadAsync(BASE + 'tex/shopkit_albedo.webp'),
      textures.loadAsync(BASE + 'tex/kit_proc_albedo.webp'),
      textures.loadAsync(BASE + 'tex/facade_albedo.webp'),
    ]);
    if (disposed) {
      disposeObject(shops.scene);
      disposeObject(facade.scene);
      [shopAtlas, facadeAtlas, farAtlas].forEach((t) => t.dispose());
      return;
    }
    for (const t of [shopAtlas, facadeAtlas, farAtlas]) {
      t.flipY = false;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
    }
    // Distant atlas is sampled below a few hundred screen pixels; halve it to save 24 MiB on phones.
    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = 512;
    atlasCanvas.height = 4096;
    atlasCanvas.getContext('2d')!.drawImage(farAtlas.image, 0, 0, 512, 4096);
    (farAtlas as THREE.Texture).image = atlasCanvas;
    farAtlas.needsUpdate = true;
    const shopMat = kitMaterial(shopAtlas, true),
      facMat = kitMaterial(facadeAtlas, false);
    const shopsGeo: THREE.BufferGeometry[] = [],
      facadeGeo: THREE.BufferGeometry[] = [];
    shops.scene.updateMatrixWorld(true);
    facade.scene.updateMatrixWorld(true);
    const mods: THREE.Mesh[] = [];
    shops.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) mods.push(o);
    });
    const cells: THREE.Mesh[] = [];
    facade.scene.traverse((o) => {
      if (o instanceof THREE.Mesh && /^L1_[012]_0$/.test(o.name)) cells.push(o);
    });
    const matrix = new THREE.Matrix4(),
      quat = new THREE.Quaternion(),
      scale = new THREE.Vector3(1, 1, 1),
      up = new THREE.Vector3(0, 1, 0);
    const put = (
      mesh: THREE.Mesh,
      x: number,
      y: number,
      z: number,
      angle: number,
      s: THREE.Vector3,
      list: THREE.BufferGeometry[],
    ) => {
      const geo = floatGeometry(mesh);
      quat.setFromAxisAngle(up, angle);
      matrix.compose(new THREE.Vector3(x, y, z), quat, s);
      geo.applyMatrix4(matrix);
      list.push(geo);
    };
    for (const side of [-1, 1]) {
      // Actual deeply recessed windows and AC units; 18m of hero detail, cheaper photographic facades beyond.
      for (let col = 0; col < 9; col++)
        for (let floor = 0; floor < 4; floor++) {
          const src = cells[(col + floor) % cells.length];
          if (!src) continue;
          put(
            src,
            side * 10.6,
            4.1 + floor * 3.1,
            10 - col * 3.1,
            side < 0 ? Math.PI / 2 : -Math.PI / 2,
            scale,
            facadeGeo,
          );
        }
      for (let k = 0; k < 12; k++) {
        const src = mods[k % mods.length]!;
        const geo = floatGeometry(src);
        geo.computeBoundingBox();
        const width = geo.boundingBox!.max.x - geo.boundingBox!.min.x;
        geo.dispose();
        put(
          src,
          side * 10.5,
          0.85,
          11 - k * 2.65,
          side < 0 ? Math.PI / 2 : -Math.PI / 2,
          new THREE.Vector3(2.65 / width, 1.2, 1),
          shopsGeo,
        );
      }
    }
    for (const [geometries, material] of [
      [shopsGeo, shopMat],
      [facadeGeo, facMat],
    ] as const) {
      const merged = mergeGeometries(geometries);
      geometries.forEach((g) => g.dispose());
      if (merged) {
        const m = new THREE.Mesh(merged, material);
        m.receiveShadow = true;
        group.add(m);
      }
    }
    const towerMat = new THREE.MeshStandardMaterial({ color: '#a5adbb', roughness: 0.72 });
    Object.assign(towerMat, { neonAtlas: farAtlas });
    towerMat.onBeforeCompile = (shader) => {
      shader.uniforms.nzFacade = { value: farAtlas };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 nzP;varying vec3 nzN;')
        .replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nnzP=(instanceMatrix*vec4(position,1.)).xyz;nzN=normal;',
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nuniform sampler2D nzFacade;varying vec3 nzP;varying vec3 nzN;',
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
        float layer=mod(floor(abs(nzP.x)/19.)+floor(abs(nzP.z)/23.),6.);
        vec2 face=abs(nzN.x)>.5?nzP.zy:nzP.xy;
        vec2 uv=vec2(fract(face.x/14.),(fract(face.y/15.)+layer)/8.);
        vec3 a=texture2D(nzFacade,uv).rgb;
        diffuseColor.rgb*=mix(a,vec3(.16,.2,.26),step(.5,abs(nzN.y)));
      `,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
        vec2 cell=floor(face/vec2(2.5,3.));float rnd=fract(sin(dot(cell,vec2(31.2,97.6)))*43758.5453);
        vec2 f=fract(face/vec2(2.5,3.));float win=step(.18,f.x)*step(f.x,.7)*step(.25,f.y)*step(f.y,.72)*step(.64,rnd)*(1.-step(.5,abs(nzN.y)));
        totalEmissiveRadiance+=a*.13+win*mix(vec3(.1,.28,.4),vec3(.55,.3,.12),step(.85,rnd))*.55;
      `,
        );
    };
    towerMat.customProgramCacheKey = () => 'neon-licensed-photographic-facades';
    const rng = seededRandom(7701),
      boxes: { x: number; y: number; z: number; w: number; h: number; d: number; a: number }[] = [];
    for (const side of [-1, 1])
      for (let i = -6; i < 16; i++) {
        const w = 8 + rng() * 10,
          h = 20 + rng() * 42,
          track = roadsterTrack(i * 14 - 18),
          offset = side * (16 + w / 2 + (i % 3 === 0 ? 12 : 0));
        const x = track.position[0] + Math.cos(track.heading) * offset,
          z = track.position[2] - Math.sin(track.heading) * offset,
          a = track.heading;
        boxes.push({ x, y: 0.8 + h / 2, z, w, h, d: 12, a });
        collisionBoxes.push({ x, z, w, d: 12, a });
        if (i % 2 === 0)
          boxes.push({ x: x + side * 2, y: 0.8 + h + 6, z: z + 1, w: w * 0.64, h: 12, d: 9, a });
        if (i >= 0 && i < 3) {
          boxes.push({ x: side * 16, y: 8.8, z: 11 - i * 12, w: 10, h: 16, d: 12, a: 0 });
          collisionBoxes.push({ x: side * 16, z: 11 - i * 12, w: 10, d: 12, a: 0 });
        }
      }

    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(), towerMat, boxes.length);
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i]!;
      matrix.compose(
        new THREE.Vector3(b.x, b.y, b.z),
        new THREE.Quaternion().setFromAxisAngle(up, b.a),
        new THREE.Vector3(b.w, b.h, b.d),
      );
      inst.setMatrixAt(i, matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);
    // Suspended cables and projecting signboards create a street, not isolated skyline boxes.
    const cable = new THREE.MeshStandardMaterial({ color: '#1e222c', roughness: 0.8 });
    const cableParts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 4; k++) {
      const z = 8 - k * 16,
        curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-10, 8 + k * 0.7, z),
          new THREE.Vector3(0, 6.5 + k * 0.7, z + 0.5),
          new THREE.Vector3(10, 8 + k * 0.7, z),
        ]);
      cableParts.push(new THREE.TubeGeometry(curve, 16, 0.022, 3, false));
    }
    const cables = mergeGeometries(cableParts);
    cableParts.forEach((g) => g.dispose());
    if (cables) group.add(new THREE.Mesh(cables, cable));
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const names = ['霓虹街道', '九龍電機', '未來車庫', '夜市食堂'];
    const colors = ['#4beaff', '#ff63bd', '#ffbc4b', '#52f4ba'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#111624';
      ctx.fillRect(i * 256, 0, 256, 512);
      ctx.strokeStyle = colors[i]!;
      ctx.lineWidth = 6;
      ctx.strokeRect(i * 256 + 13, 12, 230, 488);
      ctx.fillStyle = colors[i]!;
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      for (let j = 0; j < 4; j++) ctx.fillText(names[i]![j]!, i * 256 + 128, 105 + j * 108);
    }
    const signsTex = new THREE.CanvasTexture(canvas);
    signsTex.colorSpace = THREE.SRGBColorSpace;
    const signMat = new THREE.MeshBasicMaterial({
      map: signsTex,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const signs: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 8; i++) {
      const g = new THREE.BoxGeometry(1.15, 3.2, 0.2);
      const uv = g.getAttribute('uv');
      for (let j = 0; j < uv.count; j++) uv.setX(j, (uv.getX(j) + (i % 4)) / 4);
      g.rotateY(i % 2 ? Math.PI / 2 : -Math.PI / 2);
      g.translate(i % 2 ? 9.5 : -9.5, 6.7, 9 - Math.floor(i / 2) * 13);
      signs.push(g);
    }
    const signGeo = mergeGeometries(signs);
    signs.forEach((g) => g.dispose());
    if (signGeo) group.add(new THREE.Mesh(signGeo, signMat));
    group.userData.assetTriangles = 0;
    group.traverse((o) => {
      if (o instanceof THREE.Mesh)
        group.userData.assetTriangles +=
          ((o.geometry.index?.count ?? o.geometry.getAttribute('position').count) / 3) *
          (o instanceof THREE.InstancedMesh ? o.count : 1);
    });
    disposeObject(shops.scene);
    disposeObject(facade.scene);
    group.userData.loaded = true;
  };
  return {
    group,
    ready,
    collides(x: number, z: number) {
      if (Math.abs(x) > 9.1 && Math.abs(x) < 11.7 && z > -20 && z < 14) return true;
      return collisionBoxes.some((b) => {
        const dx = x - b.x,
          dz = z - b.z,
          c = Math.cos(b.a),
          sn = Math.sin(b.a);
        return (
          Math.abs(dx * c - dz * sn) < b.w / 2 + 1.1 && Math.abs(dx * sn + dz * c) < b.d / 2 + 1.1
        );
      });
    },
  };
}



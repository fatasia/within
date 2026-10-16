import * as THREE from 'three';

export const CHARACTER_ENCOUNTERS: Record<string, string> = {
  'xihu-white-snake': '白娘子：千年修行，不如与你同撑这一把伞。',
  'xihu-xuxian': '许仙：雨停了，伞还给你；再陪我走一段吧。',
  'sakura-boatman': '船夫：落花不必追，下一道弯还有春天。',
  'arctic-bear': '白熊：换你来追我！雪地运动会，下一局开始。',
  'arctic-penguin': '企鹅：这球算我进的！雪球可不算犯规。',
  'roadster-roof-dancer': 'MUSK · 车顶舞蹈彩蛋',
};

/** Pick only visible character subtrees, including asynchronously loaded rigs. */
export function pickCharacter(content: THREE.Object3D, ray: THREE.Raycaster): { id?: string; object: THREE.Object3D } | undefined {
  const roots: THREE.Object3D[] = [];
  content.traverseVisible(object => {
    if (!object.userData.encounterId && object.name !== 'Quiet visitor') return;
    let parent = object.parent;
    while (parent && parent !== content) {
      if (parent.userData.encounterId || parent.name === 'Quiet visitor') return;
      parent = parent.parent;
    }
    roots.push(object);
  });
  for (const root of roots) root.updateWorldMatrix(true, true);
  const hit = ray.intersectObjects(roots, true).find(hit => {
    let object: THREE.Object3D | null = hit.object;
    while (object && object !== content) { if (!object.visible) return false; object = object.parent; }
    return true;
  });
  if (!hit) return;
  let object = hit.object;
  while (object.parent && !object.userData.encounterId && object.name !== 'Quiet visitor') object = object.parent;
  return { id: object.userData.encounterId, object };
}

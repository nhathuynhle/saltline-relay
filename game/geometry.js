import * as T from './vendor/three/three.module.min.js';

const cube = new T.BoxGeometry(1, 1, 1);
const materials = new Map();

export function box(scene, x, y, z, w, h, d, color) {
  if (!materials.has(color)) {
    materials.set(color, new T.MeshStandardMaterial({ color, roughness: .85 }));
  }
  const object = new T.Mesh(cube, materials.get(color));
  object.scale.set(w, h, d);
  object.position.set(x, y, z);
  object.castShadow = object.receiveShadow = true;
  scene.add(object);
  return object;
}

export function lamp(scene, x, y, z, w, h, d, color) {
  const object = box(scene, x, y, z, w, h, d, color);
  object.material = new T.MeshBasicMaterial({ color });
  object.castShadow = false;
  return object;
}

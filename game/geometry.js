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

export function disposeModel(model) {
  const geometries = new Set();
  const ownedMaterials = new Set();
  const sharedMaterials = new Set(materials.values());
  model.traverse(object => {
    if (object.geometry && object.geometry !== cube) geometries.add(object.geometry);
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) {
      if (material && !sharedMaterials.has(material)) ownedMaterials.add(material);
    }
  });
  model.removeFromParent();
  for (const geometry of geometries) geometry.dispose();
  for (const material of ownedMaterials) material.dispose();
  model.clear();
}

import * as T from './vendor/three/three.module.min.js';
import { box, lamp } from './geometry.js';

export function makeGuard(scene, x, z, phase) {
  const model = new T.Group();
  scene.add(model);
  const coat = 0xe97639;
  const armor = 0x343735;
  const visor = 0xffd490;
  const torso = box(model, 0, 1.08, 0, .58, .66, .34, coat);
  torso.material = torso.material.clone();
  const warningLight = lamp(model, 0, 1.94, 0, .25, .13, .25, 0xffc16b);
  warningLight.visible = false;
  const head = box(model, 0, 1.56, 0, .40, .36, .35, armor);
  box(model, 0, 1.59, .183, .32, .14, .035, visor);
  box(model, 0, 1.70, 0, .44, .07, .4, coat);
  box(model, 0, 1.13, .188, .38, .34, .05, armor);
  for (const side of [-1, 1]) box(model, side * .38, 1.03, .07, .16, .43, .20, coat);
  box(model, .29, 1.08, .29, .14, .18, .63, armor);
  const boots = [-1, 1].map(side => box(model, side * .16, .38, 0, .20, .72, .25, armor));
  model.position.set(x, 0, z);
  return { x, z, homeX: x, homeZ: z, phase, model, torso, head, boots, warningLight,
    hp: 100, shot: 1.7 + phase * .24, warning: 0, flash: 0, target: null };
}

export function makeCarbine(scene) {
  const model = new T.Group();
  scene.add(model);
  box(model, .07, -.08, -.35, .17, .14, .62, 0x304745);
  box(model, .07, -.045, -.53, .16, .11, .34, 0xe97846);
  box(model, .07, -.043, -.78, .065, .064, .26, 0x202f2d);
  box(model, .07, -.044, -.90, .10, .088, .10, 0x334845);
  box(model, .07, .004, -.58, .15, .035, .29, 0x607a70);
  box(model, .07, .044, -.67, .045, .056, .035, 0xd5b07c);
  const magazine = box(model, .07, -.182, -.36, .102, .19, .18, 0x162d29);
  magazine.rotation.x = .2;
  const hand = box(model, .105, -.169, -.22, .14, .14, .19, 0x534335);
  hand.rotation.z = -.34;
  box(model, .00, -.14, -.46, .13, .11, .18, 0x806551);
  const flash = new T.Mesh(new T.OctahedronGeometry(.10), new T.MeshBasicMaterial({ color: 0xffba48 }));
  flash.scale.z = 2.7;
  flash.position.set(.07, -.044, -1.04);
  model.add(flash);
  return { model, flash };
}

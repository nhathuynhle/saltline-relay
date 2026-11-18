import * as T from './vendor/three/three.module.min.js';
import { box, lamp } from './geometry.js';

export function buildCoast(scene) {
  const clock = { value: 0 };
  const waves = new T.ShaderMaterial({
    uniforms: { clock },
    vertexShader: `
      varying vec2 sea;
      void main() {
        sea = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: `
      uniform float clock;
      varying vec2 sea;
      void main() {
        vec2 p = sea;
        float chop = sin(p.x * .72 + p.y * .61 + clock * 1.3);
        float swell = sin(p.y * 2.4 + chop + p.x * .21 - clock * 2.1);
        float light = exp(-abs(p.x + 31. + chop * 3.) * .045);
        vec3 c = mix(vec3(.045,.14,.18), vec3(.09,.31,.33), swell * .32 + .45);
        c += pow(max(swell, 0.), 14.) * light * vec3(.38,.20,.10);
        float edge = min(abs(abs(p.x) - 15.), abs(abs(p.y + 0.) - 24.));
        if ((abs(p.x) < 19. && p.y > -26. && p.y < 38.)) {
          float foam = sin(edge * 6. - clock * 1.8 + chop);
          c += pow(max(foam, 0.), 7.) * exp(-edge * 1.35) * vec3(.27,.40,.39);
        }
        gl_FragColor = vec4(mix(c, vec3(.47,.56,.56), smoothstep(34., 157., length(p))), 1.);
        #include <colorspace_fragment>
      }`,
  });
  const water = new T.Mesh(new T.PlaneGeometry(480, 480), waves);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -.81;
  scene.add(water);
  const rockGeometry = new T.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 32; i++) {
    const material = new T.MeshStandardMaterial({ color: i % 3 ? 0x536569 : 0x806e64, flatShading: true });
    const rock = new T.Mesh(rockGeometry, material);
    const side = i % 2 ? 1 : -1;
    rock.position.set(side * (18 + (i * 12.1) % 72), -1.35, -44 - (i * 5.7) % 23);
    rock.scale.set(3.2 + i % 5, 1.2 + i % 4, 3 + i % 3);
    rock.rotation.y = i * .79;
    scene.add(rock);
  }
  const buoys = [[-21, 8], [21, -8], [24, 14], [-25, -20]].map(([x, z], i) => {
    const buoy = new T.Group();
    buoy.position.set(x, 0, z);
    const float = new T.Mesh(new T.CylinderGeometry(.31, .64, .53, 8),
      new T.MeshStandardMaterial({ color: i % 2 ? 0xe99442 : 0xc74c29 }));
    buoy.add(float);
    box(buoy, 0, .49, 0, .10, .54, .10, 0x293535);
    lamp(buoy, 0, .83, 0, .19, .18, .19, 0xffcf87);
    scene.add(buoy);
    return buoy;
  });
  return time => {
    clock.value = time;
    buoys.forEach((buoy, i) => {
      buoy.position.y = -.63 + Math.sin(time * 1.7 + i) * .13;
      buoy.rotation.z = Math.sin(time * 1.35 + i) * .18;
    });
  };
}

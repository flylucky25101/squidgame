import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// World-space grain keeps large surfaces from looking like uniform plastic.
// It works with ordinary and instanced meshes without allocating texture maps.
export function surfaceMaterial(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying vec3 vSurfaceWorld;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `
      #include <worldpos_vertex>
      vec4 surfacePosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        surfacePosition = instanceMatrix * surfacePosition;
      #endif
      vSurfaceWorld = (modelMatrix * surfacePosition).xyz;
    `,
    );
    shader.fragmentShader =
      'varying vec3 vSurfaceWorld;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `
      #include <roughnessmap_fragment>
      float surfaceGrain = fract(sin(dot(floor(vSurfaceWorld * 35.0), vec3(12.9898,78.233,37.719))) * 43758.5453);
      float surfaceMottle = sin(vSurfaceWorld.x * 1.7 + sin(vSurfaceWorld.z * 2.1)) * sin(vSurfaceWorld.y * 1.3 + vSurfaceWorld.z * 0.8);
      diffuseColor.rgb *= 0.97 + surfaceGrain * 0.035 + surfaceMottle * 0.025;
      roughnessFactor = clamp(roughnessFactor + (surfaceGrain - 0.5) * 0.07, 0.08, 1.0);
    `,
    );
  };
  material.customProgramCacheKey = () => 'island-surface-v1';
  return material;
}

export function createPresentation(renderer) {
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const room = new RoomEnvironment();
  const generator = new T.PMREMGenerator(renderer);
  const environment = generator.fromScene(room, 0.06);
  room.dispose();
  generator.dispose();
  const target = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, samples: 2 });
  const composer = new EffectComposer(renderer, target);
  const base = new RenderPass(new T.Scene(), new T.PerspectiveCamera());
  const bloom = new UnrealBloomPass(new T.Vector2(1, 1), 0.16, 0.45, 1.1);
  const output = new OutputPass();
  composer.addPass(base);
  composer.addPass(bloom);
  composer.addPass(output);
  let width = 0,
    height = 0,
    ratio = 0;
  const size = new T.Vector2();
  return {
    environment: environment.texture,
    render(scene, camera, low = false) {
      if (!scene.environment) scene.environment = environment.texture;
      if (low) {
        renderer.render(scene, camera);
        return;
      }
      renderer.getSize(size);
      const pixelRatio = renderer.getPixelRatio();
      if (width !== size.x || height !== size.y || ratio !== pixelRatio) {
        width = size.x;
        height = size.y;
        ratio = pixelRatio;
        composer.setPixelRatio(ratio);
        composer.setSize(width, height);
      }
      base.scene = scene;
      base.camera = camera;
      composer.render();
    },
    dispose() {
      bloom.dispose();
      output.dispose();
      base.dispose();
      composer.dispose();
      environment.dispose();
    },
  };
}

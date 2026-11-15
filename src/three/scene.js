import * as THREE from 'three';

/**
 * Escena 3D mínima de ejemplo. Para cargar modelos (.glb en /public/media/models):
 *   import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
 */
export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 4;

  const mesh = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.8, 0.25, 128, 16),
    new THREE.MeshNormalMaterial()
  );
  scene.add(mesh);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  // Pausa el render cuando el canvas no está visible (ahorra GPU/batería).
  let visible = true;
  const visibility = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  visibility.observe(canvas);

  renderer.setAnimationLoop((t) => {
    if (!visible) return;
    mesh.rotation.x = t * 0.0002;
    mesh.rotation.y = t * 0.0003;
    renderer.render(scene, camera);
  });

  return {
    dispose() {
      renderer.setAnimationLoop(null);
      visibility.disconnect();
      window.removeEventListener('resize', resize);
      mesh.geometry.dispose();
      mesh.material.dispose();
      renderer.dispose();
    },
  };
}

import * as THREE from "three";

export function addCelestialSceneLighting(scene: THREE.Scene): void {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xfff7ed, 3.2);
  keyLight.position.set(-2.0, 2.4, 3.0).normalize();
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.42);
  fillLight.position.set(2.5, -1.5, -1.0).normalize();
  scene.add(fillLight);
}

export function resizeCelestialRenderer(
  camera: THREE.OrthographicCamera,
  renderer: THREE.WebGLRenderer | null,
  width: number,
  height: number
): void {
  camera.left = -width / 2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = -height / 2;
  camera.updateProjectionMatrix();
  renderer?.setSize(width, height, false);
}

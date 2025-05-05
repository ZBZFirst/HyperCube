// cameraSetup.js start
import * as THREE from 'three';

export function setupCamera(container) {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 1.6, 5);
    return camera;
}
// cameraSetup.js end

// cameraManager.js start
import * as THREE from 'three';

let camera;

export function initCamera(cameraInstance) {
    camera = cameraInstance;
}

export function centerCameraOnCube(cube) {
    const targetPosition = cube.position.clone();
    targetPosition.y += 1;
    targetPosition.z += 5;
    camera.position.lerp(targetPosition, 0.1);
    camera.lookAt(cube.position);
}
// cameraManager.js end

// cameraControls.js start
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export function setupCameraControls(camera, renderer) {
    const controls = new PointerLockControls(camera, renderer.domElement);
    const keysPressed = {};
    const velocity = new THREE.Vector3();
    const speed = 5;
    const altitudeSpeed = 3;
    document.addEventListener('click', () => controls.lock());
    document.addEventListener('keydown', (e) => {
        keysPressed[e.key.toLowerCase()] = true;
        if (e.key === ' ' || e.key === 'Control') e.preventDefault();
    });
    
    document.addEventListener('keyup', (e) => {
        keysPressed[e.key.toLowerCase()] = false;
    });

    function update(delta) {
        velocity.set(0, 0, 0);
        if (keysPressed['w']) velocity.z -= speed * delta;
        if (keysPressed['s']) velocity.z += speed * delta;
        if (keysPressed['a']) velocity.x -= speed * delta;
        if (keysPressed['d']) velocity.x += speed * delta;
        if (keysPressed[' ']) velocity.y += altitudeSpeed * delta;
        if (keysPressed['control']) velocity.y -= altitudeSpeed * delta;
        controls.moveRight(velocity.x);
        controls.moveForward(velocity.z);
        camera.position.y = Math.max(0.5, camera.position.y + velocity.y);
    }
    return { controls, update };
}
// cameraControls.js end

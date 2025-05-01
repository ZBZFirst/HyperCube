import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export function setupTraditionalControls(camera, renderer) {
    const controls = new PointerLockControls(camera, renderer.domElement);
    const velocity = new THREE.Vector3();
    const speed = 5;
    const altitudeSpeed = 3;
    
    // Keyboard controls
    const keysPressed = {};
    
    document.addEventListener('keydown', (e) => {
        keysPressed[e.key.toLowerCase()] = true;
        if (e.key === ' ' || e.key === 'Control') e.preventDefault();
    });
    
    document.addEventListener('keyup', (e) => {
        keysPressed[e.key.toLowerCase()] = false;
    });

    // Lock controls on click
    renderer.domElement.addEventListener('click', () => {
        if (controls.isLocked) return;
        controls.lock().catch(e => {
            console.log("Pointer lock failed:", e);
        });
    });

    function update(delta) {
        const forward = (keysPressed['w'] ? -1 : 0) + (keysPressed['s'] ? 1 : 0);
        const right = (keysPressed['d'] ? 1 : 0) + (keysPressed['a'] ? -1 : 0);
        const up = (keysPressed[' '] ? 1 : 0) + (keysPressed['control'] ? -1 : 0);
        
        velocity.set(
            right * speed * delta,
            up * altitudeSpeed * delta,
            forward * speed * delta
        );
        
        controls.moveRight(velocity.x);
        controls.moveForward(velocity.z);
        camera.position.y = Math.max(0.5, camera.position.y + velocity.y);
    }
    
    return { controls, update };
}

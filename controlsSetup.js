// controlsSetup.js
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export function setupControls(camera, renderer) {
    try {
        const controls = new PointerLockControls(camera, renderer.domElement);
        
        const keysPressed = {};
        
        document.addEventListener('keydown', (e) => {
            keysPressed[e.key.toLowerCase()] = true;
            if (e.key === ' ' || e.key === 'Control') e.preventDefault();
        });
        
        document.addEventListener('keyup', (e) => {
            keysPressed[e.key.toLowerCase()] = false;
        });

        const updateControls = (delta) => {
            if (!controls.isLocked) return;
            
            const velocity = new THREE.Vector3();
            const speed = 5;
            const altitudeSpeed = 3;

            if (keysPressed['w']) velocity.z -= speed * delta;
            if (keysPressed['s']) velocity.z += speed * delta;
            if (keysPressed['a']) velocity.x -= speed * delta;
            if (keysPressed['d']) velocity.x += speed * delta;
            if (keysPressed['shift']) velocity.y += altitudeSpeed * delta;
            if (keysPressed['control']) velocity.y -= altitudeSpeed * delta;

            controls.moveRight(velocity.x);
            controls.moveForward(velocity.z);
            camera.position.y += velocity.y;
        };

        return { controls, updateControls };
    } catch (error) {
        console.error("Controls initialization failed:", error);
        return { 
            controls: null, 
            updateControls: () => {} 
        };
    }
}

export function setupPointerLock(controls, renderer) {
    document.addEventListener('click', (event) => {
        const uiElement = document.getElementById('data-container');
        if (!uiElement.contains(event.target) && controls) {
            const promise = controls.lock();
            if (promise && promise.catch) {
                promise.catch(e => console.log("Pointer lock error:", e));
            }
        }
    });
}

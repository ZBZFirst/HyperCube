// controlsSetup.js start
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export function setupControls(camera, renderer) {
    try {
        const controls = new PointerLockControls(camera, renderer.domElement);
        
        const keysPressed = {};
        const movementSpeed = 5;
        const altitudeSpeed = 3;
        
        // Add event listeners for pointer lock state changes
        controls.addEventListener('lock', () => {
            console.log('Pointer lock acquired');
            document.getElementById('pointer-lock-hint').style.display = 'none';
        });
        
        controls.addEventListener('unlock', () => {
            console.log('Pointer lock released');
            document.getElementById('pointer-lock-hint').style.display = 'block';
        });

        // Keyboard controls
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

            if (keysPressed['w']) velocity.z -= movementSpeed * delta;
            if (keysPressed['s']) velocity.z += movementSpeed * delta;
            if (keysPressed['a']) velocity.x -= movementSpeed * delta;
            if (keysPressed['d']) velocity.x += movementSpeed * delta;
            if (keysPressed['shift']) velocity.y += altitudeSpeed * delta;
            if (keysPressed['control']) velocity.y -= altitudeSpeed * delta;

            controls.moveRight(velocity.x);
            controls.moveForward(velocity.z);
            camera.position.y += velocity.y;
        };

        // Setup click handler for the renderer
        renderer.domElement.addEventListener('click', () => {
            if (!controls.isLocked) {
                controls.lock().catch(e => {
                    console.log("Pointer lock failed:", e);
                });
            }
        });

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

// controlsSetup.js end

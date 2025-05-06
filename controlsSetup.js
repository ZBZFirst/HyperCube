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
            const hint = document.getElementById('pointer-lock-hint');
            if (hint) hint.style.display = 'none';
        });
        
        controls.addEventListener('unlock', () => {
            console.log('Pointer lock released');
            const hint = document.getElementById('pointer-lock-hint');
            if (hint) hint.style.display = 'block';
        });

        // Keyboard controls
        const onKeyDown = (e) => {
            keysPressed[e.key.toLowerCase()] = true;
            // Prevent spacebar from scrolling page
            if (e.key === ' ') e.preventDefault();
        };
        
        const onKeyUp = (e) => {
            keysPressed[e.key.toLowerCase()] = false;
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        const updateControls = (delta) => {
            if (!controls.isLocked) return;
            
            const velocity = new THREE.Vector3();

            if (keysPressed['w']) velocity.z -= movementSpeed * delta;
            if (keysPressed['s']) velocity.z += movementSpeed * delta;
            if (keysPressed['a']) velocity.x -= movementSpeed * delta;
            if (keysPressed['d']) velocity.x += movementSpeed * delta;
            if (keysPressed['shift']) velocity.y += altitudeSpeed * delta;
            if (keysPressed['control'] || keysPressed['ctrl']) velocity.y -= altitudeSpeed * delta;

            controls.moveRight(velocity.x);
            controls.moveForward(velocity.z);
            camera.position.y += velocity.y;
        };

        // Setup click handler for the renderer
        renderer.domElement.addEventListener('click', () => {
            if (!controls.isLocked) {
                // Show the hint first
                const hint = document.getElementById('pointer-lock-hint');
                if (hint) hint.style.display = 'block';
                
                // Request pointer lock
                renderer.domElement.requestPointerLock = renderer.domElement.requestPointerLock || 
                    renderer.domElement.mozRequestPointerLock || 
                    renderer.domElement.webkitRequestPointerLock;
                
                renderer.domElement.requestPointerLock();
            }
        });

        // Cleanup function
        const dispose = () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
            controls.dispose();
        };

        return { 
            controls, 
            updateControls,
            dispose 
        };
    } catch (error) {
        console.error("Controls initialization failed:", error);
        return { 
            controls: null, 
            updateControls: () => {},
            dispose: () => {} 
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

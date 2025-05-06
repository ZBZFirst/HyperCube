// controlsSetup.js start
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export function setupControls(camera, renderer) {
    try {
        const controls = new PointerLockControls(camera, renderer.domElement);
        
        const keysPressed = {};
        const movementSpeed = 5;
        const altitudeSpeed = 3;

        // Keyboard control handlers
        const onKeyDown = (e) => {
            // Only handle keys when pointer lock is active
            if (controls.isLocked) {
                // Check if we're in an input field
                const activeElement = document.activeElement;
                const isInputField = activeElement && 
                    (activeElement.tagName === 'INPUT' || 
                     activeElement.tagName === 'TEXTAREA');
                
                // Only prevent default for navigation keys when not in input field
                if (!isInputField && [' ', 'w', 'a', 's', 'd', 'shift', 'control', 'ctrl'].includes(e.key.toLowerCase())) {
                    e.preventDefault();
                }
            }
            keysPressed[e.key.toLowerCase()] = true;
        };
        
        const onKeyUp = (e) => {
            keysPressed[e.key.toLowerCase()] = false;
        };

        // Add event listeners
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

        // Pointer lock activation
        renderer.domElement.addEventListener('click', () => {
            if (!controls.isLocked) {
                renderer.domElement.requestPointerLock = 
                    renderer.domElement.requestPointerLock || 
                    renderer.domElement.mozRequestPointerLock || 
                    renderer.domElement.webkitRequestPointerLock;
                renderer.domElement.requestPointerLock();
            }
        });

        return { 
            controls, 
            updateControls,
            dispose: () => {
                document.removeEventListener('keydown', onKeyDown);
                document.removeEventListener('keyup', onKeyUp);
                controls.dispose();
            }
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

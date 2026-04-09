// controlsSetup.js start
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { setupTraditionalControls } from './traditionalControls.js';


export function setupControls(camera, renderer, scene, onSelectCallback) {
    try {
        const { controls, update, dispose } = setupTraditionalControls(camera, renderer, scene, onSelectCallback);
        return { 
            controls,
            updateControls: update,  // Map 'update' to 'updateControls'
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
    const hintElement = document.getElementById('pointer-lock-hint');
    
    const onPointerLockChange = () => {
        const isLocked = document.pointerLockElement === renderer.domElement;
        if (hintElement) {
            hintElement.style.display = isLocked ? 'none' : 'block';
        }
    };

    document.addEventListener('click', (event) => {
        const uiElement = document.getElementById('data-container');
        if (!uiElement.contains(event.target) && controls) {
            const promise = controls.lock();
            if (promise && promise.catch) {
                promise.catch(e => console.log("Pointer lock error:", e));
            }
        }
    });

    // Add pointer lock change listeners
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mozpointerlockchange', onPointerLockChange);
    document.addEventListener('webkitpointerlockchange', onPointerLockChange);

    // Initial setup
    onPointerLockChange();
}

// controlsSetup.js end

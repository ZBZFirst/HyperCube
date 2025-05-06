// controlsSetup.js start
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { setupTraditionalControls } from './traditionalControls.js';

export function setupControls(camera, renderer, scene, onSelectCallback) {
    try {
        return setupTraditionalControls(camera, renderer, scene, onSelectCallback);
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

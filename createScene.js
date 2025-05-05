// createScene.js start
import { setupScene } from './sceneSetup.js';
import { setupCamera } from './cameraSetup.js';
import { setupRenderer } from './rendererSetup.js';
import { setupControls, setupPointerLock } from './controlsSetup.js';

export function createScene() {
    const container = document.getElementById('graphics-container');
    if (!container) {
        console.error('Graphics container not found!');
        return null;
    }

    const canvas = container.querySelector('canvas');
    if (!canvas) {
        console.error('Canvas element not found in graphics container!');
        return null;
    }

    // Setup components using helper functions
    const scene = setupScene();
    const camera = setupCamera(container);
    const renderer = setupRenderer(container);
    const { controls, updateControls } = setupControls(camera, renderer);
    
    if (controls) {
        setupPointerLock(controls, renderer);
    }

    return { 
        scene,
        camera,
        renderer,
        controls,
        updateControls,
    };
}

// createScene.js end

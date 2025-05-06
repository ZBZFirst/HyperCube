// createScene.js start
import * as THREE from 'three';
import { setupScene } from './sceneSetup.js';
import { setupCamera } from './cameraSetup.js';
import { setupRenderer } from './rendererSetup.js';
import { setupControls, setupPointerLock } from './controlsSetup.js';

export function createScene() {
    try {
        const container = document.getElementById('graphics-container');
        if (!container) {
            throw new Error('Graphics container not found!');
        }

        // Setup core Three.js components
        const scene = setupScene();
        const camera = setupCamera(container);
        const renderer = setupRenderer(container);
        
        // Make canvas focusable and set tabindex
        const canvas = renderer.domElement;
        canvas.tabIndex = 1;
        canvas.style.outline = 'none';
        
        const { controls, updateControls, dispose } = setupControls(camera, renderer);

        return {
            scene,
            camera,
            renderer,
            controls,
            updateControls,
            dispose
        };
    } catch (error) {
        console.error('Scene creation failed:', error);
        return null;
    }
}

// createScene.js end
